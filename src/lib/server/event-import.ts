import "server-only";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { classifyKind, dedupeSeries, nextOccurrence, parseIcs, relevance, sameEvent, tagEvent, type IcsEvent } from "../ics";
import { SUGGESTED_FEEDS } from "../constants";
import { genericZones, VENUES, type VenueKey } from "../seed";
import type { ConnectedEvent, FeedStatus, Profile } from "../types";
import { ApiError } from "./services";
import { getDb, mutate } from "./store";

// Pull real events from public calendar feeds (.ics / webcal) that organizers publish —
// university calendars, Meetup / Luma / Google Calendar exports, club calendars.
// No scraping: iCalendar is the format these sites publish for exactly this purpose.

const MAX_BYTES = 2_000_000;
const MAX_EVENTS = 40;
const WINDOW_DAYS = 120;
const PER_HOUR = 20;
const recent = new Map<string, number[]>();

// ---------- Safe fetch (SSRF guard) ----------

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw.trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    throw new ApiError(400, "That isn't a valid link.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new ApiError(400, "Use an https:// or webcal:// calendar link.");
  if (u.username || u.password) throw new ApiError(400, "Links with embedded credentials aren't allowed.");
  if (u.port && u.port !== "443" && u.port !== "80") throw new ApiError(400, "Only standard web ports are allowed.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new ApiError(400, "That host isn't reachable from here.");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ApiError(400, "Couldn't find that website.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ApiError(400, "That host isn't reachable from here.");
  return u;
}

async function fetchCalendar(raw: string): Promise<string> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/calendar, text/plain;q=0.8, */*;q=0.1", "User-Agent": "Connected-CrownHacks/1.0 (calendar import)" },
      // Campus calendars are ~1 MB and sometimes slow; the timeout covers the whole download.
      signal: AbortSignal.timeout(25_000),
    }).catch((e: Error) => {
      throw new ApiError(502, `That calendar didn't respond (${e.name === "TimeoutError" ? "timed out" : "network error"}). Try again.`);
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = await assertPublicUrl(new URL(loc, url).toString());
      continue;
    }
    if (!res.ok) throw new ApiError(502, `The calendar returned ${res.status}.`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) throw new ApiError(413, "That calendar is too big (2 MB max).");
    const reader = res.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read().catch(() => {
        throw new ApiError(502, "The calendar download was interrupted (slow server). Try again.");
      });
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "That calendar is too big (2 MB max).");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new ApiError(502, "Too many redirects.");
}

// ---------- Venue matching ----------

const VENUE_ALIASES: [VenueKey, RegExp][] = [
  ["mceniry", /mceniry/i],
  ["union", /popp martin|student union|\bunion\b.*(unc|charlotte)|uncc union/i],
  ["woodward", /woodward/i],
  ["atkins", /atkins/i],
  ["storrs", /storrs/i],
  ["cone", /\bcone\b/i],
  ["duke", /duke centennial/i],
  ["epic", /\bepic\b/i],
  ["portal", /\bportal\b/i],
  ["campnorthend", /camp north end/i],
  ["optimist", /optimist hall/i],
  ["jcsu", /johnson c\.? smith|\bjcsu\b/i],
  ["queens", /queens univ/i],
  ["davidson", /davidson/i],
  ["southpark", /southpark/i],
  ["ballantyne", /ballantyne/i],
  ["noda", /\bnoda\b/i],
  ["athertonmill", /atherton|south end/i],
  ["bearden", /bearden/i],
  ["plaza", /plaza midwood/i],
  ["cpcc", /\bcpcc\b|central piedmont/i],
  ["convention", /convention center/i],
  ["packard", /packard place/i],
  ["imaginon", /imaginon/i],
  ["discovery", /discovery place/i],
];

const UPTOWN = { lat: 35.2271, lng: -80.8431 };

interface PlaceHints {
  /** Average position of the feed's geotagged events — a good guess for its untagged ones (e.g. a campus). */
  centroid?: { lat: number; lng: number };
  campus?: boolean;
}

function placeFor(ev: IcsEvent, hints: PlaceHints): { geo?: ConnectedEvent["geo"]; venue: string; area: string; approximate: boolean } {
  const loc = ev.location;
  const label = loc.split(",")[0]?.trim() || "See event page";
  if (ev.categories.some((c) => /^(virtual|online)$/i.test(c)) || /^(zoom|online|virtual)\b/i.test(loc)) return { venue: "Online", area: "Online", approximate: false };
  if (ev.geo) return { geo: { ...ev.geo, radiusM: 300, label }, venue: loc || label, area: hints.campus ? "UNC Charlotte main campus" : loc.split(",").slice(-2, -1)[0]?.trim() || "Charlotte area", approximate: false };
  const hit = VENUE_ALIASES.find(([, re]) => re.test(loc));
  if (hit) {
    const [lat, lng, name] = VENUES[hit[0]];
    const campus = ["mceniry", "union", "woodward", "atkins", "storrs", "cone", "duke", "epic", "portal"].includes(hit[0]);
    return { geo: { lat, lng, radiusM: 400, label: name }, venue: loc || name, area: campus ? "UNC Charlotte main campus" : name, approximate: false };
  }
  if (/unc ?charlotte|\buncc\b|university city/i.test(loc)) {
    const [lat, lng] = VENUES.union;
    return { geo: { lat, lng, radiusM: 900, label: "UNC Charlotte" }, venue: loc, area: "UNC Charlotte main campus", approximate: true };
  }
  if (/charlotte/i.test(loc)) return { geo: { ...UPTOWN, radiusM: 1500, label: "Charlotte" }, venue: loc, area: "Charlotte", approximate: true };
  if (!loc && /zoom\.us|teams\.microsoft|meet\.google|webinar|virtual/i.test(ev.description)) return { venue: "Online", area: "Online", approximate: false };
  if (loc && (hints.centroid || hints.campus)) {
    // A room on a campus feed ("SMITH 217"): pin it to the campus, flagged as approximate.
    const c = hints.centroid ?? { lat: VENUES.union[0], lng: VENUES.union[1] };
    return { geo: { ...c, radiusM: 900, label: hints.campus ? "UNC Charlotte" : loc }, venue: loc, area: hints.campus ? "UNC Charlotte main campus" : "Nearby", approximate: true };
  }
  return { venue: loc || "See event page", area: loc ? loc.split(",").slice(-2).join(",").trim() : "Location TBA", approximate: true };
}

function centroidOf(events: IcsEvent[]): { lat: number; lng: number } | undefined {
  const pts = events.flatMap((e) => (e.geo ? [e.geo] : []));
  if (pts.length < 3) return undefined;
  const lat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const lng = pts.reduce((a, p) => a + p.lng, 0) / pts.length;
  // Only trust it when the points are tight (a campus or neighborhood, < ~3 km spread).
  const spread = Math.max(...pts.map((p) => Math.hypot((p.lat - lat) * 111_000, (p.lng - lng) * 91_000)));
  return spread < 3000 ? { lat, lng } : undefined;
}

// ---------- Import ----------

export interface ImportSummary {
  calendar: string;
  added: number;
  updated: number;
  skipped: { past: number; cancelled: number; far: number; overLimit: number; offTopic: number; duplicate: number };
  scanned: number;
  events: { id: string; title: string; kind: ConnectedEvent["kind"]; start: string; venue: string; onMap: boolean }[];
}

function rateLimit(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= PER_HOUR) throw new ApiError(429, "You've imported a lot this hour — try again later.");
  list.push(now);
  recent.set(userId, list);
}

export async function importCalendar(me: Profile, input: { url?: string; ics?: string }, now = new Date()): Promise<ImportSummary> {
  if (!input.url && !input.ics) throw new ApiError(400, "Paste a calendar link or upload an .ics file.");
  rateLimit(me.id);
  const result = await importFromSource(input, me.id, now);
  if (input.url) recordFeed(SUGGESTED_FEEDS.find((f) => input.url!.replace(/^webcals?:\/\//i, "https://") === f.url)?.url, result, now);
  return result;
}

// ---------- Background sync of the public campus feeds ----------
// So the app always shows real, current UNC Charlotte events without anyone pressing Import.
// Runs off the request path (fire-and-forget), at most every 6 hours per feed, retries failures after 30 min.

const SYNC_EVERY_MS = 6 * 3_600_000;
const RETRY_MS = 30 * 60_000;
const gs = globalThis as unknown as { __feedSync?: Promise<void> | null };

function recordFeed(url: string | undefined, result: ImportSummary | Error, now: Date) {
  if (!url) return;
  const status: FeedStatus =
    result instanceof Error
      ? { url, ok: false, attemptedAt: now.toISOString(), error: result.message.slice(0, 200) }
      : { url, ok: true, attemptedAt: now.toISOString(), syncedAt: now.toISOString(), count: result.events.length, scanned: result.scanned };
  mutate((db) => {
    const prev = db.feeds?.find((f) => f.url === url);
    // A failed retry keeps the last good sync time so the UI can still say "synced 3h ago".
    db.feeds = [...(db.feeds ?? []).filter((f) => f.url !== url), status.ok ? status : { ...status, syncedAt: prev?.syncedAt, count: prev?.count }];
  });
}

export function feedStatus(): (FeedStatus & { name: string })[] {
  const db = getDb();
  return SUGGESTED_FEEDS.flatMap((f) => {
    const s = db.feeds?.find((x) => x.url === f.url);
    return s ? [{ ...s, name: f.name }] : [];
  });
}

export function kickFeedSync(now = new Date()): void {
  if (process.env.FEED_SYNC === "off" || gs.__feedSync) return;
  const db = getDb();
  const due = SUGGESTED_FEEDS.filter((f) => {
    const s = db.feeds?.find((x) => x.url === f.url);
    return !s || now.getTime() - Date.parse(s.attemptedAt) > (s.ok ? SYNC_EVERY_MS : RETRY_MS);
  });
  if (!due.length) return;
  gs.__feedSync = (async () => {
    for (const f of due) {
      try {
        recordFeed(f.url, await importFromSource({ url: f.url }, "system", new Date()), new Date());
      } catch (e) {
        recordFeed(f.url, e as Error, new Date());
      }
    }
  })().finally(() => {
    gs.__feedSync = null;
  });
}

async function importFromSource(input: { url?: string; ics?: string }, importedBy: string, now: Date): Promise<ImportSummary> {
  const text = input.ics ?? (await fetchCalendar(input.url!));
  if (text.length > MAX_BYTES) throw new ApiError(413, "That calendar is too big (2 MB max).");
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new ApiError(400, "That doesn't look like a calendar (.ics) file. Look for “Subscribe”, “Export” or “iCal” on the events page.");
  const cal = parseIcs(text);
  const feed = input.url ? new URL(input.url.replace(/^webcals?:\/\//i, "https://")).toString() : `upload:${crypto.createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
  const feedKey = crypto.createHash("sha1").update(feed).digest("hex").slice(0, 8);
  const host = SUGGESTED_FEEDS.find((f) => f.url === feed)?.name ?? (cal.name || (input.url ? new URL(feed).hostname.replace(/^www\./, "") : "Imported calendar"));

  const skipped = { past: 0, cancelled: 0, far: 0, overLimit: 0, offTopic: 0, duplicate: 0 };
  const horizon = now.getTime() + WINDOW_DAYS * 86_400_000;
  const upcoming: IcsEvent[] = [];
  const hints: PlaceHints = {
    centroid: centroidOf(cal.events),
    campus: /(^|\.)charlotte\.edu$/i.test(input.url ? new URL(feed).hostname : "") || /unc charlotte|uncc|niner/i.test(cal.name ?? ""),
  };
  for (const raw of cal.events) {
    if (raw.cancelled) {
      skipped.cancelled++;
      continue;
    }
    const ev = nextOccurrence(raw, now);
    if (!ev) {
      skipped.past++;
      continue;
    }
    if (ev.start.getTime() > horizon) {
      skipped.far++;
      continue;
    }
    upcoming.push(ev);
  }
  upcoming.sort((a, b) => a.start.getTime() - b.start.getTime());
  // Small feeds (a club's own calendar) come in whole. Big ones (a whole campus) are filtered to
  // networking-worthy events, repeats of a series collapse to the next one, and in-person events
  // (which can go on the map) get a small boost.
  const big = upcoming.length > MAX_EVENTS;
  const series = big ? dedupeSeries(upcoming) : upcoming;
  const scored = series.map((ev) => ({ ev, rel: relevance(ev) + (placeFor(ev, hints).geo ? 0.75 : 0) }));
  const kept = big ? scored.filter((s) => s.rel >= 2) : scored;
  skipped.offTopic = upcoming.length - kept.length;
  kept.sort((a, b) => b.rel - a.rel || a.ev.start.getTime() - b.ev.start.getTime());
  skipped.overLimit = Math.max(0, kept.length - MAX_EVENTS);
  const chosen = kept
    .slice(0, MAX_EVENTS)
    .map((s) => s.ev)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!chosen.length) throw new ApiError(422, cal.events.length ? "No upcoming networking events in that calendar (next 4 months)." : "That calendar has no events.");

  return mutate((db) => {
    let added = 0;
    let updated = 0;
    const out: ImportSummary["events"] = [];
    for (const ev of chosen) {
      const id = `ev_ics_${feedKey}_${crypto.createHash("sha1").update(ev.uid).digest("hex").slice(0, 8)}`;
      // Already listed — seeded (e.g. CrownHacks itself) or imported from another feed.
      const here = { title: ev.title, start: ev.start };
      const dup =
        db.events.some((e) => e.id !== id && e.source?.feed !== feed && sameEvent(e, here)) ||
        out.some((o) => sameEvent(o, here));
      if (dup) {
        skipped.duplicate++;
        continue;
      }
      const kind = classifyKind(ev.title, ev.description, ev.categories);
      const place = placeFor(ev, hints);
      const record: ConnectedEvent = {
        id,
        title: ev.title,
        host: ev.hosts ? `${ev.hosts} · ${host}` : host,
        kind,
        description: (ev.description || `${ev.title} — imported from ${host}.`).replace(/\n*Additional Information can be found at:.*$/s, "").trim(),
        start: ev.start.toISOString(),
        end: ev.end.toISOString(),
        venue: place.venue,
        area: place.area,
        tags: tagEvent(ev.title, ev.description, kind, ev.categories),
        zones: genericZones(`zi${id.slice(-6)}`),
        geo: place.geo,
        isSample: false,
        link: ev.url,
        source: { kind: "ics", feed, uid: ev.uid, importedBy, importedAt: now.toISOString(), approximate: place.approximate || undefined },
      };
      const idx = db.events.findIndex((e) => e.id === id);
      if (idx >= 0) {
        db.events[idx] = { ...record, zones: db.events[idx].zones };
        updated++;
      } else {
        db.events.push(record);
        added++;
      }
      out.push({ id, title: record.title, kind, start: record.start, venue: record.venue, onMap: Boolean(record.geo) });
    }
    // Re-importing a feed replaces its earlier picks (kept if someone already joined).
    const keep = new Set(out.map((e) => e.id));
    const joined = new Set(db.memberships.map((m) => m.eventId));
    db.events = db.events.filter((e) => e.source?.feed !== feed || keep.has(e.id) || joined.has(e.id));
    return { calendar: host, added, updated, skipped, scanned: cal.events.length, events: out };
  });
}

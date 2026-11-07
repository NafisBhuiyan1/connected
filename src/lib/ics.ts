// Minimal, dependency-free iCalendar (RFC 5545) reader for importing public event calendars.
// Handles line folding, escaping, UTC / TZID / floating / all-day times, DURATION, GEO, STATUS
// and simple recurrence (DAILY / WEEKLY / MONTHLY with INTERVAL, COUNT, UNTIL → next occurrence).

import type { ConnectedEvent } from "./types";
import { extractInterests } from "./ontology";

export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  url?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  geo?: { lat: number; lng: number };
  cancelled: boolean;
  rrule?: string;
  categories: string[];
  /** Organizer / hosting club (X-HOSTS or ORGANIZER CN). */
  hosts?: string;
}

export interface IcsCalendar {
  name?: string;
  timezone?: string;
  events: IcsEvent[];
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

const DEFAULT_TZ = "America/New_York"; // Charlotte

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line: string): Prop | null {
  // NAME;PARAM=VALUE;PARAM="quoted:value":VALUE — split at the first colon outside quotes.
  let inQ = false;
  let cut = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ":" && !inQ) {
      cut = i;
      break;
    }
  }
  if (cut < 0) return null;
  const head = line.slice(0, cut).split(";");
  const params: Record<string, string> = {};
  for (const p of head.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: head[0].toUpperCase(), params, value: line.slice(cut + 1) };
}

export function unescapeText(v: string): string {
  return v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Offset (ms) of `tz` from UTC at instant `t`. */
function tzOffset(t: number, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - t;
}

function validTz(tz: string | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Wall-clock time in `tz` → UTC Date. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz); // second pass settles DST edges
  return new Date(t);
}

export function parseIcsDate(p: Prop, calTz?: string): { date: Date; allDay: boolean } | null {
  const v = p.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || p.params.VALUE === "DATE") {
    // All-day: treat as 9 AM local so it sorts sensibly and shows on the right day.
    return { date: zonedToUtc(+y, +mo, +d, 9, 0, 0, validTz(calTz)), allDay: true };
  }
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))), allDay: false };
  return { date: zonedToUtc(+y, +mo, +d, +h, +mi, +(s ?? 0), validTz(p.params.TZID ?? calTz)), allDay: false };
}

/** ISO 8601 duration (P1DT2H30M, PT90M, P1W) → ms. */
export function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const [, sign, w, d, h, mi, s] = m;
  const ms = (((+(w ?? 0) * 7 + +(d ?? 0)) * 24 + +(h ?? 0)) * 60 + +(mi ?? 0)) * 60_000 + +(s ?? 0) * 1000;
  return sign === "-" ? -ms : ms;
}

export function parseIcs(text: string): IcsCalendar {
  const lines = unfold(text);
  const cal: IcsCalendar = { events: [] };
  let cur: Prop[] | null = null;
  let depth = 0; // nested components inside VEVENT (VALARM) are ignored
  for (const line of lines) {
    if (!line) continue;
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === "BEGIN") {
      if (p.value.toUpperCase() === "VEVENT" && !cur) {
        cur = [];
        depth = 0;
      } else if (cur) depth++;
      continue;
    }
    if (p.name === "END") {
      if (cur && depth > 0) depth--;
      else if (cur && p.value.toUpperCase() === "VEVENT") {
        const ev = toEvent(cur, cal.timezone);
        if (ev) cal.events.push(ev);
        cur = null;
      }
      continue;
    }
    if (cur) {
      if (depth === 0) cur.push(p);
    } else if (p.name === "X-WR-CALNAME") cal.name = unescapeText(p.value).trim();
    else if (p.name === "X-WR-TIMEZONE") cal.timezone = p.value.trim();
  }
  return cal;
}

function toEvent(props: Prop[], calTz?: string): IcsEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const dtstart = get("DTSTART");
  if (!dtstart) return null;
  const s = parseIcsDate(dtstart, calTz);
  if (!s) return null;
  let end: Date | null = null;
  const dtend = get("DTEND");
  if (dtend) end = parseIcsDate(dtend, calTz)?.date ?? null;
  if (!end) {
    const dur = get("DURATION");
    const ms = dur ? parseDuration(dur.value) : null;
    if (ms && ms > 0) end = new Date(s.date.getTime() + ms);
  }
  if (s.allDay) {
    // DTEND for all-day events is exclusive (next day). Show as a 9–5 block on the last day.
    const lastDay = end ? new Date(end.getTime() - 86_400_000) : s.date;
    end = new Date(Math.max(s.date.getTime(), lastDay.getTime()) + 8 * 3_600_000);
  }
  if (!end || end <= s.date) end = new Date(s.date.getTime() + 2 * 3_600_000);
  const geoRaw = get("GEO")?.value.split(/[;,]/).map(Number);
  const geo = geoRaw && geoRaw.length === 2 && geoRaw.every(Number.isFinite) && Math.abs(geoRaw[0]) <= 90 && Math.abs(geoRaw[1]) <= 180 ? { lat: geoRaw[0], lng: geoRaw[1] } : undefined;
  const title = stripHtml(unescapeText(get("SUMMARY")?.value ?? "")).replace(/\s+/g, " ").trim();
  if (!title) return null;
  const url = get("URL")?.value.trim();
  const categories = props
    .filter((p) => p.name === "CATEGORIES")
    .flatMap((p) => p.value.split(/(?<!\\),/))
    .map((c) => unescapeText(c).trim())
    .filter(Boolean)
    .slice(0, 12);
  const organizer = get("ORGANIZER")?.params.CN;
  const hosts = (get("X-HOSTS") ? unescapeText(get("X-HOSTS")!.value) : organizer)?.trim().slice(0, 80) || undefined;
  return {
    uid: (get("UID")?.value.trim() || `${title}@${s.date.toISOString()}`).slice(0, 200),
    title: title.slice(0, 120),
    description: stripHtml(unescapeText(get("DESCRIPTION")?.value ?? "")).slice(0, 600),
    location: stripHtml(unescapeText(get("LOCATION")?.value ?? "")).replace(/\s+/g, " ").trim().slice(0, 160),
    url: url && /^https?:\/\//i.test(url) ? url : undefined,
    start: s.date,
    end,
    allDay: s.allDay,
    geo,
    cancelled: (get("STATUS")?.value ?? "").toUpperCase() === "CANCELLED",
    rrule: get("RRULE")?.value,
    categories,
    hosts,
  };
}

/** If the event recurs, move it to its next occurrence that hasn't ended yet. Returns null if the series is over. */
export function nextOccurrence(ev: IcsEvent, now: Date): IcsEvent | null {
  if (ev.end >= now || !ev.rrule) return ev.end >= now ? ev : null;
  const r = Object.fromEntries(ev.rrule.split(";").map((kv) => kv.split("=") as [string, string]).map(([k, v]) => [k.toUpperCase(), v]));
  const step = { DAILY: 86_400_000, WEEKLY: 7 * 86_400_000 }[r.FREQ as "DAILY" | "WEEKLY"];
  const interval = Math.max(1, Number(r.INTERVAL ?? 1) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? parseIcsDate({ name: "UNTIL", params: {}, value: r.UNTIL })?.date : undefined;
  const len = ev.end.getTime() - ev.start.getTime();
  if (step) {
    const stride = step * interval;
    const k = Math.ceil((now.getTime() - ev.end.getTime()) / stride);
    if (k >= count) return null;
    const start = new Date(ev.start.getTime() + k * stride);
    if (until && start > until) return null;
    return { ...ev, start, end: new Date(start.getTime() + len) };
  }
  if (r.FREQ === "MONTHLY") {
    for (let k = 1; k < Math.min(count, 120); k++) {
      const start = new Date(ev.start);
      start.setUTCMonth(start.getUTCMonth() + k * interval);
      if (until && start > until) return null;
      if (start.getTime() + len >= now.getTime()) return { ...ev, start, end: new Date(start.getTime() + len) };
    }
  }
  return null;
}

// ---------- Mapping into Connected events ----------

const KIND_RULES: [ConnectedEvent["kind"], RegExp][] = [
  ["hackathon", /(\b|[a-z])hacks?\b|\b(hackathons?|hack[\s-]?(night|day|fest)|game\s?jam|buildathon|codefest|datathon|ideathon|ctf)\b/i],
  ["career-fair", /\b(careers?|job fair|stem fair|recruit\w*|hiring|internships?|employers?)\b/i],
  ["pitch", /\b(pitch\w*|demo day|shark tank|startup (competition|showcase)|investors?|venture)\b/i],
  ["conference", /\b(conference|summit|symposium|devfest|expo|convention)\b/i],
  ["seminar", /\b(info(rmation)? sessions?|open house|lunch (&|and) learn|webinar|seminar|lectures?|colloquium|talks?|panel|speaker|keynote|fireside|defense|presentations?)\b/i],
  ["workshop", /\b(workshops?|bootcamp|hands-on|tutorial|training|masterclass|clinic|office hours|study jam|competition)\b/i],
  ["meetup", /\b(meetup|meet-up|mixer|social|networking|happy hour|coffee|club meeting|general body)\b/i],
];

export function classifyKind(title: string, description: string, categories: string[] = []): ConnectedEvent["kind"] {
  return matchKind(title, description, categories) ?? "meetup";
}

function matchKind(title: string, description: string, categories: string[]): ConnectedEvent["kind"] | null {
  const cats = categories.join(" · ");
  for (const text of [title, cats, description]) for (const [kind, re] of KIND_RULES) if (re.test(text)) return kind;
  return null;
}

// Things that fill campus calendars but aren't networking opportunities.
const NOISE =
  /\b(study session|peer[- ]led|tutoring|supplemental instruction|si session|review session|exam|final exams?|away game|home game|vs\.?\s|game day|tailgate|practice|tryouts?|worship|bible|prayer|mass|blood drive|deadline|no classes|holiday|closed|registration (opens|closes)|bake sale|movie night|yoga|intramural|vaccine|flu shot|mindful(ness)?|meditation|wellness|counseling|coping|cope|adhd|mental health|bystander|self-care|gratitude|hike|hiking|cave|camping|kayak\w*)\b/i;
const NOISE_CATEGORIES = /(athletic|recreation|religio|spiritual|sport|intramural|fitness|wellness|outdoor|counseling)/i;
// Staff/faculty development — real events, but not where students find teammates.
const STAFF = /\b(faculty (and|&) staff|for faculty|faculty development|instructional|course (media|design)|teaching with|ed\.?d\.?|postdoc)\b/i;

/**
 * How useful an event is for meeting collaborators: explicit event type (hackathon, career, pitch…)
 * plus topical overlap with the ontology, minus calendar noise. Negative = not a networking event.
 */
export function relevance(ev: Pick<IcsEvent, "title" | "description" | "categories">): number {
  if (NOISE.test(ev.title) || ev.categories.some((c) => NOISE_CATEGORIES.test(c))) return -1;
  const kind = matchKind(ev.title, ev.description, ev.categories);
  const kindPts = !kind ? 0 : kind === "meetup" ? 1 : kind === "seminar" ? 1.5 : 2.5;
  const topics = extractInterests(`${ev.title}\n${ev.categories.join(" ")}\n${ev.description}`).length;
  return kindPts + Math.min(3, topics) - (STAFF.test(ev.title) ? 2 : 0);
}

/** Title reduced to its distinctive core ("CrownHacks 2026" → "crownhacks"). */
export function titleCore(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b(fall|spring|summer|winter|annual|\d+(st|nd|rd|th))\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same real-world event listed twice (another feed, or the seeded listing)? */
export function sameEvent(a: { title: string; start: string | Date }, b: { title: string; start: string | Date }): boolean {
  const near = Math.abs(new Date(a.start).getTime() - new Date(b.start).getTime()) < 36 * 3_600_000;
  if (!near) return false;
  const ca = titleCore(a.title);
  const cb = titleCore(b.title);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const [short, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return short.length >= 6 && ` ${long} `.includes(` ${short} `);
}

/** Collapse repeats of a series ("Info Session" every week) to the next one. Input must be sorted by start. */
export function dedupeSeries<T extends { title: string }>(events: T[]): T[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = e.title.toLowerCase().replace(/\b(part|session|week|day)\s*\d+\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const KIND_DEFAULT_TAGS: Record<ConnectedEvent["kind"], string[]> = {
  hackathon: ["startups", "dev-tools"],
  "career-fair": ["careers"],
  pitch: ["startups", "entrepreneurship"],
  conference: ["research"],
  workshop: ["dev-tools"],
  seminar: ["research"],
  meetup: ["startups"],
};

export function tagEvent(title: string, description: string, kind: ConnectedEvent["kind"], categories: string[] = []): string[] {
  const tags = extractInterests(`${title}\n${categories.join(" ")}\n${description}`).slice(0, 6);
  return tags.length ? tags : KIND_DEFAULT_TAGS[kind];
}

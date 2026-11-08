/**
 * Real, live events with photos.
 *  - Meetup (public GraphQL search): networking and career events around Charlotte.
 *  - Devpost (public hackathon listing): hackathons in the Charlotte area plus open online ones.
 * Results are cached for 10 minutes. If both sources fail, the Events tab offers demo events instead.
 */
import { CHARLOTTE_CENTER } from '@/data/options';
import type { CommunityEvent, EventCategory } from '@/data/types';

const MEETUP = 'https://api.meetup.com/gql-ext';
const DEVPOST = 'https://devpost.com/api/hackathons';
const UA = { 'User-Agent': 'Connected-hackathon-app/1.0 (github.com/kartik215/connected)' };
const CACHE_MS = 10 * 60_000;

let cache: { at: number; events: CommunityEvent[]; errors: string[] } | null = null;
const byId = new Map<string, CommunityEvent>();
export const getLiveEvent = (id: string) => byId.get(id);

async function withTimeout(url: string, init: RequestInit, ms = 12_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const plain = (s: string, max = 420) =>
  s.replace(/<[^>]+>/g, ' ').replace(/[*_#>`[\]]/g, '').replace(/\(https?:[^)]+\)/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---- Meetup -----------------------------------------------------------------------------------

type MeetupNode = {
  id: string;
  title: string;
  dateTime: string;
  endTime?: string;
  eventUrl: string;
  eventType?: string;
  description?: string;
  featuredEventPhoto?: { highResUrl?: string; baseUrl?: string; id?: string } | null;
  venue?: { name?: string; address?: string; city?: string; state?: string; lat?: number; lon?: number } | null;
  group?: { name?: string } | null;
  feeSettings?: { amount?: number; currency?: string } | null;
};

const MEETUP_QUERY = `query($q: String!) { eventSearch(filter: {query: $q, lat: ${CHARLOTTE_CENTER.latitude}, lon: ${CHARLOTTE_CENTER.longitude}, radius: 30}, first: 15) {
  edges { node { id title dateTime endTime eventUrl eventType description
    featuredEventPhoto { id baseUrl highResUrl }
    venue { name address city state lat lon } group { name } feeSettings { amount currency } } } } }`;

async function meetup(q: string, category: EventCategory): Promise<CommunityEvent[]> {
  const res = await withTimeout(MEETUP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...UA },
    body: JSON.stringify({ query: MEETUP_QUERY, variables: { q } }),
  });
  if (!res.ok) throw new Error(`Meetup ${res.status}`);
  const json = (await res.json()) as { data?: { eventSearch?: { edges?: { node: MeetupNode }[] } } };
  return (json.data?.eventSearch?.edges ?? []).map(({ node: n }): CommunityEvent => {
    const online = n.eventType === 'ONLINE' || !n.venue?.lat;
    const start = Date.parse(n.dateTime);
    const fee = n.feeSettings?.amount;
    return {
      id: `mu-${n.id}`,
      title: n.title,
      category,
      host: n.group?.name ?? 'Meetup group',
      venue: online ? 'Online event' : [n.venue?.name, n.venue?.address].filter(Boolean).join(', '),
      areaName: online ? 'Online' : n.venue?.city ?? 'Charlotte',
      coord: online ? CHARLOTTE_CENTER : { latitude: n.venue!.lat!, longitude: n.venue!.lon! },
      start,
      end: n.endTime ? Date.parse(n.endTime) : start + 2 * 3_600_000,
      cost: fee ? `${n.feeSettings?.currency === 'USD' || !n.feeSettings?.currency ? '$' : `${n.feeSettings.currency} `}${fee}` : 'Free',
      description: plain(n.description ?? '') || `Hosted by ${n.group?.name ?? 'a Meetup group'}.`,
      isDemo: false,
      image: n.featuredEventPhoto?.highResUrl,
      url: n.eventUrl,
      source: 'Meetup',
      online,
    };
  });
}

// ---- Devpost ----------------------------------------------------------------------------------

type DevpostHack = {
  id: number;
  title: string;
  url: string;
  thumbnail_url?: string;
  submission_period_dates?: string;
  displayed_location?: { icon?: string; location?: string };
  organization_name?: string;
  prize_amount?: string;
  themes?: { name: string }[];
  registrations_count?: number;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Parses Devpost ranges like "Nov 06 - 08, 2026", "Oct 30 - Nov 08, 2026", "Dec 31, 2026 - Jan 02, 2027". */
export function parseDevpostDates(s?: string): { start: number; end: number } | null {
  if (!s) return null;
  const parts = s.split(' - ').map((p) => p.trim());
  if (parts.length !== 2) return null;
  const yearOf = (p: string) => p.match(/(\d{4})$/)?.[1];
  const endYear = Number(yearOf(parts[1]));
  const startYear = Number(yearOf(parts[0]) ?? endYear);
  const m1 = parts[0].match(/^([A-Za-z]{3})\s+(\d{1,2})/);
  const m2 = parts[1].match(/^(?:([A-Za-z]{3})\s+)?(\d{1,2})/);
  if (!m1 || !m2 || !endYear) return null;
  const mon1 = MONTHS.indexOf(m1[1].toLowerCase());
  const mon2 = m2[1] ? MONTHS.indexOf(m2[1].toLowerCase()) : mon1;
  if (mon1 < 0 || mon2 < 0) return null;
  const start = new Date(startYear, mon1, Number(m1[2]), 9).getTime();
  const end = new Date(endYear, mon2, Number(m2[2]), 18).getTime();
  return end >= start ? { start, end } : null;
}

const fixUrl = (u?: string) => (u ? (u.startsWith('//') ? `https:${u}` : u) : undefined);

function devpostToEvent(h: DevpostHack, coord: { latitude: number; longitude: number } | null): CommunityEvent | null {
  const dates = parseDevpostDates(h.submission_period_dates);
  if (!dates) return null;
  const online = h.displayed_location?.icon === 'globe' || /^online$/i.test(h.displayed_location?.location ?? '');
  const thumb = fixUrl(h.thumbnail_url);
  const prize = h.prize_amount ? plain(h.prize_amount, 40) : '';
  const themes = (h.themes ?? []).map((t) => t.name).slice(0, 3).join(', ');
  return {
    id: `dp-${h.id}`,
    title: h.title,
    category: 'hackathon',
    host: h.organization_name || 'Devpost',
    venue: online ? 'Online hackathon' : h.displayed_location?.location ?? 'See listing',
    areaName: online ? 'Online' : 'Charlotte area',
    coord: coord ?? CHARLOTTE_CENTER,
    start: dates.start,
    end: dates.end,
    cost: 'Free',
    description: [themes ? `Themes: ${themes}.` : '', prize && prize !== '0' ? `Prizes: ${prize}.` : '', h.registrations_count ? `${h.registrations_count} people registered.` : '']
      .filter(Boolean)
      .join(' ') || 'A hackathon listed on Devpost.',
    isDemo: false,
    // Devpost's generic placeholder isn't a real photo, so fall back to the category art.
    image: thumb && !thumb.includes('thumbnail-placeholder') ? thumb : undefined,
    url: h.url,
    source: 'Devpost',
    online,
  };
}

async function devpost(params: string): Promise<DevpostHack[]> {
  const res = await withTimeout(`${DEVPOST}?${params}&status[]=upcoming&status[]=open&per_page=30`, { headers: UA });
  if (!res.ok) throw new Error(`Devpost ${res.status}`);
  return ((await res.json()) as { hackathons?: DevpostHack[] }).hackathons ?? [];
}

/** Rough coordinates for an in-person Devpost venue (one lookup each, OpenStreetMap search). */
async function locate(place: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const q = new URLSearchParams({ q: `${place}, Charlotte, NC`, format: 'jsonv2', limit: '1' });
    const res = await withTimeout(`https://nominatim.openstreetmap.org/search?${q.toString()}`, { headers: { ...UA, 'Accept-Language': 'en' } }, 8000);
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

// ---- Public ------------------------------------------------------------------------------------

export type LiveResult = { events: CommunityEvent[]; errors: string[]; fetchedAt: number };

export async function fetchLiveEvents(force = false): Promise<LiveResult> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return { events: cache.events, errors: cache.errors, fetchedAt: cache.at };
  const errors: string[] = [];
  const settle = async <T,>(label: string, p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch {
      errors.push(label);
      return fallback;
    }
  };

  const [networking, career, tech, local, online] = await Promise.all([
    settle('Meetup', meetup('networking', 'networking'), []),
    settle('Meetup', meetup('career', 'career'), []),
    settle('Meetup', meetup('tech meetup', 'networking'), []),
    settle('Devpost', devpost('search=charlotte'), [] as DevpostHack[]),
    settle('Devpost', devpost('challenge_type[]=online&order_by=deadline'), [] as DevpostHack[]),
  ]);

  // In-person Charlotte hackathons get real coordinates (a few lookups, spaced out politely).
  const localEvents: CommunityEvent[] = [];
  for (const h of local.slice(0, 4)) {
    const coord = h.displayed_location?.location ? await locate(h.displayed_location.location) : null;
    const e = devpostToEvent(h, coord);
    if (e) localEvents.push(e);
    await new Promise((r) => setTimeout(r, 1100));
  }
  const onlineEvents = online
    .map((h) => devpostToEvent(h, null))
    .filter((e): e is CommunityEvent => !!e && !!e.online)
    .slice(0, 6);

  const seen = new Set<string>();
  const now = Date.now();
  const events = [...networking, ...career, ...tech, ...localEvents, ...onlineEvents]
    .filter((e) => {
      // The same listing can come back from several searches, or twice under different ids.
      const key = `${e.title.toLowerCase()}|${new Date(e.start).toDateString()}`;
      if (e.end <= now || seen.has(e.id) || seen.has(key)) return false;
      seen.add(e.id).add(key);
      return true;
    })
    .sort((a, b) => a.start - b.start);

  events.forEach((e) => byId.set(e.id, e));
  cache = { at: now, events, errors: [...new Set(errors)] };
  return { events, errors: cache.errors, fetchedAt: now };
}

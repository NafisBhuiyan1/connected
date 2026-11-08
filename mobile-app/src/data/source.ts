/**
 * Data layer. Screens only talk to `dataSource`.
 * It combines real people from the Supabase backend (when signed in) with the built-in demo
 * profiles (unless demo people are turned off in Profile).
 */
import { fetchNearby, fetchPeopleByIds, fetchVisible } from '@/lib/backend';
import { distanceMi } from '@/lib/geo';
import { fetchLiveEvents, getLiveEvent } from '@/lib/liveEvents';
import { buildDemoEvents, buildDemoPeople } from './demo';
import { CHALLENGES, FIELDS, FOODS } from './options';
import type { CommunityEvent, LatLng, NearbyPerson, Person } from './types';

export type EventsResult = { events: CommunityEvent[]; liveCount: number; errors: string[]; fetchedAt: number };
export type SearchHit = { person: Person; score: number; matched: string[] };

export interface DataSource {
  /** People who opted in to nearby discovery, within `radiusMi` of `center`. */
  listNearbyPeople(center: LatLng, radiusMi: number): Promise<NearbyPerson[]>;
  /** Free-text search over opted-in people: name, role, company, field, skills, interests, languages, area, bio. */
  searchPeople(query: string): Promise<SearchHit[]>;
  /** Everyone opted in (used by the assistant to recommend people). */
  listPeople(): Promise<Person[]>;
  /** A person already loaded (demo or cached real person). */
  getPerson(id: string): Person | undefined;
  /** Like getPerson, but loads a real person from the backend when needed. */
  fetchPerson(id: string): Promise<Person | undefined>;
  /** Real live events (Meetup, Devpost) plus demo events when `withDemo` is on. */
  listEvents(opts?: { withDemo?: boolean; force?: boolean }): Promise<EventsResult>;
  getEvent(id: string): CommunityEvent | undefined;
}

const demoPeople = buildDemoPeople();
const events = buildDemoEvents();

// Session-wide settings set by the app state.
let myId: string | null = null;
let showDemo = true;
const remoteCache = new Map<string, Person>();
export function setBackendUser(id: string | null) {
  myId = id;
  if (!id) remoteCache.clear();
}
export function setShowDemo(v: boolean) {
  showDemo = v;
}
export function rememberPeople(ps: Person[]) {
  ps.forEach((p) => remoteCache.set(p.id, p));
}

const demos = () => (showDemo ? demoPeople : []);

async function remote<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!myId) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.warn('Backend request failed', e);
    return fallback;
  }
}

/** Searchable text for each person, grouped by how much a hit there should count. */
function fieldsFor(p: Person): { label: string; text: string; weight: number }[] {
  return [
    { label: 'Name', text: p.name, weight: 6 },
    { label: 'Role', text: p.role, weight: 4 },
    { label: 'Company', text: p.org, weight: 3 },
    { label: 'Field', text: `${FIELDS.find((f) => f.id === p.field)?.label ?? ''} ${p.fieldPhrase}`, weight: 3 },
    { label: 'Skills', text: p.skills.join(' | '), weight: 3 },
    { label: 'Interests', text: p.interests.join(' | '), weight: 2 },
    { label: 'Helps with', text: `${p.helpsWith.join(' | ')} | ${p.helpTags.map((t) => CHALLENGES.find((c) => c.id === t)?.theyHelp ?? '').join(' | ')}`, weight: 2 },
    { label: 'Languages', text: p.languages.join(' | '), weight: 3 },
    { label: 'Area', text: p.areaName, weight: 3 },
    { label: 'Food', text: p.foods.map((f) => FOODS.find((x) => x.id === f)?.label ?? f).join(' | '), weight: 1 },
    { label: 'About', text: p.bio, weight: 1 },
  ];
}

function search(query: string, people: Person[]): SearchHit[] {
  const terms = query.toLowerCase().split(/[\s,]+/).map((t) => t.trim()).filter((t) => t.length > 1);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const p of people) {
    let score = 0;
    const matched = new Set<string>();
    let allFound = true;
    for (const term of terms) {
      let found = false;
      for (const f of fieldsFor(p)) {
        const text = f.text.toLowerCase();
        const idx = text.indexOf(term);
        if (idx === -1) continue;
        found = true;
        const wordStart = idx === 0 || /[\s|,(-]/.test(text[idx - 1]);
        score += f.weight * (wordStart ? 1 : 0.4);
        matched.add(f.label);
      }
      if (!found) allFound = false;
    }
    if (score > 0 && allFound) hits.push({ person: p, score: score + (p.isDemo ? 0 : 0.5), matched: [...matched] });
  }
  return hits.sort((a, b) => b.score - a.score);
}

export const dataSource: DataSource = {
  async listNearbyPeople(center, radiusMi) {
    const real = await remote(() => fetchNearby(center, radiusMi), [] as Person[]);
    rememberPeople(real);
    return [...real, ...demos()]
      .map((p) => ({ ...p, distanceMi: distanceMi(center, p.coord) }))
      .filter((p) => p.distanceMi <= radiusMi)
      .sort((a, b) => a.distanceMi - b.distanceMi);
  },
  async searchPeople(query) {
    const real = await remote(() => fetchVisible(myId!), [] as Person[]);
    rememberPeople(real);
    return search(query, [...real, ...demos()]);
  },
  async listPeople() {
    const real = await remote(() => fetchVisible(myId!), [] as Person[]);
    rememberPeople(real);
    return [...real, ...demos()];
  },
  getPerson: (id) => demoPeople.find((p) => p.id === id) ?? remoteCache.get(id),
  async fetchPerson(id) {
    const known = dataSource.getPerson(id);
    if (known) return known;
    const [p] = await remote(() => fetchPeopleByIds([id]), [] as Person[]);
    if (p) rememberPeople([p]);
    return p;
  },
  async listEvents(opts) {
    const live = await fetchLiveEvents(opts?.force);
    const demo = opts?.withDemo ? events.filter((e) => e.end > Date.now()) : [];
    return {
      events: [...live.events, ...demo].sort((a, b) => a.start - b.start),
      liveCount: live.events.length,
      errors: live.errors,
      fetchedAt: live.fetchedAt,
    };
  },
  getEvent: (id) => getLiveEvent(id) ?? events.find((e) => e.id === id),
};

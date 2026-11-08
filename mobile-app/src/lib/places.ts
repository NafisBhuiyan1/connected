/**
 * Finds places two people could meet: near the midpoint between them, serving food they both like.
 *
 * Live data comes from OpenStreetMap's Nominatim search (free, no key). To respect its usage policy
 * we send at most one request per second, identify the app, cache results, and only ever send a
 * rounded area (about 1 km precision) — never anyone's exact position. If the network fails we fall
 * back to the app's list of public venues.
 */
import { DIETS, FOODS, VENUES, foodLabel } from '@/data/options';
import type { DietId, FoodId, LatLng } from '@/data/types';
import { distanceMi } from './geo';

export type MeetSpot = {
  id: string;
  name: string;
  kind: string;
  food: FoodId | null;
  coord: LatLng;
  area: string;
  fromA: number;
  fromB: number;
  dietOk: DietId[];
  source: 'osm' | 'venues';
};

export type MeetPlan = {
  shared: FoodId[];
  /** Food the search actually used (shared, or coffee as neutral ground). */
  searched: FoodId[];
  spots: MeetSpot[];
  midpoint: LatLng;
  note?: string;
};

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const HEADERS = {
  'User-Agent': 'Connected-hackathon-app/1.0 (github.com/kartik215/connected)',
  Referer: 'https://github.com/kartik215/connected',
  'Accept-Language': 'en',
};
const BOX = 0.025; // ~1.7 mi north-south on each side of the midpoint
const cache = new Map<string, MeetPlan>();

let nextSlot = 0;
async function politely<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return fn();
}

type NominatimHit = {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  category?: string;
  type?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
};

const OK_TYPES: Record<string, string[]> = {
  amenity: ['restaurant', 'cafe', 'fast_food', 'ice_cream', 'food_court'],
  shop: ['bakery', 'pastry', 'coffee', 'tea', 'deli'],
};

async function search(q: string, mid: LatLng): Promise<NominatimHit[]> {
  const params = new URLSearchParams({
    q,
    viewbox: [mid.longitude - BOX, mid.latitude + BOX, mid.longitude + BOX, mid.latitude - BOX].join(','),
    bounded: '1',
    format: 'jsonv2',
    limit: '12',
    extratags: '1',
    addressdetails: '1',
  });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await politely(() => fetch(`${ENDPOINT}?${params.toString()}`, { headers: HEADERS, signal: ctrl.signal }));
    if (!res.ok) throw new Error(`Place search failed (${res.status})`);
    return (await res.json()) as NominatimHit[];
  } finally {
    clearTimeout(t);
  }
}

const round = (n: number) => Math.round(n * 100) / 100; // ~1 km

const TYPE_LABEL: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Quick bite', ice_cream: 'Ice cream', food_court: 'Food hall',
  bakery: 'Bakery', pastry: 'Bakery', coffee: 'Café', tea: 'Tea shop', deli: 'Deli',
};

function kindOf(h: NominatimHit, food: FoodId | null): string {
  const type = TYPE_LABEL[h.type ?? ''] ?? 'Spot';
  if (!food || food === 'coffee' || food === 'bakery' || food === 'tea') return type;
  return `${foodLabel(food)} · ${type.toLowerCase()}`;
}

function areaOf(h: NominatimHit): string {
  const a = h.address ?? {};
  return a.neighbourhood || a.suburb || a.quarter || a.road || a.city || 'Charlotte';
}

function matchesFood(h: NominatimHit, food: FoodId): boolean {
  const f = FOODS.find((x) => x.id === food)!;
  const cuisine = (h.extratags?.cuisine ?? '').toLowerCase();
  if (f.cuisines.some((c) => cuisine.split(';').includes(c))) return true;
  if (f.shops && h.category === 'shop' && f.shops.includes(h.type ?? '')) return true;
  if (food === 'coffee' && h.type === 'cafe') return true;
  return (h.name ?? '').toLowerCase().includes(f.q.split(' ')[0]);
}

function dietOk(h: NominatimHit, diets: DietId[]): DietId[] {
  return diets.filter((d) => {
    if (d === 'no_alcohol') return h.type === 'cafe' || h.category === 'shop' || h.extratags?.['drink:alcohol'] === 'no';
    const tag = DIETS.find((x) => x.id === d)?.osm;
    const v = tag ? h.extratags?.[tag] : undefined;
    return v === 'yes' || v === 'only';
  });
}

/**
 * @param a     where you are (GPS or the area you picked)
 * @param b     the other person's approximate neighborhood point
 * @param mine  your foods; @param theirs their foods
 * @param diets dietary needs of either person (the spot should suit both)
 */
export async function findMeetSpots(a: LatLng, b: LatLng, mine: FoodId[], theirs: FoodId[], diets: DietId[]): Promise<MeetPlan> {
  // Specific cuisines first; coffee, tea and bakery are easy fallbacks rather than the main pick.
  const casual: FoodId[] = ['coffee', 'tea', 'bakery'];
  const shared = mine.filter((f) => theirs.includes(f)).sort((x, y) => Number(casual.includes(x)) - Number(casual.includes(y)));
  const midpoint = { latitude: round((a.latitude + b.latitude) / 2), longitude: round((a.longitude + b.longitude) / 2) };
  const searched: FoodId[] = shared.length ? shared.slice(0, 2) : ['coffee'];
  const key = `${midpoint.latitude},${midpoint.longitude}|${searched.join(',')}|${diets.join(',')}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, spots: hit.spots.map((s) => ({ ...s, fromA: distanceMi(a, s.coord), fromB: distanceMi(b, s.coord) })) };

  const found = new Map<string, MeetSpot & { score: number }>();
  const consider = (h: NominatimHit, food: FoodId | null) => {
    const ok = OK_TYPES[h.category ?? '']?.includes(h.type ?? '');
    if (!ok || !h.name) return;
    const id = `${h.osm_type}${h.osm_id}`;
    if (found.has(id)) return;
    const coord = { latitude: Number(h.lat), longitude: Number(h.lon) };
    const fromA = distanceMi(a, coord);
    const fromB = distanceMi(b, coord);
    const matched = food && matchesFood(h, food) ? food : null;
    const okDiet = dietOk(h, diets);
    const score = (matched ? 4 : 0) + okDiet.length * 1.5 - Math.abs(fromA - fromB) * 0.8 - (fromA + fromB) * 0.4 + (diets.includes('no_alcohol') && okDiet.includes('no_alcohol') ? 1 : 0);
    found.set(id, { id, name: h.name, kind: kindOf(h, matched), food: matched, coord, area: areaOf(h), fromA, fromB, dietOk: okDiet, source: 'osm', score });
  };

  let note: string | undefined;
  try {
    for (const food of searched) {
      const f = FOODS.find((x) => x.id === food)!;
      (await search(f.q, midpoint)).forEach((h) => consider(h, food));
    }
    // Not enough? Add cafés as easy middle ground.
    if ([...found.values()].filter((s) => s.food).length < 3 && !searched.includes('coffee')) {
      (await search('cafe', midpoint)).forEach((h) => consider(h, 'coffee'));
      if (shared.length) note = `Not many ${shared.map((x) => foodLabel(x).toLowerCase()).join(' or ')} spots between you, so cafés are included too.`;
    }
  } catch {
    // Offline or the service is busy: suggest public venues near the midpoint instead.
    const spots = [...VENUES]
      .filter((v) => v.id !== 'virtual')
      .map((v) => ({ v, d: distanceMi(midpoint, v.coord) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 3)
      .map(({ v }): MeetSpot => ({
        id: v.id, name: v.name, kind: 'Public spot', food: null, coord: v.coord, area: v.area,
        fromA: distanceMi(a, v.coord), fromB: distanceMi(b, v.coord), dietOk: [], source: 'venues',
      }));
    return { shared, searched, spots, midpoint, note: 'Couldn’t load restaurants right now, so here are public spots between you.' };
  }

  const spots: MeetSpot[] = [...found.values()]
    .sort((x, y) => y.score - x.score)
    .slice(0, 4)
    .map((s) => ({ id: s.id, name: s.name, kind: s.kind, food: s.food, coord: s.coord, area: s.area, fromA: s.fromA, fromB: s.fromB, dietOk: s.dietOk, source: s.source }));
  if (!shared.length) note = 'You don’t share a food pick yet, so here are cafés halfway between you.';
  const plan = { shared, searched, spots, midpoint, note };
  if (spots.length) cache.set(key, plan);
  return plan;
}

/** Link that opens directions in the phone's maps app. */
export function directionsUrl(s: MeetSpot, ios: boolean): string {
  const q = encodeURIComponent(s.name);
  const ll = `${s.coord.latitude},${s.coord.longitude}`;
  return ios ? `http://maps.apple.com/?daddr=${ll}&q=${q}&dirflg=w` : `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=walking`;
}

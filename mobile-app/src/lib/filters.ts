import type { AvailabilityId, FieldId, GoalId, NearbyPerson } from '@/data/types';
import { doorActive, doorState } from './match';
import { dayLabel } from './time';

export type Filters = {
  distanceMi: number;
  fields: FieldId[];
  interests: string[];
  goals: GoalId[];
  availability: 'any' | AvailabilityId;
};

export const defaultFilters = (distanceMi: number): Filters => ({ distanceMi, fields: [], interests: [], goals: [], availability: 'any' });

export const activeFilterCount = (f: Filters) => f.fields.length + f.interests.length + f.goals.length + (f.availability !== 'any' ? 1 : 0);

export function isFreeToday(p: NearbyPerson): boolean {
  if (p.availability.includes('today')) return true;
  return !!p.door && doorActive(p.door) && (doorState(p.door) === 'live' || dayLabel(p.door.start) === 'Today');
}

export function applyFilters(people: NearbyPerson[], f: Filters, blocked: string[]): NearbyPerson[] {
  return people.filter((p) => {
    if (blocked.includes(p.id)) return false;
    if (p.distanceMi > f.distanceMi) return false;
    if (f.fields.length && !f.fields.includes(p.field)) return false;
    if (f.interests.length && !p.interests.some((i) => f.interests.includes(i))) return false;
    if (f.goals.length && !p.offers.some((g) => f.goals.includes(g))) return false;
    if (f.availability === 'today' && !isFreeToday(p)) return false;
    if (f.availability !== 'any' && f.availability !== 'today' && !p.availability.includes(f.availability) && !(f.availability === 'week' && isFreeToday(p))) return false;
    return true;
  });
}

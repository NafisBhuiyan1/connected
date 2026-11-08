/**
 * Professional hotspots in Charlotte: where offices, campuses and meetups cluster.
 * Levels are demo estimates based on what each area is known for (not live foot traffic).
 * The "people here" count shown in the app is computed live from opted-in profiles.
 * To make this live, replace HOTSPOTS with data from your backend (e.g. aggregated, anonymized check-ins).
 */
import type { LatLng } from './types';

export type HotspotLevel = 'high' | 'medium' | 'emerging';

export type Hotspot = {
  id: string;
  name: string;
  kind: string;
  level: HotspotLevel;
  center: LatLng;
  radiusMi: number;
  why: string;
  peak: string;
};

export const HOTSPOT_LEVELS: Record<HotspotLevel, { label: string; hint: string; color: string; fill: string; stroke: string }> = {
  high: { label: 'Major hub', hint: 'Busiest professional areas', color: '#5B35C9', fill: 'rgba(91,53,201,0.20)', stroke: 'rgba(91,53,201,0.60)' },
  medium: { label: 'Active hub', hint: 'Steady weekday activity', color: '#D23F8C', fill: 'rgba(210,63,140,0.16)', stroke: 'rgba(210,63,140,0.55)' },
  emerging: { label: 'Emerging spot', hint: 'Growing, more casual', color: '#0E8A7E', fill: 'rgba(14,138,126,0.15)', stroke: 'rgba(14,138,126,0.55)' },
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'uptown', name: 'Uptown', kind: 'Banking & corporate HQs', level: 'high',
    center: { latitude: 35.2271, longitude: -80.8431 }, radiusMi: 0.85,
    why: 'Bank headquarters, law and accounting firms, and the convention center make this the city’s busiest professional core.',
    peak: 'Weekdays, 8am to 6pm',
  },
  {
    id: 'southend', name: 'South End', kind: 'Tech, startups & design', level: 'high',
    center: { latitude: 35.2115, longitude: -80.8585 }, radiusMi: 0.75,
    why: 'Tech offices, coworking spaces and the Rail Trail draw startup, product and design crowds.',
    peak: 'Weekdays, plus after-work 5 to 8pm',
  },
  {
    id: 'medical', name: 'Medical district', kind: 'Healthcare', level: 'medium',
    center: { latitude: 35.2045, longitude: -80.8385 }, radiusMi: 0.55,
    why: 'Two large hospital campuses plus clinics and medical offices around Dilworth and Midtown.',
    peak: 'Weekdays, shift changes at 7am and 7pm',
  },
  {
    id: 'southpark', name: 'SouthPark', kind: 'Finance & professional services', level: 'medium',
    center: { latitude: 35.1535, longitude: -80.8285 }, radiusMi: 0.7,
    why: 'Wealth management, consulting and insurance offices around the shopping district.',
    peak: 'Weekdays, lunch hours',
  },
  {
    id: 'university', name: 'University City', kind: 'Research & campus', level: 'medium',
    center: { latitude: 35.3065, longitude: -80.7335 }, radiusMi: 1.1,
    why: 'A large university campus and a research park with tech and finance employers.',
    peak: 'Weekdays during the semester',
  },
  {
    id: 'ballantyne', name: 'Ballantyne', kind: 'Corporate campuses', level: 'medium',
    center: { latitude: 35.0535, longitude: -80.8475 }, radiusMi: 1.0,
    why: 'Office parks and corporate campuses for finance, energy and tech companies.',
    peak: 'Weekdays',
  },
  {
    id: 'campnorthend', name: 'Camp North End', kind: 'Innovation & makers', level: 'emerging',
    center: { latitude: 35.2445, longitude: -80.8352 }, radiusMi: 0.45,
    why: 'A converted industrial campus with startups, studios, a food hall and frequent events.',
    peak: 'Evenings and weekends',
  },
  {
    id: 'noda', name: 'NoDa & Plaza Midwood', kind: 'Creative & small business', level: 'emerging',
    center: { latitude: 35.2355, longitude: -80.8055 }, radiusMi: 0.8,
    why: 'Studios, cafés and independent businesses. Popular for relaxed first meetings.',
    peak: 'Evenings and weekends',
  },
];

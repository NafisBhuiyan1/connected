import type { LatLng } from '@/data/types';

const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceMi(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "about 0.4 mi" style, rounded so it never reads as a precise location. */
export function approxDistance(mi: number): string {
  if (mi < 0.5) return 'under half a mile';
  if (mi < 10) return `about ${Math.round(mi * 2) / 2} mi`;
  return `about ${Math.round(mi)} mi`;
}

/** Rough travel time: walking (about 3 mph) for short hops, otherwise driving in town (about 22 mph). */
export function travelTime(mi: number): string {
  const walk = (mi / 3) * 60;
  if (walk <= 25) return `${Math.max(1, Math.round(walk))} min walk`;
  return `${Math.max(5, Math.round(((mi / 22) * 60) / 5) * 5)} min drive`;
}

/** Latitude delta that shows roughly `mi` miles from center to edge on a phone. */
export const deltaForMiles = (mi: number) => Math.max(0.02, (mi / 69) * 2.4);

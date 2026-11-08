import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LatLng } from '@/data/types';
import { distanceMi } from './geo';

export type Perm = 'checking' | 'undetermined' | 'granted' | 'denied';
export type Fix = { coord: LatLng; accuracyM: number | null; at: number };

const GEOCODE_EVERY_MI = 0.25;

/**
 * Your own location, for your own map only.
 * - Checks permission without prompting; `request()` prompts.
 * - When `live` is on, follows you with a foreground-only watcher that runs only while the map
 *   screen is focused and the app is open. It stops the moment you leave either.
 * - Looks up the neighborhood name occasionally (not on every update).
 * Nothing here is sent anywhere or shown to other people.
 */
export function useLiveLocation(live: boolean, onFix?: (f: Fix, first: boolean) => void) {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [perm, setPerm] = useState<Perm>('checking');
  const [fix, setFixState] = useState<Fix | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const lastGeocoded = useRef<LatLng | null>(null);
  const onFixRef = useRef(onFix);
  const hadFix = useRef(false);

  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);

  // Every new position goes through here (always from an async callback, never during render).
  const setFix = useCallback((f: Fix) => {
    setFixState(f);
    const first = !hadFix.current;
    hadFix.current = true;
    onFixRef.current?.(f, first);
  }, []);

  const toFix = (l: Location.LocationObject): Fix => ({
    coord: { latitude: l.coords.latitude, longitude: l.coords.longitude },
    accuracyM: l.coords.accuracy,
    at: l.timestamp,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // First look: no prompt. If already allowed, grab one position.
  useEffect(() => {
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then(async ({ status }) => {
        if (!alive) return;
        if (status !== 'granted') return setPerm(status === 'denied' ? 'denied' : 'undetermined');
        setPerm('granted');
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (alive) setFix(toFix(l));
      })
      .catch(() => alive && setPerm('denied'));
    return () => { alive = false; };
  }, [setFix]);

  /** Ask for permission (shows the system prompt) and take a fix. Returns the position if granted. */
  const request = useCallback(async (): Promise<Fix | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPerm(status === 'denied' ? 'denied' : 'undetermined');
        return null;
      }
      setPerm('granted');
      const f = toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      setFix(f);
      return f;
    } catch {
      setPerm('denied');
      return null;
    }
  }, [setFix]);

  // Live updates while you're looking at the map.
  const watching = live && perm === 'granted' && focused && active;
  useEffect(() => {
    if (!watching) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 8, timeInterval: 4000 }, (l) => setFix(toFix(l)))
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [watching, setFix]);

  // Neighborhood name, refreshed only after you've moved a little.
  useEffect(() => {
    if (!fix) return;
    const prev = lastGeocoded.current;
    if (prev && distanceMi(prev, fix.coord) < GEOCODE_EVERY_MI) return;
    lastGeocoded.current = fix.coord;
    let alive = true;
    Location.reverseGeocodeAsync(fix.coord)
      .then(([a]) => {
        if (alive && a) setPlace(a.district || a.subregion || a.city || a.name || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [fix]);

  return { perm, fix, place, watching, request };
}

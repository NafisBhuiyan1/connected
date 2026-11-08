/**
 * "Someone is nearby" alerts. Runs only while the map is open and live location is on:
 * no background location, no push server. Each real member alerts at most once every 3 hours.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { LatLng, Person } from '@/data/types';
import { distanceMi } from './geo';

export const ALERT_RADIUS_MI = 1;
const COOLDOWN_MS = 3 * 3_600_000;
const CHANNEL = 'nearby';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Asks for notification permission. Returns true if alerts can be shown. */
export async function enableNearbyAlerts(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      // 6 = AndroidImportance.HIGH (the enum is re-exported in a way the import linter can't follow).
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'People nearby', importance: 6 });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Real (non-demo) members who share an area within 1 mile of `me`. */
export function peopleWithin(me: LatLng, people: Person[], mi = ALERT_RADIUS_MI) {
  return people.filter((p) => !p.isDemo && !p.areaHidden && distanceMi(me, p.coord) <= mi);
}

export function useNearbyAlerts(enabled: boolean, me: LatLng | null, people: Person[]) {
  const lastAlert = useRef(new Map<string, number>());
  const lat = me?.latitude;
  const lng = me?.longitude;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    const now = Date.now();
    for (const p of peopleWithin({ latitude: lat, longitude: lng }, people)) {
      if (now - (lastAlert.current.get(p.id) ?? 0) < COOLDOWN_MS) continue;
      lastAlert.current.set(p.id, now);
      const mi = distanceMi({ latitude: lat, longitude: lng }, p.coord);
      Notifications.scheduleNotificationAsync({
        content: {
          title: `${p.name} is nearby`,
          body: `${p.role}${p.org ? ` at ${p.org}` : ''} · ${mi < 0.3 ? 'right around you' : `about ${mi.toFixed(1)} mi away`}. Tap to say hi.`,
          data: { personId: p.id },
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
      }).catch(() => {});
    }
  }, [enabled, lat, lng, people]);

  // Tapping an alert opens that person's profile.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.personId;
      if (typeof id === 'string') router.push({ pathname: '/person/[id]', params: { id } });
    });
    return () => sub.remove();
  }, []);
}

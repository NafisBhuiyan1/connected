import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { availabilityLabel, venueById } from '@/data/options';
import type { NearbyPerson, Prefs, Profile } from '@/data/types';
import { approxDistance } from '@/lib/geo';
import { canSeeDoor, doorActive, doorState, matchPoints, matchStrength } from '@/lib/match';
import { fmtTime, fmtWindow } from '@/lib/time';
import { C, R, S, T, shadow } from '@/theme';
import { Avatar, Button, IconButton } from './ui';

type Props = {
  person: NearbyPerson;
  distanceFromLabel: string;
  prefs: Prefs;
  profile: Profile;
  onOpen: () => void;
  onClose: () => void;
  /** Rendered inside the bottom sheet: no card shadow or outer padding. */
  embedded?: boolean;
  /** Extra line under the distance, e.g. travel time. */
  travel?: string;
};

/** Compact card shown over the map for the selected pin. */
export function PersonCard({ person: p, distanceFromLabel, prefs, profile, onOpen, onClose, embedded, travel }: Props) {
  const points = matchPoints(p, prefs).slice(0, 2);
  const strength = matchStrength(p, prefs);
  const door = p.door && doorActive(p.door) ? p.door : undefined;
  const seeDoor = door ? canSeeDoor(door, p, prefs, profile) : false;
  const free = p.availability.includes('today') ? 'Free today' : `Free ${availabilityLabel(p.availability[0]).toLowerCase()}`;

  return (
    <View style={embedded ? styles.embedded : [styles.card, shadow]}>
      <View style={styles.head}>
        <Avatar name={p.name} uri={p.photo} size={58} ring={!!door && seeDoor} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
            {strength === 'strong' ? <Text style={styles.badge}>Strong match</Text> : null}
          </View>
          <Text style={T.small} numberOfLines={1}>{p.role}, {p.org}</Text>
          <Text style={[T.small, { color: C.ink2 }]} numberOfLines={1}>
            {approxDistance(p.distanceMi)} {distanceFromLabel}{travel ? ` · ${travel}` : ''} · {free}
          </Text>
        </View>
        <IconButton icon="close" label="Close" onPress={onClose} style={{ marginTop: -8, marginRight: -8 }} />
      </View>

      <Text style={styles.bio} numberOfLines={2}>{p.bio}</Text>

      {points.length ? (
        <View style={{ gap: 6 }}>
          {points.map((pt) => (
            <View key={pt.text} style={styles.point}>
              <Ionicons name={pt.icon} size={15} color={C.accent} />
              <Text style={styles.pointText} numberOfLines={1}>{pt.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {door ? (
        <View style={styles.door}>
          <Ionicons name="enter-outline" size={17} color={C.accent} />
          <Text style={[T.small, { color: C.ink, flex: 1, fontSize: 14 }]} numberOfLines={1}>
            {seeDoor
              ? `Open Door ${doorState(door) === 'live' ? `now until ${fmtTime(door.end)}` : fmtWindow(door.start, door.end).toLowerCase()} · ${venueById(door.venueId).name}`
              : 'Hosting an Open Door for another group'}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Button label="View profile" onPress={onOpen} style={{ flex: 1 }} />
        <Text style={styles.demo}>{p.isDemo ? 'Demo profile' : 'Connected member'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 22, padding: S.lg, gap: S.md },
  embedded: { gap: S.md },
  head: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: C.ink, flexShrink: 1 },
  badge: { fontSize: 11, fontWeight: '700', color: C.accent, backgroundColor: C.accentSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  bio: { fontSize: 15, lineHeight: 21, color: C.ink2 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointText: { fontSize: 14, color: C.ink, fontWeight: '500', flex: 1 },
  door: { flexDirection: 'row', gap: S.sm, alignItems: 'center', backgroundColor: C.accentSoft, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 10 },
  demo: { fontSize: 12, color: C.ink3 },
});

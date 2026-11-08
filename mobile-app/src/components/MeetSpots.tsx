import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CHARLOTTE_CENTER, FOODS, dietLabel, foodLabel } from '@/data/options';
import type { DietId, Person } from '@/data/types';
import { approxDistance } from '@/lib/geo';
import { firstName } from '@/lib/match';
import { directionsUrl, findMeetSpots, type MeetPlan, type MeetSpot } from '@/lib/places';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';
import { Button } from './ui';

type Props = {
  person: Person;
  /** Called with a spot when the user wants to propose it. Omit to hide the button. */
  onUse?: (spot: MeetSpot) => void;
  useLabel?: string;
};

/** Suggests places near the midpoint between you and `person` that serve food you both like. */
export function MeetSpots({ person, onUse, useLabel = 'Suggest this' }: Props) {
  const app = useApp();
  const first = firstName(person.name);
  const origin = app.here?.coord ?? CHARLOTTE_CENTER;
  const originLabel = app.here?.isGps ? 'you' : app.here?.label ?? 'Charlotte';
  const diets = [...new Set<DietId>([...app.prefs.diet, ...person.diet])];
  // People who share "public places only" have no area, so look for spots near you instead.
  const theirs = person.areaHidden ? origin : person.coord;
  const key = `${person.id}|${origin.latitude.toFixed(2)},${origin.longitude.toFixed(2)}|${app.prefs.foods.join(',')}|${diets.join(',')}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; plan: MeetPlan } | null>(null);
  const loading = result?.key !== `${key}#${attempt}`;

  useEffect(() => {
    let alive = true;
    findMeetSpots(origin, theirs, app.prefs.foods, person.foods, diets).then((plan) => {
      if (alive) setResult({ key: `${key}#${attempt}`, plan });
    });
    return () => { alive = false; };
    // `key` captures every input that changes the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const plan = result?.plan;
  const shared = app.prefs.foods.filter((f) => person.foods.includes(f));

  return (
    <View style={{ gap: S.md }}>
      {shared.length ? (
        <View style={styles.sharedRow}>
          <Text style={T.small}>You both like</Text>
          {shared.map((f) => (
            <View key={f} style={styles.foodChip}>
              <Ionicons name={FOODS.find((x) => x.id === f)!.icon} size={13} color={C.accent} />
              <Text style={styles.foodChipText}>{foodLabel(f)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={T.small}>
          {app.prefs.foods.length ? `You and ${first} haven’t picked the same food yet, so we’ll look for easy cafés.` : 'Add food you like in your preferences for better picks. For now, here are cafés.'}
          {person.foods.length ? ` ${first} likes ${person.foods.slice(0, 3).map((f) => foodLabel(f).toLowerCase()).join(', ')}.` : ''}
        </Text>
      )}
      {diets.length ? (
        <Text style={T.small}>
          Looking for places that suit: {diets.map((d) => `${dietLabel(d).toLowerCase()}${person.diet.includes(d) && !app.prefs.diet.includes(d) ? ` (${first})` : ''}`).join(', ')}
        </Text>
      ) : null}

      {loading ? (
        <View style={{ gap: S.sm }} accessibilityLabel={`Finding spots between you and ${first}`}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.skeleton} />)}
          <Text style={T.small}>Finding spots halfway between you and {first}…</Text>
        </View>
      ) : plan && plan.spots.length ? (
        <View style={styles.list}>
          {plan.spots.map((s, k) => (
            <View key={s.id} style={[styles.spot, k > 0 && styles.divider]}>
              <View style={styles.spotIcon}>
                <Ionicons name={s.food ? FOODS.find((x) => x.id === s.food)!.icon : 'business-outline'} size={18} color={C.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.spotName} numberOfLines={1}>{s.name}</Text>
                <Text style={T.small} numberOfLines={1}>{s.kind} · {s.area}</Text>
                <Text style={styles.spotDist} numberOfLines={1}>
                  {approxDistance(s.fromA)} from {originLabel}{person.areaHidden ? '' : ` · ${approxDistance(s.fromB)} from ${first}`}
                </Text>
                {s.dietOk.length ? (
                  <Text style={styles.diet}>
                    <Ionicons name="checkmark-circle" size={12} color={C.ok} /> {s.dietOk.map((d) => dietLabel(d)).join(', ')}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Button label="Directions" icon="navigate-outline" variant="secondary" small onPress={() => Linking.openURL(directionsUrl(s, Platform.OS === 'ios'))} />
                  {onUse ? <Button label={useLabel} icon="add" small onPress={() => onUse(s)} /> : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={T.small}>No spots found between you right now.</Text>
          <Button label="Try again" variant="secondary" small onPress={() => setAttempt((n) => n + 1)} />
        </View>
      )}

      {plan?.note && !loading ? <Text style={T.small}>{plan.note}</Text> : null}
      {diets.length && plan?.spots.some((s) => s.source === 'osm' && s.dietOk.length < diets.filter((d) => d !== 'no_alcohol').length) && !loading ? (
        <Text style={T.small}>Not every place lists dietary options, so check the menu first.</Text>
      ) : null}
      <Pressable onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')} accessibilityRole="link">
        <Text style={styles.attrib}>
          Places from OpenStreetMap (© contributors). We search a rounded area halfway between you, never anyone&apos;s exact location.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sharedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  foodChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill },
  foodChipText: { fontSize: 13, fontWeight: '700', color: C.accent },
  skeleton: { height: 64, borderRadius: R.md, backgroundColor: C.bg2 },
  list: { borderWidth: 1, borderColor: C.line, borderRadius: R.lg, overflow: 'hidden' },
  spot: { flexDirection: 'row', gap: S.md, padding: S.md },
  divider: { borderTopWidth: 1, borderTopColor: C.line },
  spotIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  spotName: { fontSize: 16, fontWeight: '700', color: C.ink },
  spotDist: { fontSize: 13, color: C.accent, fontWeight: '600' },
  diet: { fontSize: 12, color: C.ok, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: S.sm, marginTop: 6 },
  emptyBox: { gap: S.sm, alignItems: 'flex-start', padding: S.md, borderRadius: R.md, backgroundColor: C.bg2 },
  attrib: { fontSize: 11, color: C.ink3, lineHeight: 15 },
});

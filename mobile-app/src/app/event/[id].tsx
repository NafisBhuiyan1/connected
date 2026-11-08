import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { EVENT_STYLE } from '@/data/eventVisuals';
import { CHARLOTTE_CENTER, fieldLabel } from '@/data/options';
import { dataSource } from '@/data/source';
import { approxDistance, distanceMi } from '@/lib/geo';
import { dayLabel, fmtTime } from '@/lib/time';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const e = dataSource.getEvent(id);
  if (!e) return <Text style={[T.body, { padding: S.lg }]}>Event not found.</Text>;

  const st = EVENT_STYLE[e.category];
  const saved = app.savedEvents.includes(e.id);
  const multiDay = dayLabel(e.start) !== dayLabel(e.end);
  const origin = app.here?.coord ?? CHARLOTTE_CENTER;
  const from = app.here?.isGps ? 'from you' : `from ${app.here?.label ?? 'Uptown'}`;
  const free = e.cost.toLowerCase().startsWith('free');
  const ll = `${e.coord.latitude},${e.coord.longitude}`;
  const directions = Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(e.venue)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${ll}`;

  const tiles: { icon: IconName; label: string; value: string; sub?: string }[] = [
    { icon: 'calendar', label: 'Date', value: multiDay ? `${dayLabel(e.start)} – ${dayLabel(e.end)}` : dayLabel(e.start), sub: new Date(e.start).toLocaleDateString([], { month: 'long', day: 'numeric' }) },
    { icon: 'time', label: 'Time', value: fmtTime(e.start), sub: multiDay ? 'Multi-day' : `until ${fmtTime(e.end)}` },
    e.online
      ? { icon: 'globe-outline', label: 'Where', value: 'Online', sub: 'Join from anywhere' }
      : { icon: 'location', label: 'Where', value: e.areaName, sub: `${approxDistance(distanceMi(origin, e.coord)).replace('about ', '')} ${from}` },
    { icon: 'pricetag', label: 'Cost', value: e.cost, sub: e.url ? 'RSVP on the listing' : free ? 'No ticket needed' : 'Pay at the door' },
  ];

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + S.xxl }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={st.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + S.sm }]}>
        {e.image ? (
          <>
            <Image source={{ uri: e.image }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`Photo for ${e.title}`} />
            <LinearGradient colors={['rgba(20,14,40,0.35)', 'rgba(20,14,40,0.1)', 'rgba(20,14,40,0.9)']} style={StyleSheet.absoluteFill} />
          </>
        ) : (
          <Ionicons name={st.icon} size={220} color="rgba(255,255,255,0.12)" style={styles.watermark} />
        )}
        <View style={styles.heroBar}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.heroBtn} hitSlop={6}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </Pressable>
          <Pressable onPress={() => app.toggleSavedEvent(e.id)} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save event'} style={styles.heroBtn} hitSlop={6}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={C.white} />
          </Pressable>
        </View>
        <View style={{ gap: S.sm, marginTop: 'auto' }}>
          <View style={styles.kindPill}>
            <Ionicons name={st.icon} size={12} color={C.white} />
            <Text style={styles.kindText}>{st.label}{e.field ? ` · ${fieldLabel(e.field)}` : ''}</Text>
          </View>
          {e.source ? (
            <View style={[styles.kindPill, { backgroundColor: 'rgba(31,184,96,0.9)' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.kindText}>Live · {e.source}</Text>
            </View>
          ) : null}
          <Text style={styles.title} accessibilityRole="header">{e.title}</Text>
          <Text style={styles.heroMeta}>{dayLabel(e.start)} · {fmtTime(e.start)} · {e.online ? 'Online' : e.areaName}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: st.soft }]}>
                <Ionicons name={t.icon} size={18} color={st.solid} />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileValue} numberOfLines={1}>{t.value}</Text>
              {t.sub ? <Text style={styles.tileSub} numberOfLines={1}>{t.sub}</Text> : null}
            </View>
          ))}
        </View>

        <View style={{ gap: S.sm }}>
          <Text style={styles.h}>About</Text>
          <Text style={styles.desc}>{e.description}</Text>
        </View>

        <View style={styles.hostRow}>
          <View style={[styles.hostIcon, { backgroundColor: st.soft }]}><Ionicons name="megaphone-outline" size={18} color={st.solid} /></View>
          <View style={{ flex: 1 }}>
            <Text style={T.small}>Hosted by</Text>
            <Text style={styles.hostName}>{e.host}</Text>
          </View>
        </View>

        {!e.online ? (
          <Pressable onPress={() => Linking.openURL(directions)} accessibilityRole="button" style={({ pressed }) => [styles.venue, pressed && { backgroundColor: C.bg2 }]}>
            <Ionicons name="navigate-circle" size={28} color={st.solid} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hostName} numberOfLines={1}>{e.venue}</Text>
              <Text style={T.small}>Get directions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.ink3} />
          </Pressable>
        ) : null}

        <View style={{ gap: S.sm }}>
          {e.url ? <Button label={`Open on ${e.source ?? 'the web'}`} icon="open-outline" onPress={() => Linking.openURL(e.url!)} /> : null}
          <Button label={saved ? 'Saved to my plans' : 'Save to my plans'} icon={saved ? 'bookmark' : 'bookmark-outline'} variant={saved || e.url ? 'secondary' : 'primary'} onPress={() => app.toggleSavedEvent(e.id)} />
          <Button label="Find people in this field nearby" variant="secondary" icon="people-outline" onPress={() => router.navigate('/')} />
        </View>
        <Text style={[T.small, { textAlign: 'center' }]}>
          {e.source ? `Real event listed on ${e.source}. Details can change, so check the listing before you go.` : 'Demo event.'} Saving is private.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 300, paddingHorizontal: S.lg, paddingBottom: S.xl, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -40, bottom: -40 },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between' },
  heroBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  kindPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  kindText: { color: C.white, fontSize: 12, fontWeight: '800' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.white },
  title: { color: C.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  body: { padding: S.lg, gap: S.xl, marginTop: -S.lg, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: { width: '48.5%', padding: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, gap: 2 },
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLabel: { fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 0.5 },
  tileValue: { fontSize: 17, fontWeight: '800', color: C.ink },
  tileSub: { fontSize: 12, color: C.ink3 },
  h: { fontSize: 18, fontWeight: '800', color: C.ink },
  desc: { fontSize: 16, lineHeight: 24, color: C.ink2 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  hostIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hostName: { fontSize: 15, fontWeight: '700', color: C.ink },
  venue: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { EVENT_STYLE } from '@/data/eventVisuals';
import { CHARLOTTE_CENTER } from '@/data/options';
import { dataSource, type EventsResult } from '@/data/source';
import type { CommunityEvent, EventCategory } from '@/data/types';
import { distanceMi } from '@/lib/geo';
import { dayLabel, fmtTime } from '@/lib/time';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';

type When = 'any' | 'week' | 'month';
type Cat = 'all' | EventCategory | 'saved';
type IconName = ComponentProps<typeof Ionicons>['name'];
type Ev = CommunityEvent & { mi: number };

const CATS: { id: Cat; label: string; icon: IconName; colors: [string, string] }[] = [
  { id: 'all', label: 'All', icon: 'sparkles', colors: ['#3B3355', '#1B1726'] },
  { id: 'networking', label: 'Networking', icon: EVENT_STYLE.networking.icon, colors: EVENT_STYLE.networking.colors },
  { id: 'career', label: 'Career', icon: EVENT_STYLE.career.icon, colors: EVENT_STYLE.career.colors },
  { id: 'hackathon', label: 'Hackathons', icon: EVENT_STYLE.hackathon.icon, colors: EVENT_STYLE.hackathon.colors },
  { id: 'saved', label: 'Saved', icon: 'bookmark', colors: ['#F2B544', '#C9861A'] },
];
const WHEN: { id: When; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];
const MILES = [5, 10, 25];

const shortDay = (t: number) => new Date(t).toLocaleDateString([], { weekday: 'short' }).toUpperCase();
const month = (t: number) => new Date(t).toLocaleDateString([], { month: 'short' }).toUpperCase();
const miLabel = (mi: number) => (mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`);

export default function Events() {
  const app = useApp();
  const [res, setRes] = useState<EventsResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const all = res?.events ?? null;
  const withDemo = app.showDemoEvents;
  const [cat, setCat] = useState<Cat>('all');
  const [when, setWhen] = useState<When>('any');
  const [maxMi, setMaxMi] = useState(25);

  const load = useCallback((force: boolean) => dataSource.listEvents({ withDemo, force }).then(setRes), [withDemo]);
  useEffect(() => {
    load(false);
  }, [load]);
  const refresh = () => {
    setRefreshing(true);
    load(true).finally(() => setRefreshing(false));
  };

  const origin = app.here?.coord ?? CHARLOTTE_CENTER;
  const fromLabel = app.here?.isGps ? 'from you' : `from ${app.here?.label ?? 'Uptown'}`;

  const list: Ev[] = useMemo(() => {
    if (!all) return [];
    const now = app.now;
    const limit = when === 'week' ? now + 7 * 864e5 : when === 'month' ? now + 31 * 864e5 : Infinity;
    return all
      .map((e) => ({ ...e, mi: e.online ? 0 : distanceMi(origin, e.coord) }))
      .filter((e) => (cat === 'all' || cat === 'saved' || e.category === cat) && (cat !== 'saved' || app.savedEvents.includes(e.id)))
      .filter((e) => e.start <= limit && e.mi <= maxMi)
      .sort((a, b) => a.start - b.start);
  }, [all, cat, when, maxMi, app.savedEvents, app.now, origin]);

  const noLive = !!res && !res.liveCount && !withDemo;
  const thisWeek = list.filter((e) => e.start <= app.now + 7 * 864e5);
  const later = list.filter((e) => !thisWeek.includes(e));

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: S.xxl, gap: S.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
    >
      <View style={styles.intro}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.count}>{all ? `${list.length} event${list.length === 1 ? '' : 's'} near you` : 'Finding live events…'}</Text>
          {res ? (
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, !res.liveCount && { backgroundColor: C.ink3 }]} />
              <Text style={styles.liveText}>
                {res.liveCount ? `${res.liveCount} live from Meetup & Devpost · ${fmtTime(res.fetchedAt)}` : 'Live listings unavailable right now'}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.demoToggle}>
          <Text style={styles.demoText}>Demo</Text>
          <Switch value={withDemo} onValueChange={app.setShowDemoEvents} trackColor={{ true: C.accent, false: C.line2 }} accessibilityLabel="Show demo events" />
        </View>
      </View>

      {/* Category tiles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
        {CATS.map((c) => {
          const on = cat === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.label} style={styles.catTile}>
              <LinearGradient colors={c.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.catCircle, on && styles.catCircleOn]}>
                <Ionicons name={c.icon} size={24} color={C.white} />
              </LinearGradient>
              <Text style={[styles.catLabel, on && { color: C.ink, fontWeight: '800' }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* When + distance */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
        {WHEN.map((w) => (
          <Pill key={w.id} label={w.label} on={when === w.id} onPress={() => setWhen(w.id)} />
        ))}
        <View style={styles.pillDivider} />
        {MILES.map((m) => (
          <Pill key={m} label={`${m} mi`} icon="navigate-outline" on={maxMi === m} onPress={() => setMaxMi(m)} />
        ))}
      </ScrollView>

      {!all ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: S.xl }} />
      ) : !list.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name={cat === 'saved' ? 'bookmark-outline' : 'calendar-clear-outline'} size={30} color={C.accent} /></View>
          <Text style={T.h3}>{cat === 'saved' ? 'Nothing saved yet' : noLive ? 'No live events loaded' : 'Nothing matches'}</Text>
          <Text style={[T.small, { textAlign: 'center' }]}>
            {cat === 'saved'
              ? 'Tap the bookmark on any event to keep it here.'
              : noLive
                ? 'Meetup and Devpost could not be reached. Pull down to retry, or turn on demo events.'
                : 'Try a wider distance or another date.'}
          </Text>
          {noLive && cat !== 'saved' ? (
            <Pressable onPress={() => app.setShowDemoEvents(true)} style={[styles.pill, styles.pillOn, { marginTop: S.sm }]} accessibilityRole="button">
              <Text style={[styles.pillText, { color: C.white }]}>Show demo events</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {thisWeek.length ? (
            <View style={{ gap: S.md }}>
              <Text style={styles.section}>This week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={272} decelerationRate="fast" contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
                {thisWeek.map((e) => <BigCard key={e.id} e={e} fromLabel={fromLabel} />)}
              </ScrollView>
            </View>
          ) : null}
          {later.length ? (
            <View style={{ gap: S.sm, paddingHorizontal: S.lg }}>
              <Text style={[styles.section, { paddingHorizontal: 0 }]}>Later</Text>
              {later.map((e) => <Row key={e.id} e={e} />)}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Pill({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.pill, on && styles.pillOn]}>
      {icon ? <Ionicons name={icon} size={13} color={on ? C.white : C.ink2} /> : null}
      <Text style={[styles.pillText, on && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

function SaveButton({ id, light }: { id: string; light?: boolean }) {
  const app = useApp();
  const saved = app.savedEvents.includes(id);
  return (
    <Pressable
      onPress={() => app.toggleSavedEvent(id)}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
      hitSlop={8}
      style={[styles.save, light ? styles.saveLight : null, saved && !light && { backgroundColor: C.accentSoft }]}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={light ? C.white : saved ? C.accent : C.ink2} />
    </Pressable>
  );
}

/** Large gradient card for the "This week" carousel. */
function BigCard({ e, fromLabel }: { e: Ev; fromLabel: string }) {
  const st = EVENT_STYLE[e.category];
  return (
    <Pressable onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} accessibilityRole="button" accessibilityLabel={`${e.title}, ${dayLabel(e.start)} ${fmtTime(e.start)}`}>
      <Cover e={e} style={styles.big}>
        <View style={styles.bigTop}>
          <View style={styles.datePill}>
            <Text style={styles.datePillDay}>{shortDay(e.start)}</Text>
            <Text style={styles.datePillNum}>{new Date(e.start).getDate()}</Text>
          </View>
          <SaveButton id={e.id} light />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={styles.bigKind}>{st.label.toUpperCase()}{e.cost.toLowerCase().startsWith('free') ? ' · FREE' : ''}{e.source ? ` · ${e.source.toUpperCase()}` : ' · DEMO'}</Text>
          <Text style={styles.bigTitle} numberOfLines={2}>{e.title}</Text>
          <Text style={styles.bigMeta} numberOfLines={1}>
            {e.online ? `${fmtTime(e.start)} · Online` : `${fmtTime(e.start)} · ${e.areaName} · ${miLabel(e.mi)}${fromLabel.startsWith('from you') ? ' away' : ''}`}
          </Text>
        </View>
      </Cover>
    </Pressable>
  );
}

/** The event's real photo under a dark scrim, or the category gradient when there's no photo. */
function Cover({ e, style, small, children }: { e: CommunityEvent; style: ViewStyle; small?: boolean; children: ReactNode }) {
  const st = EVENT_STYLE[e.category];
  const radius = small ? 14 : 22;
  if (e.image) {
    return (
      <ImageBackground source={{ uri: e.image }} style={style} imageStyle={{ borderRadius: radius }} resizeMode="cover">
        <LinearGradient
          colors={small ? ['rgba(20,14,40,0.45)', 'rgba(20,14,40,0.6)'] : ['rgba(20,14,40,0.1)', 'rgba(20,14,40,0.88)']}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        {children}
      </ImageBackground>
    );
  }
  return (
    <LinearGradient colors={st.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {!small ? <Ionicons name={st.icon} size={150} color="rgba(255,255,255,0.13)" style={styles.bigWatermark} /> : null}
      {children}
    </LinearGradient>
  );
}

/** Compact visual row for later events. */
function Row({ e }: { e: Ev }) {
  const st = EVENT_STYLE[e.category];
  const free = e.cost.toLowerCase().startsWith('free');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.bg2 }]}
    >
      <Cover e={e} style={styles.dateTile} small>
        <Text style={styles.dateMonth}>{month(e.start)}</Text>
        <Text style={styles.dateNum}>{new Date(e.start).getDate()}</Text>
      </Cover>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{e.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name={st.icon} size={13} color={st.solid} />
          <Text style={[styles.meta, { color: st.solid, fontWeight: '700' }]}>{st.label}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{fmtTime(e.start)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta} numberOfLines={1}>{e.online ? 'Online' : miLabel(e.mi)}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.costPill, free && { backgroundColor: C.okSoft }]}>
            <Text style={[styles.costText, free && { color: C.ok }]}>{e.cost}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>{e.source ? `${e.source} · ${e.host}` : `${e.areaName} · Demo`}</Text>
        </View>
      </View>
      <SaveButton id={e.id} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingTop: S.md },
  count: { fontSize: 15, fontWeight: '700', color: C.ink2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#1FB860' },
  liveText: { fontSize: 12, color: C.ink3, flexShrink: 1 },
  demoToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoText: { fontSize: 11, color: C.ink2, fontWeight: '600' },
  catTile: { alignItems: 'center', gap: 6, width: 72 },
  catCircle: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catCircleOn: { borderWidth: 3, borderColor: C.bg, shadowColor: '#2A1E5C', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6, transform: [{ scale: 1.06 }] },
  catLabel: { fontSize: 12, color: C.ink2, fontWeight: '600' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, minHeight: 36, borderRadius: R.pill, backgroundColor: C.bg2 },
  pillOn: { backgroundColor: C.ink },
  pillText: { fontSize: 13, fontWeight: '600', color: C.ink2 },
  pillDivider: { width: 1, backgroundColor: C.line, marginVertical: 6 },
  section: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3, paddingHorizontal: S.lg },
  big: { width: 260, height: 196, borderRadius: 22, padding: S.lg, justifyContent: 'space-between', overflow: 'hidden' },
  bigWatermark: { position: 'absolute', right: -24, bottom: -28 },
  bigTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  datePill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  datePillDay: { color: C.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  datePillNum: { color: C.white, fontSize: 20, fontWeight: '800', marginTop: -2 },
  bigKind: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bigTitle: { color: C.white, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
  bigMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  save: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 },
  saveLight: { backgroundColor: 'rgba(255,255,255,0.22)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm, paddingRight: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line },
  dateTile: { width: 58, height: 66, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dateMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dateNum: { color: C.white, fontSize: 24, fontWeight: '800', marginTop: -2 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 12, color: C.ink3, flexShrink: 1 },
  metaDot: { fontSize: 12, color: C.line2 },
  costPill: { backgroundColor: C.bg2, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  costText: { fontSize: 11, fontWeight: '700', color: C.ink2 },
  empty: { alignItems: 'center', gap: S.sm, paddingVertical: S.xxl, paddingHorizontal: S.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui';
import { CHARLOTTE_CENTER, FIELDS } from '@/data/options';
import { dataSource, type SearchHit } from '@/data/source';
import { approxDistance, distanceMi } from '@/lib/geo';
import { matchStrength } from '@/lib/match';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';

const SUGGESTIONS = ['Nursing', 'Spanish', 'Python', 'South End', 'Interview prep', 'First-gen', 'Recruiter', 'Mediterranean'];

export default function SearchScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const origin = app.here?.coord ?? CHARLOTTE_CENTER;
  const from = app.here?.isGps ? 'away' : `from ${app.here?.label ?? 'Charlotte'}`;

  useEffect(() => {
    let alive = true;
    const query = q.trim();
    if (!query) return;
    dataSource.searchPeople(query).then((hits) => {
      if (alive) setResult({ q: query, hits: hits.filter((h) => !app.blocked.includes(h.person.id)) });
    });
    return () => { alive = false; };
  }, [q, app.blocked, app.session, app.showDemo]);

  const query = q.trim();
  const hits = query && result?.q === query ? result.hits : [];
  const searching = !!query && result?.q !== query;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + S.sm }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <View style={styles.box}>
          <Ionicons name="search" size={18} color={C.ink3} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Search people, skills, companies, areas"
            placeholderTextColor={C.ink3}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search people"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.ink3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!query ? (
        <FlatList
          data={FIELDS}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: S.lg, gap: 2, paddingBottom: insets.bottom + S.xl }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: S.md, marginBottom: S.lg }}>
              <Text style={T.label}>Try searching for</Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => setQ(s)} style={({ pressed }) => [styles.chip, pressed && { backgroundColor: C.accentSoft }]} accessibilityRole="button">
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[T.label, { marginTop: S.md }]}>Browse by field</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setQ(item.label.split(' & ')[0])} style={({ pressed }) => [styles.fieldRow, pressed && { backgroundColor: C.bg2 }]} accessibilityRole="button">
              <View style={styles.fieldIcon}><Ionicons name={item.icon} size={18} color={C.accent} /></View>
              <Text style={[T.body, { flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.ink3} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(h) => h.person.id}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.xl }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            hits.length ? <Text style={[T.small, { paddingVertical: S.md }]}>{hits.length} {hits.length === 1 ? 'person' : 'people'}</Text> : undefined
          }
          ListEmptyComponent={
            searching ? undefined : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={C.ink3} />
                <Text style={T.h3}>No one matches “{query}”</Text>
                <Text style={[T.small, { textAlign: 'center' }]}>Try a skill, a company type, a neighborhood or a language.</Text>
              </View>
            )
          }
          renderItem={({ item: { person: p, matched } }) => {
            const d = distanceMi(origin, p.coord);
            const strong = matchStrength(p, app.prefs) === 'strong';
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id, d: String(d), from } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.bg2 }]}
              >
                <Avatar name={p.name} uri={p.photo} size={48} ring={strong} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                    {strong ? <Ionicons name="star" size={12} color={C.accent} accessibilityLabel="Strong match" /> : null}
                  </View>
                  <Text style={T.small} numberOfLines={1}>{p.role} · {p.org}</Text>
                  <Text style={styles.matched} numberOfLines={1}>Matched: {matched.slice(0, 3).join(', ')}</Text>
                </View>
                <Text style={styles.dist}>{p.areaHidden ? 'Public places' : approxDistance(d).replace('about ', '')}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: S.xs, paddingHorizontal: S.sm, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.line },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg2, borderRadius: 12, paddingHorizontal: S.md, minHeight: 44 },
  input: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
  chipText: { fontSize: 14, color: C.ink, fontWeight: '500' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 52, paddingHorizontal: 4, borderRadius: R.md },
  fieldIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  name: { fontSize: 16, fontWeight: '700', color: C.ink, flexShrink: 1 },
  matched: { fontSize: 12, color: C.accent, fontWeight: '600' },
  dist: { fontSize: 13, fontWeight: '600', color: C.ink2, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: S.sm, paddingVertical: S.xxl },
});

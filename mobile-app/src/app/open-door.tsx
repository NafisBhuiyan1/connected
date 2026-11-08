import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Chip, ChipGroup, Choice, KV, Note, Segmented } from '@/components/ui';
import { AUDIENCES, VENUES, audienceLabel, fieldLabel, statusLabel, venueById } from '@/data/options';
import type { AudienceId, OpenDoor } from '@/data/types';
import { fullName } from '@/lib/match';
import { fmtTime, fmtWindow } from '@/lib/time';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';

const DEFAULT_TOPICS = ['Getting a first job', 'Resume feedback', 'Interview practice', 'Switching careers', 'What my job is really like'];

function startSlots(day: 'today' | 'tomorrow'): number[] {
  const base = new Date();
  if (day === 'tomorrow') base.setDate(base.getDate() + 1);
  const slots: number[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m).getTime();
      if (t > Date.now() - 30 * 60_000) slots.push(t);
    }
  }
  return slots;
}

export default function OpenDoorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const existing = app.doors.find((d) => d.id === id);

  const initialDay: 'today' | 'tomorrow' = existing
    ? new Date(existing.start).getDate() === new Date().getDate() ? 'today' : 'tomorrow'
    : startSlots('today').length ? 'today' : 'tomorrow';
  const [day, setDay] = useState<'today' | 'tomorrow'>(initialDay);
  const slots = useMemo(() => startSlots(day), [day]);
  const [venueId, setVenueId] = useState(existing?.venueId ?? VENUES[0].id);
  const [start, setStart] = useState<number>(existing?.start ?? slots[0] ?? 0);
  const [hours, setHours] = useState(existing ? Math.max(1, Math.round((existing.end - existing.start) / 3_600_000)) : 2);
  const [lengthMin, setLengthMin] = useState(existing?.lengthMin ?? 15);
  const [topics, setTopics] = useState<string[]>(existing?.topics ?? [DEFAULT_TOPICS[0]]);
  const [custom, setCustom] = useState('');
  const [audience, setAudience] = useState<AudienceId[]>(existing?.audience ?? ['students', 'early']);
  const [review, setReview] = useState(false);
  const [err, setErr] = useState('');

  const effectiveStart = slots.includes(start) ? start : slots[0] ?? start;
  const end = effectiveStart + hours * 3_600_000;
  const venue = venueById(venueId);
  const topicOptions = [...new Set([...DEFAULT_TOPICS, ...app.prefs.skills.slice(0, 3), ...topics])];

  const toggleAudience = (a: AudienceId) => {
    if (a === 'anyone') return setAudience(audience.includes('anyone') ? [] : ['anyone']);
    const rest = audience.filter((x) => x !== 'anyone');
    setAudience(rest.includes(a) ? rest.filter((x) => x !== a) : [...rest, a]);
  };

  const goReview = () => {
    if (!slots.length) return setErr('There are no start times left today. Choose tomorrow.');
    if (!topics.length) return setErr('Pick at least one topic you can talk about.');
    if (!audience.length) return setErr('Choose who can see this Open Door.');
    setErr('');
    setReview(true);
  };

  const publish = () => {
    const door: OpenDoor = { id: existing?.id ?? `door-${Date.now()}`, venueId, start: effectiveStart, end, lengthMin, topics, audience };
    app.saveDoor(door);
    router.back();
  };

  if (review) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: insets.bottom + S.xxl }}>
        <View style={{ gap: S.sm }}>
          <Text style={T.title} accessibilityRole="header">Review before you post</Text>
          <Text style={T.muted}>This is exactly what matching people will see.</Text>
        </View>
        <View style={styles.preview}>
          <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
            <Avatar name={fullName(app.profile) || 'You'} uri={app.profile.photoUri} />
            <View>
              <Text style={T.h3}>{fullName(app.profile) || 'You'}</Text>
              <Text style={T.small}>{statusLabel(app.profile.status)} · {fieldLabel(app.prefs.field)}</Text>
            </View>
          </View>
          <KV k="Where" v={`${venue.name}, ${venue.area}`} />
          <KV k="" v={venue.detail} />
          <KV k="When" v={fmtWindow(effectiveStart, end)} />
          <KV k="Length" v={`${lengthMin} minutes per person`} />
          <KV k="Topics" v={topics.join(', ')} />
        </View>
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>Who can see the place and time</Text>
          <Text style={T.body}>{audience.map(audienceLabel).join(', ')}</Text>
          <Text style={T.small}>Everyone else only sees that you’re offering conversations, without the venue.</Text>
        </View>
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>Never shared</Text>
          {['Your live location, before or after', 'Your home or work address', 'Who else you’re talking to'].map((x) => (
            <Text key={x} style={T.small}>{'•'}  {x}</Text>
          ))}
        </View>
        <Note icon="time-outline">It comes down automatically at {fmtTime(end)}. You can end it early from your profile.</Note>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button label="Back" variant="secondary" onPress={() => setReview(false)} />
          <Button label={existing ? 'Save changes' : 'Post Open Door'} onPress={publish} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: insets.bottom + S.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: S.sm }}>
          <Text style={T.title} accessibilityRole="header">{existing ? 'Edit your Open Door' : 'Offer a short conversation'}</Text>
          <Text style={T.muted}>Pick a public place and a window when you’re free. People who match can ask for a quick chat, and you decide each one.</Text>
        </View>

        <Block label="Where">
          <View style={{ gap: S.sm }}>
            {VENUES.map((v) => (
              <Choice key={v.id} title={v.name} hint={`${v.area} · ${v.detail}`} selected={venueId === v.id} onPress={() => setVenueId(v.id)} />
            ))}
          </View>
        </Block>

        <Block label="Day">
          <Segmented label="Day" options={[{ id: 'today' as const, label: 'Today' }, { id: 'tomorrow' as const, label: 'Tomorrow' }]} value={day} onChange={(d) => { setDay(d); setStart(startSlots(d)[0] ?? 0); }} />
        </Block>

        <Block label="Starting at">
          {slots.length ? (
            <View style={styles.chips}>
              {slots.map((t) => <Chip key={t} label={fmtTime(t)} selected={t === effectiveStart} onPress={() => setStart(t)} />)}
            </View>
          ) : (
            <Text style={T.small}>No start times left today. Choose tomorrow.</Text>
          )}
        </Block>

        <Block label="For how long">
          <Segmented label="Window" options={[1, 2, 3].map((h) => ({ id: h, label: `${h} hr` }))} value={hours} onChange={setHours} />
          {slots.length ? <Text style={T.small}>Until {fmtTime(end)}</Text> : null}
        </Block>

        <Block label="Time per person">
          <Segmented label="Time per person" options={[10, 15, 20, 30].map((m) => ({ id: m, label: `${m} min` }))} value={lengthMin} onChange={setLengthMin} />
        </Block>

        <Block label="Topics you can talk about">
          <View style={styles.chips}>
            {topicOptions.map((t) => (
              <Chip key={t} label={t} selected={topics.includes(t)} onPress={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <TextInput value={custom} onChangeText={setCustom} placeholder="Add your own topic" placeholderTextColor={C.ink3} style={styles.input} accessibilityLabel="Add your own topic" />
            <Button label="Add" variant="secondary" small onPress={() => { const t = custom.trim(); if (t && !topics.includes(t)) setTopics([...topics, t]); setCustom(''); }} />
          </View>
        </Block>

        <Block label="Who can see where you'll be">
          <ChipGroup options={AUDIENCES} selected={audience} onToggle={toggleAudience} />
          <Text style={T.small}>Only these people see the venue and time.</Text>
        </Block>

        {err ? <Text style={styles.err} accessibilityRole="alert">{err}</Text> : null}
        <Button label="Review what will be shared" onPress={goReview} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <Text style={T.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line2, borderRadius: R.sm, paddingHorizontal: S.md, fontSize: 16, color: C.ink },
  preview: { gap: S.sm, padding: S.lg, borderRadius: R.md, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line2 },
  err: { color: C.bad, fontWeight: '600' },
});

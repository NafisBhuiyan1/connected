import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { AuthForm } from '@/components/AuthForm';
import { Grid, Label, OptionCard, StepTitle, Tile } from '@/components/OnboardingParts';
import { Avatar, Button, Chip, IconButton, Segmented } from '@/components/ui';
import { AVAILABILITY, CHALLENGES, CHARLOTTE_CENTER, DIETS, FIELDS, FOODS, GOALS, INTERESTS, LANGUAGES, MEET_MODES, SKILLS, STATUSES, TRAITS, TRAVEL_MI } from '@/data/options';
import { dataSource } from '@/data/source';
import type { NearbyPerson } from '@/data/types';
import { fullName, matchPoints, matchScore } from '@/lib/match';
import { pickProfilePhoto } from '@/lib/photo';
import { useApp } from '@/state/AppState';
import { C, R, S, T } from '@/theme';

type StepId = 'status' | 'field' | 'goals' | 'challenges' | 'people' | 'interests' | 'meet' | 'food' | 'privacy' | 'profile';
const PREF_STEPS: StepId[] = ['status', 'field', 'goals', 'challenges', 'people', 'interests', 'meet', 'food', 'privacy'];
const ALL_STEPS: StepId[] = [...PREF_STEPS, 'profile'];
const SECTION: Record<StepId, string> = {
  status: 'About you', field: 'About you', goals: 'What you need', challenges: 'What you need', people: 'What you need',
  interests: 'Your interests', meet: 'Meeting up', food: 'Meeting up', privacy: 'Meeting up', profile: 'Your profile',
};
const MAX_CHALLENGES = 3;

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Onboarding() {
  const { edit: editParam } = useLocalSearchParams<{ edit?: 'prefs' | 'profile' | 'account' }>();
  // "account" opens just the create-account step (from the Profile tab).
  const accountOnly = editParam === 'account';
  const edit = accountOnly ? undefined : editParam;
  const app = useApp();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const steps = edit === 'prefs' ? PREF_STEPS : edit === 'profile' ? (['profile'] as StepId[]) : ALL_STEPS;
  const [phase, setPhase] = useState<'welcome' | 'steps' | 'account' | 'done'>(accountOnly ? 'account' : edit ? 'steps' : 'welcome');
  const [confirmNote, setConfirmNote] = useState('');
  const [i, setI] = useState(0);
  const [err, setErr] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const { prefs, profile, setPrefs, setProfile } = app;
  const step = steps[i];

  const go = (n: number) => {
    setErr('');
    setI(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  function validate(): string {
    if (step === 'status' && !profile.status) return 'Pick the one that fits best.';
    if (step === 'field' && !prefs.field) return 'Pick the field you want to grow in.';
    if (step === 'goals' && !prefs.goals.length) return 'Pick at least one thing you’re hoping to find.';
    if (step === 'goals' && prefs.goals.includes('other') && !prefs.goalOther.trim()) return 'Tell us briefly what you’re looking for.';
    if (step === 'challenges' && !prefs.challenges.length) return 'Pick at least one. It’s the biggest factor in who we suggest.';
    if (step === 'profile' && !profile.name.trim()) return 'Add your first name.';
    if (step === 'profile' && !profile.lastName.trim()) return 'Add your last name. It helps people recognize you when you meet.';
    return '';
  }

  function next() {
    const e = validate();
    if (e) return setErr(e);
    if (i < steps.length - 1) return go(i + 1);
    if (edit) return router.back();
    // With a backend, save everything to an account so other people can find you.
    if (app.backendEnabled && !app.session) return setPhase('account');
    app.finishOnboarding();
    setPhase('done');
  }

  function back() {
    if (i === 0) return edit ? router.back() : setPhase('welcome');
    go(i - 1);
  }

  async function choosePhoto() {
    const res = await pickProfilePhoto(profile.photoUri);
    if (!res) return;
    if ('error' in res) return Alert.alert('Can’t open photos', res.error);
    setProfile({ photoUri: res.uri });
  }

  if (phase === 'welcome') {
    return (
      <Welcome
        onStart={() => setPhase('steps')}
        onSample={() => { app.loadSample(); router.replace('/'); }}
        onSignIn={app.backendEnabled ? () => router.push('/auth') : undefined}
      />
    );
  }
  if (phase === 'done') return <Done />;
  if (phase === 'account') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.xl, gap: S.xl }} keyboardShouldPersistTaps="handled">
          <IconButton icon="chevron-back" label="Back" onPress={() => (accountOnly ? router.back() : setPhase('steps'))} style={{ marginLeft: -S.sm }} />
          <StepTitle
            icon="person-add-outline"
            section="Your account"
            title="Save your profile"
            sub="Create an account so people nearby can find you and your requests and chats reach real people. Your email is never shown to anyone."
          />
          {confirmNote ? (
            <View style={styles.notice}>
              <Ionicons name="mail-outline" size={22} color={C.accent} />
              <Text style={[T.body, { flex: 1, fontSize: 15, lineHeight: 21 }]}>{confirmNote}</Text>
            </View>
          ) : null}
          <AuthForm
            mode={confirmNote ? 'signin' : 'signup'}
            onDone={(r) => {
              if (r.mode === 'signup' && r.needsConfirmation) {
                setConfirmNote('Check your email and tap the confirmation link, then sign in below.');
                return;
              }
              if (accountOnly) return router.back();
              app.finishOnboarding();
              setPhase('done');
            }}
          />
          {accountOnly ? null : (
            <Pressable
              onPress={() => { app.finishOnboarding(); setPhase('done'); }}
              accessibilityRole="button"
              style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={T.small}>Skip for now (you&apos;ll only see demo people)</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const optional = step === 'people' || step === 'interests' || step === 'food';
  const last = i === steps.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + S.sm }]}>
        <IconButton icon={edit && i === 0 ? 'close' : 'chevron-back'} label={edit && i === 0 ? 'Cancel' : 'Back'} onPress={back} />
        <View style={styles.progress} accessibilityLabel={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((s, k) => <View key={s} style={[styles.bar, k <= i && { backgroundColor: C.accent }]} />)}
        </View>
        <Text style={[T.small, { width: 44, textAlign: 'right' }]}>{i + 1}/{steps.length}</Text>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: 140, gap: S.xl }} keyboardShouldPersistTaps="handled">
        {step === 'status' && (
          <>
            <StepTitle icon="person-outline" section={SECTION.status} title="Where are you right now?" sub="This helps us find people who were once where you are." />
            <View style={{ gap: S.sm }}>
              {STATUSES.map((s) => (
                <OptionCard key={s.id} icon={s.icon} title={s.label} hint={s.hint} selected={profile.status === s.id} onPress={() => { setProfile({ status: s.id }); setErr(''); }} />
              ))}
            </View>
            {profile.status === 'changing' && (
              <View style={{ gap: S.md }}>
                <Label>Which field are you coming from?</Label>
                <View style={styles.chips}>
                  {FIELDS.map((f) => <Chip key={f.id} label={f.label} selected={prefs.fromField === f.id} onPress={() => setPrefs({ fromField: prefs.fromField === f.id ? null : f.id })} />)}
                </View>
              </View>
            )}
          </>
        )}

        {step === 'field' && (
          <>
            <StepTitle icon="compass-outline" section={SECTION.field} title="Which field do you want to grow in?" sub={profile.status === 'changing' ? 'The one you’re moving into.' : 'You can change this anytime.'} />
            <Grid>
              {FIELDS.map((f) => <Tile key={f.id} icon={f.icon} label={f.label} selected={prefs.field === f.id} onPress={() => { setPrefs({ field: f.id }); setErr(''); }} />)}
            </Grid>
          </>
        )}

        {step === 'goals' && (
          <>
            <StepTitle icon="sparkles-outline" section={SECTION.goals} title="What are you hoping to find?" sub="Pick as many as you like." />
            <Segmented
              label="I'm here to"
              options={[{ id: 'seeking' as const, label: 'Get help' }, { id: 'offering' as const, label: 'Give help' }, { id: 'both' as const, label: 'Both' }]}
              value={prefs.mode}
              onChange={(m) => setPrefs({ mode: m })}
            />
            <View style={{ gap: S.sm }}>
              {GOALS.map((g) => (
                <OptionCard key={g.id} multi icon={g.icon} title={g.label} hint={g.hint} selected={prefs.goals.includes(g.id)} onPress={() => { setPrefs({ goals: toggle(prefs.goals, g.id) }); setErr(''); }} />
              ))}
            </View>
            {prefs.goals.includes('other') && (
              <TextInput value={prefs.goalOther} onChangeText={(t) => setPrefs({ goalOther: t })} placeholder="e.g. A study group for the CPA exam" placeholderTextColor={C.ink3} style={styles.input} accessibilityLabel="What are you looking for?" />
            )}
          </>
        )}

        {step === 'challenges' && (
          <>
            <StepTitle icon="trail-sign-outline" section={SECTION.challenges} title="What’s in your way right now?" sub="Pick up to three. We’ll put people first who have helped others with exactly this." />
            <View style={{ gap: S.sm }}>
              {CHALLENGES.map((c) => {
                const on = prefs.challenges.includes(c.id);
                return (
                  <OptionCard
                    key={c.id}
                    multi
                    icon={c.icon}
                    title={c.label}
                    selected={on}
                    onPress={() => {
                      if (!on && prefs.challenges.length >= MAX_CHALLENGES) return setErr(`You can pick up to ${MAX_CHALLENGES}. Unselect one to swap.`);
                      setErr('');
                      setPrefs({ challenges: toggle(prefs.challenges, c.id) });
                    }}
                  />
                );
              })}
            </View>
            <Text style={T.small}>{prefs.challenges.length} of {MAX_CHALLENGES} picked</Text>
          </>
        )}

        {step === 'people' && (
          <>
            <StepTitle icon="people-outline" section={SECTION.people} title="Who would you click with?" sub="People often learn the most from someone who shares their story. Pick any that matter to you." />
            <View style={{ gap: S.sm }}>
              {TRAITS.map((t) => (
                <OptionCard key={t.id} multi icon={t.icon} title={t.label} hint={t.hint} selected={prefs.wantTraits.includes(t.id)} onPress={() => setPrefs({ wantTraits: toggle(prefs.wantTraits, t.id) })} />
              ))}
            </View>
            <View style={{ gap: S.md }}>
              <Label>Languages you&apos;re comfortable in</Label>
              <View style={styles.chips}>
                {LANGUAGES.map((l) => <Chip key={l} label={l} selected={prefs.languages.includes(l)} onPress={() => setPrefs({ languages: toggle(prefs.languages, l) })} />)}
              </View>
            </View>
          </>
        )}

        {step === 'interests' && (
          <>
            <StepTitle icon="heart-outline" section={SECTION.interests} title="What are you into?" sub="Shared interests make a first conversation easier." />
            <View style={{ gap: S.md }}>
              <Label right={<Text style={T.small}>{prefs.interests.length} picked</Text>}>Interests</Label>
              <View style={styles.chips}>
                {INTERESTS.map((x) => <Chip key={x} label={x} selected={prefs.interests.includes(x)} onPress={() => setPrefs({ interests: toggle(prefs.interests, x) })} />)}
              </View>
            </View>
            <View style={{ gap: S.md }}>
              <Label right={<Text style={T.small}>{prefs.skills.length} picked</Text>}>Skills you have or are learning</Label>
              <View style={styles.chips}>
                {[...SKILLS, ...prefs.skills.filter((s) => !SKILLS.includes(s))].map((x) => <Chip key={x} label={x} selected={prefs.skills.includes(x)} onPress={() => setPrefs({ skills: toggle(prefs.skills, x) })} />)}
              </View>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput
                  value={customSkill}
                  onChangeText={setCustomSkill}
                  placeholder="Add another skill"
                  placeholderTextColor={C.ink3}
                  style={[styles.input, { flex: 1 }]}
                  accessibilityLabel="Add another skill"
                  returnKeyType="done"
                  onSubmitEditing={() => { const s = customSkill.trim(); if (s && !prefs.skills.includes(s)) setPrefs({ skills: [...prefs.skills, s] }); setCustomSkill(''); }}
                />
                <Button label="Add" variant="secondary" onPress={() => { const s = customSkill.trim(); if (s && !prefs.skills.includes(s)) setPrefs({ skills: [...prefs.skills, s] }); setCustomSkill(''); }} />
              </View>
            </View>
          </>
        )}

        {step === 'meet' && (
          <>
            <StepTitle icon="cafe-outline" section={SECTION.meet} title="How do you like to meet?" />
            <Grid>
              {MEET_MODES.map((m) => <Tile key={m.id} icon={m.icon} label={m.label} selected={prefs.meetMode === m.id} onPress={() => setPrefs({ meetMode: m.id })} />)}
            </Grid>
            <View style={{ gap: S.md }}>
              <Label>How far would you travel?</Label>
              <Segmented label="Travel distance" options={TRAVEL_MI.map((m) => ({ id: m, label: `${m} mi` }))} value={prefs.travelMi} onChange={(v) => setPrefs({ travelMi: v })} />
            </View>
            <View style={{ gap: S.md }}>
              <Label>When are you usually free?</Label>
              <View style={styles.chips}>
                {AVAILABILITY.map((a) => <Chip key={a.id} label={a.label} selected={prefs.availability.includes(a.id)} onPress={() => setPrefs({ availability: toggle(prefs.availability, a.id) })} />)}
              </View>
            </View>
          </>
        )}

        {step === 'food' && (
          <>
            <StepTitle
              icon="restaurant-outline"
              section={SECTION.food}
              title="What would you grab together?"
              sub="When you connect with someone, we'll suggest spots halfway between you that serve something you both like."
            />
            <Grid>
              {FOODS.map((fd) => (
                <Tile key={fd.id} multi icon={fd.icon} label={fd.label} selected={prefs.foods.includes(fd.id)} onPress={() => setPrefs({ foods: toggle(prefs.foods, fd.id) })} />
              ))}
            </Grid>
            <View style={{ gap: S.md }}>
              <Label right={<Text style={T.small}>Optional</Text>}>Any dietary needs?</Label>
              <View style={styles.chips}>
                {DIETS.map((d) => <Chip key={d.id} label={d.label} selected={prefs.diet.includes(d.id)} onPress={() => setPrefs({ diet: toggle(prefs.diet, d.id) })} />)}
              </View>
              <Text style={T.small}>We use these to favor places that suit you. Others only see them when you meet.</Text>
            </View>
          </>
        )}

        {step === 'privacy' && (
          <>
            <StepTitle icon="shield-checkmark-outline" section={SECTION.privacy} title="You decide what people see" sub="Change any of this later in your profile." />
            <View style={styles.notice}>
              <Ionicons name="navigate-circle-outline" size={22} color={C.accent} />
              <Text style={[T.body, { flex: 1, fontSize: 15, lineHeight: 21 }]}>
                We use your location once, while the app is open, to center the map. It&apos;s never tracked in the background, and nobody sees where you are.
              </Text>
            </View>
            <View style={{ gap: S.sm }}>
              <Label>When you meet someone, share</Label>
              <OptionCard icon="location-outline" title="My neighborhood" hint="Like “South End”. Never your address." selected={prefs.shareMode === 'area'} onPress={() => setPrefs({ shareMode: 'area' })} />
              <OptionCard icon="business-outline" title="Only a public meeting place" hint="A library, café or campus spot you pick together." selected={prefs.shareMode === 'public'} onPress={() => setPrefs({ shareMode: 'public' })} />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={T.label}>Let people nearby find me</Text>
                <Text style={T.small}>Only people who match you. You can still browse with this off.</Text>
              </View>
              <Switch value={prefs.discoverable} onValueChange={(v) => setPrefs({ discoverable: v })} trackColor={{ true: C.accent, false: C.line2 }} accessibilityLabel="Let people nearby find me" />
            </View>
          </>
        )}

        {step === 'profile' && (
          <>
            <StepTitle icon="happy-outline" section={SECTION.profile} title={edit ? 'Your profile' : 'Last step: say hello'} sub="People see this when you reach out. Short and real beats polished." />
            <View style={{ alignItems: 'center', gap: S.sm }}>
              <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel={profile.photoUri ? 'Change profile photo' : 'Add a profile photo'} style={styles.photo}>
                {profile.photoUri || profile.name.trim() ? (
                  <Avatar name={fullName(profile) || '?'} uri={profile.photoUri} size={104} />
                ) : (
                  <Ionicons name="camera-outline" size={34} color={C.accent} />
                )}
                <View style={styles.photoBadge}><Ionicons name={profile.photoUri ? 'pencil' : 'add'} size={16} color={C.white} /></View>
              </Pressable>
              <Text style={T.small}>{profile.photoUri ? 'Tap to change' : 'Add a photo (optional, but people reply more)'}</Text>
              {profile.photoUri ? <Button label="Remove photo" variant="quiet" small onPress={() => setProfile({ photoUri: null })} /> : null}
            </View>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Field label="First name">
                  <TextInput value={profile.name} onChangeText={(t) => { setProfile({ name: t }); setErr(''); }} placeholder="Alex" placeholderTextColor={C.ink3} style={styles.input} autoComplete="given-name" textContentType="givenName" autoCapitalize="words" accessibilityLabel="First name" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name">
                  <TextInput value={profile.lastName} onChangeText={(t) => { setProfile({ lastName: t }); setErr(''); }} placeholder="Rivera" placeholderTextColor={C.ink3} style={styles.input} autoComplete="family-name" textContentType="familyName" autoCapitalize="words" accessibilityLabel="Last name" />
                </Field>
              </View>
            </View>
            <Field label="School or workplace" hint="Optional">
              <TextInput value={profile.org} onChangeText={(t) => setProfile({ org: t })} placeholder="UNC Charlotte" placeholderTextColor={C.ink3} style={styles.input} accessibilityLabel="School or workplace, optional" />
            </Field>
            <Field label="A little about you" hint={`${profile.intro.length}/280`}>
              <TextInput
                value={profile.intro}
                onChangeText={(t) => setProfile({ intro: t.slice(0, 280) })}
                placeholder="What you're working toward, in your own words."
                placeholderTextColor={C.ink3}
                style={[styles.input, styles.area]}
                multiline
                accessibilityLabel="A little about you"
              />
            </Field>
            {prefs.mode !== 'seeking' && (
              <Field label="What could you help others with?" hint="Optional">
                <TextInput
                  value={profile.offer}
                  onChangeText={(t) => setProfile({ offer: t.slice(0, 200) })}
                  placeholder="e.g. Resume reviews for people getting into healthcare"
                  placeholderTextColor={C.ink3}
                  style={[styles.input, styles.area, { minHeight: 80 }]}
                  multiline
                  accessibilityLabel="What could you help others with?"
                />
              </Field>
            )}
          </>
        )}

        {err ? <Text style={styles.err} accessibilityRole="alert">{err}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
        {optional ? <Button label="Skip" variant="quiet" onPress={() => go(i + 1)} /> : null}
        <Button label={last ? (edit ? 'Save' : 'Finish') : 'Continue'} icon={last ? undefined : 'arrow-forward'} onPress={next} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Welcome({ onStart, onSample, onSignIn }: { onStart: () => void; onSample: () => void; onSignIn?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.accent }}>
      <LinearGradient colors={['#7652E6', '#5B35C9', '#43249A']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { paddingTop: insets.top + S.xl }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={styles.heroWord}>Connected</Text>
          <View style={styles.heroDot} />
        </View>
        <NetworkArt />
      </LinearGradient>
      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl, gap: S.xl }}>
        <View style={{ gap: S.md }}>
          <Text style={[T.title, { fontSize: 30, lineHeight: 36 }]} accessibilityRole="header">Find the right people around you.</Text>
          <Text style={[T.muted, { fontSize: 16, lineHeight: 24 }]}>
            Not everyone has a parent, professor or old boss to call for career advice. Connected shows you people nearby who&apos;ve offered to help, and makes the first message easier.
          </Text>
        </View>
        <View style={{ gap: S.lg }}>
          {([
            ['chatbubbles-outline', 'Tell us what you need', 'About 2 minutes. The more honest, the better your matches.'],
            ['map-outline', 'Meet people nearby', 'Only people who opted in, shown at a rough area.'],
            ['paper-plane-outline', 'Reach out, your way', 'We suggest an opener. You edit it and decide when to send.'],
          ] as const).map(([icon, t, d]) => (
            <View key={t} style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
              <View style={styles.howIcon}><Ionicons name={icon} size={20} color={C.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={T.label}>{t}</Text>
                <Text style={T.small}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ gap: S.sm }}>
          <Button label="Get started" icon="arrow-forward" onPress={onStart} />
          {onSignIn ? <Button label="I already have an account" variant="secondary" onPress={onSignIn} /> : null}
          <Button label="Look around with a sample profile" variant="quiet" onPress={onSample} />
          <Text style={[T.small, { textAlign: 'center' }]}>Demo people are marked as demo profiles.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** Static version of the intro's network, for the welcome header. */
function NetworkArt() {
  const n = [[130, 70, 10], [60, 36, 6], [210, 30, 7], [228, 100, 6], [150, 128, 6.5], [46, 108, 5], [102, 14, 4.5]] as const;
  const e = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 4]] as const;
  return (
    <Svg width={270} height={150} viewBox="0 0 270 150" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={130} cy={70} r={30} fill="none" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={1.2} />
      {e.map(([a, b], k) => <Line key={k} x1={n[a][0]} y1={n[a][1]} x2={n[b][0]} y2={n[b][1]} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.3} />)}
      {n.map(([x, y, r], k) => <Circle key={k} cx={x} cy={y} r={r} fill={k === 0 ? '#FFFFFF' : '#D9CCFF'} />)}
    </Svg>
  );
}

/** Shown once after onboarding: the best matches, so the payoff is immediate. */
function Done() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [top, setTop] = useState<NearbyPerson[] | null>(null);
  const [good, setGood] = useState(0);
  const { prefs } = app;

  useEffect(() => {
    let live = true;
    dataSource.listNearbyPeople(CHARLOTTE_CENTER, 25).then((ps) => {
      if (!live) return;
      const ranked = [...ps].sort((a, b) => matchScore(b, prefs) - matchScore(a, prefs));
      setGood(ranked.filter((p) => matchScore(p, prefs) >= 4.5).length);
      setTop(ranked.slice(0, 3));
    });
    return () => { live = false; };
  }, [prefs]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['#7652E6', '#5B35C9']} style={[styles.doneHero, { paddingTop: insets.top + S.xxl }]}>
        <View style={styles.doneCheck}><Ionicons name="checkmark" size={30} color={C.accent} /></View>
        <Text style={styles.doneTitle} accessibilityRole="header">You&apos;re all set{app.profile.name ? `, ${app.profile.name.split(' ')[0]}` : ''}.</Text>
        <Text style={styles.doneSub}>{top ? `${good || top.length} people in Charlotte fit what you told us.` : 'Finding your people…'}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: insets.bottom + S.xl }}>
        <Text style={T.h2}>Your top matches</Text>
        {(top ?? []).map((p) => {
          const pts = matchPoints(p, prefs).slice(0, 2);
          return (
            <View key={p.id} style={styles.matchRow}>
              <Avatar name={p.name} uri={p.photo} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={T.h3}>{p.name}</Text>
                <Text style={T.small} numberOfLines={1}>{p.role} · {p.areaName}</Text>
                {pts.length ? <Text style={[T.small, { color: C.accent, fontWeight: '600' }]} numberOfLines={1}>{pts.map((x) => x.text).join(' · ')}</Text> : null}
              </View>
            </View>
          );
        })}
        <Text style={T.small}>These are demo profiles. You&apos;ll see everyone on the map, best matches first.</Text>
        <Button label="Open the map" icon="map-outline" onPress={() => router.replace('/')} />
      </ScrollView>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Label right={hint ? <Text style={T.small}>{hint}</Text> : undefined}>{label}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', gap: S.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.sm },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  input: { minHeight: 50, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md, fontSize: 16, color: C.ink, backgroundColor: C.bg },
  area: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  notice: { flexDirection: 'row', gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.accentSoft },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line },
  err: { color: C.bad, fontWeight: '600', fontSize: 15 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.md, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line },
  photo: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: C.accent, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentSoft },
  photoBadge: { position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: S.lg, paddingBottom: 44 },
  heroWord: { color: C.white, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  heroDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D9CCFF', marginLeft: 2, marginBottom: 8 },
  sheet: { flex: 1, marginTop: -24, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  howIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  doneHero: { alignItems: 'center', gap: S.md, paddingHorizontal: S.xl, paddingBottom: S.xxl },
  doneCheck: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: C.white, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  doneSub: { color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center' },
  matchRow: { flexDirection: 'row', gap: S.md, alignItems: 'center', padding: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line },
});

import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { CHALLENGES, FIELDS, GOALS, foodLabel, venueById } from '@/data/options';
import type { ChallengeId, OpenDoor, Person, Prefs, Profile, TraitId } from '@/data/types';

export type DoorState = 'live' | 'upcoming' | 'expired' | 'ended';

export function doorState(d: OpenDoor, now = Date.now()): DoorState {
  if (d.endedAt) return 'ended';
  if (now > d.end) return 'expired';
  return now >= d.start ? 'live' : 'upcoming';
}
export const doorActive = (d?: OpenDoor) => !!d && ['live', 'upcoming'].includes(doorState(d));

/** The exact venue is only shown when the viewer matches who the host chose to share with. */
export function canSeeDoor(d: OpenDoor, host: Person, prefs: Prefs, profile: Profile): boolean {
  return d.audience.some((a) => {
    if (a === 'anyone') return true;
    if (a === 'students') return profile.status === 'student';
    if (a === 'early') return profile.status === 'early';
    if (a === 'changing') return profile.status === 'changing' || profile.status === 'between';
    if (a === 'same-field') return prefs.field === host.field;
    return false;
  });
}

const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());
export const sharedInterests = (p: Person, prefs: Prefs) => p.interests.filter((i) => lower(prefs.interests).includes(i.toLowerCase()));
export const sharedSkills = (p: Person, prefs: Prefs) => p.skills.filter((s) => lower(prefs.skills).includes(s.toLowerCase()));
export const goalOverlap = (p: Person, prefs: Prefs) => prefs.goals.filter((g) => p.offers.includes(g));
export const challengeOverlap = (p: Person, prefs: Prefs) => prefs.challenges.filter((c) => p.helpTags.includes(c));
export const traitOverlap = (p: Person, prefs: Prefs) => prefs.wantTraits.filter((t) => p.traits.includes(t));
export const sharedLanguages = (p: Person, prefs: Prefs) => p.languages.filter((l) => l !== 'English' && prefs.languages.includes(l));

type Icon = ComponentProps<typeof Ionicons>['name'];
export type MatchPoint = { icon: Icon; text: string };

const TRAIT_HAS: Record<TraitId, (p: Person) => string> = {
  firstgen: () => 'First-gen professional',
  immigrant: () => 'Built a career after moving here',
  switcher: () => 'Changed careers',
  senior: (p) => `${p.yearsExp} years in the field`,
  near: (p) => (p.yearsExp <= 1 ? 'Just went through it' : `${p.yearsExp} years in`),
  hiring: () => 'Hires for their team',
};
const TRAIT_ICON: Record<TraitId, Icon> = {
  firstgen: 'flag-outline', immigrant: 'airplane-outline', switcher: 'swap-horizontal-outline', senior: 'ribbon-outline', near: 'footsteps-outline', hiring: 'briefcase-outline',
};

/** Short, specific notes on why this person fits what you told us. Most relevant first. */
export function matchPoints(p: Person, prefs: Prefs): MatchPoint[] {
  const out: MatchPoint[] = [];
  for (const c of challengeOverlap(p, prefs).slice(0, 2)) {
    const ch = CHALLENGES.find((x) => x.id === c)!;
    out.push({ icon: ch.icon, text: `Helps with ${ch.theyHelp}` });
  }
  for (const t of traitOverlap(p, prefs).slice(0, 2)) out.push({ icon: TRAIT_ICON[t], text: TRAIT_HAS[t](p) });
  if (prefs.field === p.field) out.push({ icon: 'briefcase-outline', text: `Works in ${fieldLabelShort(p.field)}` });
  const lang = sharedLanguages(p, prefs)[0];
  if (lang) out.push({ icon: 'language-outline', text: `Speaks ${lang}` });
  const g = goalOverlap(p, prefs)[0];
  if (g && g !== 'other') out.push({ icon: 'hand-left-outline', text: `Open to ${GOALS.find((x) => x.id === g)!.label.toLowerCase()}` });
  const si = sharedInterests(p, prefs)[0];
  if (si) out.push({ icon: 'heart-outline', text: `Also into ${si.toLowerCase()}` });
  const food = prefs.foods.find((f) => p.foods.includes(f));
  if (food) out.push({ icon: 'restaurant-outline', text: `Both like ${foodLabel(food).toLowerCase()}` });
  return out;
}

export function matchScore(p: Person, prefs: Prefs): number {
  return (
    (prefs.field === p.field ? 3 : 0) +
    Math.min(2, challengeOverlap(p, prefs).length) * 2.5 +
    Math.min(2, traitOverlap(p, prefs).length) * 2 +
    goalOverlap(p, prefs).length * 1 +
    sharedLanguages(p, prefs).length * 1.5 +
    sharedInterests(p, prefs).length * 0.75 +
    prefs.foods.filter((f) => p.foods.includes(f)).length * 0.4 +
    sharedSkills(p, prefs).length * 0.25
  );
}

/** A coarse label for how well someone fits, used for the "Strong match" badge. */
export function matchStrength(p: Person, prefs: Prefs): 'strong' | 'good' | 'some' {
  const s = matchScore(p, prefs);
  return s >= 8 ? 'strong' : s >= 4.5 ? 'good' : 'some';
}

export type Tone = 'friendly' | 'direct' | 'short';

const HURDLE: Record<ChallengeId, string> = {
  start: 'figuring out where to start',
  network: 'that I don’t know anyone in the field yet',
  interviews: 'getting through interviews',
  resume: 'getting my resume noticed',
  credentials: 'getting my credentials recognized here',
  switching: 'explaining my career switch',
  hiring: 'understanding how hiring works here',
  skills: 'knowing what to learn next',
  team: 'finding people to build with',
};

export function conversationStarter(p: Person, prefs: Prefs, profile: Profile, tone: Tone, doorVisible: boolean): string {
  const first = firstName(p.name);
  const me = firstName(profile.name);
  const who = describeMe(profile, prefs, p);
  const intro = me ? `I'm ${me}${who ? `, ${who}` : ''}` : who ? `I'm ${who}` : "I'm new to the area";
  const goal = goalPhrase(p, prefs);
  const hurdleId = challengeOverlap(p, prefs)[0] ?? prefs.challenges[0];
  const hurdle = hurdleId ? HURDLE[hurdleId] : '';
  const door = doorVisible && p.door && doorActive(p.door) ? p.door : undefined;
  const ask = door
    ? `Would you be open to a ${door.lengthMin}-minute chat at your Open Door at ${venueById(door.venueId).name}?`
    : p.meets === 'video' || prefs.meetMode === 'video'
      ? 'Would you be open to a short video call sometime this week?'
      : 'Would you be open to grabbing a coffee somewhere public sometime soon?';

  if (tone === 'short') return `Hi ${first}, ${intro}. I'm ${goal}. ${ask} Thanks either way!`;
  if (tone === 'direct')
    return `Hi ${first}, ${intro}. I'm ${goal}${hurdle ? `, and the hardest part right now is ${hurdle}` : ''}. I'd really value your take on ${lowerFirst(p.helpsWith[0])}. ${ask}`;
  return `Hi ${first}, ${intro}. I'm ${goal}${hurdle ? `, and honestly the hardest part right now is ${hurdle}` : ''}. I saw that you ${p.hook}, and I'd love to hear how you got started. ${ask}`;
}

function goalPhrase(p: Person, prefs: Prefs): string {
  const g = goalOverlap(p, prefs)[0] ?? prefs.goals[0];
  switch (g) {
    case 'mentorship': return `looking for a mentor in ${p.fieldPhrase}`;
    case 'advice': return `looking for advice on a career in ${p.fieldPhrase}`;
    case 'peers': return `hoping to meet other people working in ${p.fieldPhrase}`;
    case 'collab': return 'looking for people to build a project with';
    case 'recruiting': return `trying to understand how hiring works in ${p.fieldPhrase}`;
    case 'other': return prefs.goalOther.trim() ? lowerFirst(prefs.goalOther.trim().replace(/\.$/, '')) : `hoping to learn more about ${p.fieldPhrase}`;
    default: return `hoping to learn more about ${p.fieldPhrase}`;
  }
}

function describeMe(profile: Profile, prefs: Prefs, p: Person): string {
  const org = profile.org.trim();
  const field = prefs.field ? fieldLabelShort(prefs.field) : '';
  switch (profile.status) {
    case 'student': return `a student${org ? ` at ${org}` : field ? ` interested in ${field}` : ''}`;
    case 'early': return `early in my career${field ? ` in ${field}` : ''}${org ? ` at ${org}` : ''}`;
    case 'experienced': return `working in ${field || 'my field'}${org ? ` at ${org}` : ''}`;
    case 'changing':
      return prefs.fromField && prefs.fromField !== p.field
        ? `moving from ${fieldLabelShort(prefs.fromField)} into ${field || p.fieldPhrase}`
        : `in the middle of a career change${field ? ` into ${field}` : ''}`;
    case 'between': return 'between jobs right now';
    default: return '';
  }
}

export const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? '';
/** "Alex Rivera" from a profile's first and last name. */
export const fullName = (p: { name: string; lastName?: string }) => [p.name.trim(), (p.lastName ?? '').trim()].filter(Boolean).join(' ');
export const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
export function fieldLabelShort(id: string): string {
  const l = FIELDS.find((f) => f.id === id)?.label ?? id;
  return l.split(' & ')[0].toLowerCase();
}

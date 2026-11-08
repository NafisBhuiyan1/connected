/**
 * The in-app assistant.
 *
 * - Built-in engine (default): understands common questions about finding people, writing a first
 *   message, where to meet, and how the app works. Runs on the phone, no AI service or key needed.
 * - Claude mode: when EXPO_PUBLIC_ASSISTANT_URL points at the proxy in /server, questions go to
 *   Claude through that proxy (which keeps the API key off the phone). If it fails, we fall back
 *   to the built-in engine.
 */
import { CHALLENGES, LANGUAGES, TRAITS, fieldLabel, foodLabel } from '@/data/options';
import type { ChallengeId, ConnectionRequest, FieldId, Person, Prefs, Profile, TraitId } from '@/data/types';
import { conversationStarter, firstName, fullName, matchPoints, matchScore, matchStrength } from './match';

export type AssistantAction = { label: string; href: '/search' | '/open-door' | '/(tabs)/events' | '/(tabs)/inbox' | '/(tabs)/profile' | '/onboarding' | '/person/[id]'; params?: Record<string, string> };
export type AssistantMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  people?: string[];
  actions?: AssistantAction[];
  suggestions?: string[];
  source?: 'built-in' | 'claude';
};

export type AssistantContext = {
  prefs: Prefs;
  profile: Profile;
  people: Person[];
  requests: ConnectionRequest[];
  blocked: string[];
};

export const STARTER_SUGGESTIONS = ['Who should I connect with?', 'Help me write a first message', 'Find a mentor in tech', 'How do Open Doors work?'];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
const uid = () => `a${Date.now()}${Math.round(Math.random() * 1e6)}`;

const FIELD_WORDS: Record<FieldId, string[]> = {
  finance: ['finance', 'bank', 'banking', 'accounting', 'cpa', 'investment', 'trading', 'fintech'],
  tech: ['tech', 'software', 'engineer', 'developer', 'coding', 'programming', 'cyber', 'security', 'qa', 'data science'],
  health: ['health', 'nurse', 'nursing', 'medical', 'hospital', 'clinical', 'doctor', 'healthcare'],
  energy: ['energy', 'utility', 'engineering', 'mechanical', 'project manag'],
  design: ['design', 'ux', 'product design', 'marketing', 'portfolio', 'creative'],
  public: ['public', 'government', 'nonprofit', 'city', 'county', 'workforce', 'apprentice'],
  education: ['education', 'teach', 'teacher', 'school', 'instructional'],
};
const TRAIT_WORDS: Record<TraitId, string[]> = {
  firstgen: ['first-gen', 'first gen', 'first generation', 'first in my family'],
  immigrant: ['immigrant', 'abroad', 'another country', 'new to the country', 'moved here', 'international'],
  switcher: ['career change', 'changed careers', 'switch', 'switching', 'pivot'],
  senior: ['senior', 'experienced', 'veteran', 'executive', 'director'],
  near: ['few years ahead', 'early career', 'recent grad', 'peer', 'just started'],
  hiring: ['recruiter', 'hiring', 'hiring manager', 'talent'],
};
const CHALLENGE_WORDS: Record<ChallengeId, string[]> = {
  start: ['where to start', 'lost', 'confused', 'no idea'],
  network: ['network', "don't know anyone", 'dont know anyone', 'no connections', 'meet people'],
  interviews: ['interview'],
  resume: ['resume', 'cv'],
  credentials: ['license', 'licence', 'credential', 'degree from', 'certification abroad'],
  switching: ['career change', 'switch', 'transition'],
  hiring: ['how hiring works', 'get hired', 'job market', 'hiring process'],
  skills: ['what to learn', 'skills', 'learn next', 'course', 'certification'],
  team: ['team', 'hackathon', 'cofounder', 'co-founder', 'collaborat', 'build'],
};

function findNamedPerson(t: string, people: Person[]): Person | undefined {
  const lower = t.toLowerCase();
  return (
    people.find((p) => lower.includes(p.name.toLowerCase())) ??
    people.find((p) => new RegExp(`\\b${firstName(p.name).toLowerCase()}\\b`).test(lower))
  );
}

function openProfile(p: Person): AssistantAction {
  return { label: `Open ${firstName(p.name)}'s profile`, href: '/person/[id]', params: { id: p.id } };
}

/** Rank people for a free-text request, layering keyword hints on top of the normal match score. */
function recommend(t: string, ctx: AssistantContext): { picks: Person[]; because: string[] } {
  const because: string[] = [];
  const fields = (Object.keys(FIELD_WORDS) as FieldId[]).filter((f) => has(t, FIELD_WORDS[f]));
  const traits = (Object.keys(TRAIT_WORDS) as TraitId[]).filter((k) => has(t, TRAIT_WORDS[k]));
  const challenges = (Object.keys(CHALLENGE_WORDS) as ChallengeId[]).filter((k) => has(t, CHALLENGE_WORDS[k]));
  const langs = LANGUAGES.filter((l) => l !== 'English' && t.includes(l.toLowerCase()));
  const wantsMentor = has(t, ['mentor']);
  const wantsPeer = has(t, ['peer', 'friend', 'study buddy']);

  if (fields.length) because.push(`in ${fields.map((f) => fieldLabel(f).toLowerCase()).join(' or ')}`);
  if (traits.length) because.push(traits.map((x) => TRAITS.find((y) => y.id === x)!.label.toLowerCase()).join(', '));
  if (challenges.length) because.push(`who help with ${challenges.map((c) => CHALLENGES.find((x) => x.id === c)!.theyHelp).join(' and ')}`);
  if (langs.length) because.push(`who speak ${langs.join(' or ')}`);

  // A field or language the user names is a requirement, not a hint (as long as someone fits).
  let pool = ctx.people.filter((p) => !ctx.blocked.includes(p.id));
  const inField = pool.filter((p) => fields.includes(p.field));
  if (fields.length && inField.length) pool = inField;
  const speaks = pool.filter((p) => langs.some((l) => p.languages.includes(l)));
  if (langs.length && speaks.length) pool = speaks;

  const scored = pool
    .map((p) => {
      let s = matchScore(p, ctx.prefs);
      if (fields.length) s += fields.includes(p.field) ? 6 : -4;
      s += traits.filter((x) => p.traits.includes(x)).length * 3;
      s += challenges.filter((c) => p.helpTags.includes(c)).length * 3;
      s += langs.filter((l) => p.languages.includes(l)).length * 4;
      if (langs.length && !langs.some((l) => p.languages.includes(l))) s -= 5;
      if (wantsMentor && p.offers.includes('mentorship')) s += 2;
      if (wantsPeer && (p.offers.includes('peers') || p.yearsExp <= 3)) s += 2;
      return { p, s };
    })
    .sort((a, b) => b.s - a.s);
  return { picks: scored.slice(0, 3).map((x) => x.p), because };
}

function lineFor(p: Person, prefs: Prefs) {
  const pts = matchPoints(p, prefs).slice(0, 2).map((x) => x.text.charAt(0).toLowerCase() + x.text.slice(1));
  return `• ${p.name}, ${p.role} (${p.areaName})${pts.length ? `: ${pts.join(', ')}` : ''}.`;
}

/** Built-in replies. Keep answers short and concrete; always offer a next step. */
export function builtInReply(input: string, ctx: AssistantContext): AssistantMsg {
  const t = input.toLowerCase().trim();
  const me = firstName(ctx.profile.name);
  const named = findNamedPerson(t, ctx.people);
  const base = { id: uid(), role: 'assistant' as const, source: 'built-in' as const };

  // About a specific person
  if (named) {
    const f = firstName(named.name);
    if (has(t, ['message', 'write', 'say', 'approach', 'reach out', 'opener', 'draft', 'text', 'ask'])) {
      const draft = conversationStarter(named, ctx.prefs, ctx.profile, 'friendly', false);
      return {
        ...base,
        text: `Here's a first message you could send ${f}. Change anything that doesn't sound like you:\n\n"${draft}"\n\nGood questions for ${f}: ${named.questions.slice(0, 2).join(' ')}`,
        people: [named.id],
        actions: [openProfile(named)],
        suggestions: [`Where could I meet ${f}?`, `Tell me about ${f}`],
      };
    }
    if (has(t, ['meet', 'where', 'food', 'coffee', 'lunch', 'eat', 'place', 'spot'])) {
      const shared = ctx.prefs.foods.filter((x) => named.foods.includes(x));
      return {
        ...base,
        text: shared.length
          ? `You and ${f} both like ${shared.map((x) => foodLabel(x).toLowerCase()).join(' and ')}. Open ${f}'s profile and scroll to "Where you two could meet". It finds real places halfway between you, with directions and a button to add one to your message.`
          : `You and ${f} haven't picked the same food yet, so I'd suggest a café halfway between you. Open ${f}'s profile and scroll to "Where you two could meet" for real spots and directions.`,
        people: [named.id],
        actions: [openProfile(named)],
      };
    }
    const pts = matchPoints(named, ctx.prefs).slice(0, 3).map((x) => x.text.toLowerCase());
    return {
      ...base,
      text: `${named.name} is a ${named.role} at ${named.org}, in ${named.areaName}. In their words: "${named.bio}"${pts.length ? `\n\nWhy you might click: ${pts.join('; ')}.` : ''}`,
      people: [named.id],
      actions: [openProfile(named)],
      suggestions: [`Help me message ${f}`, `Where could I meet ${f}?`],
    };
  }

  // Greetings and "what can you do"
  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(t) || has(t, ['what can you do', 'help me', 'how does this work', 'what is this app'])) {
    return {
      ...base,
      text: `Hi${me ? ` ${me}` : ''}! I can help you find the right people nearby, write a first message, pick a place to meet, and find your way around Connected. What would help right now?`,
      suggestions: STARTER_SUGGESTIONS,
    };
  }

  // Requests status
  if (has(t, ['my request', 'requests', 'inbox', 'pending', 'accepted', 'did anyone', 'replied', 'reply'])) {
    const open = ctx.requests.filter((r) => r.status !== 'cancelled');
    const by = (s: string) => open.filter((r) => r.status === s).map((r) => firstName(ctx.people.find((p) => p.id === r.personId)?.name ?? ''));
    const text = open.length
      ? `Here's where your requests stand. Waiting: ${by('requested').join(', ') || 'none'}. Accepted: ${by('accepted').join(', ') || 'none'}. Declined: ${by('declined').join(', ') || 'none'}. Accepted requests open a conversation in your Inbox.`
      : 'You haven’t sent any requests yet. Want me to suggest a few people to start with?';
    return { ...base, text, actions: [{ label: 'Open Inbox', href: '/(tabs)/inbox' }], suggestions: open.length ? undefined : ['Who should I connect with?'] };
  }

  // Recommendations
  if (has(t, ['who should', 'recommend', 'suggest', 'best match', 'find', 'connect with', 'mentor', 'someone', 'people who', 'anyone who', 'looking for', 'introduce'])) {
    const { picks, because } = recommend(t, ctx);
    if (!picks.length) return { ...base, text: 'I couldn’t find anyone for that yet. Try widening your filters on the map.', actions: [{ label: 'Search people', href: '/search' }] };
    return {
      ...base,
      text: `Here are good people to start with${because.length ? ` (${because.join(', ')})` : ', based on what you told us'}:\n\n${picks.map((p) => lineFor(p, ctx.prefs)).join('\n')}\n\nTap a name to see their profile. I can also draft a first message to any of them.`,
      people: picks.map((p) => p.id),
      suggestions: [`Help me message ${firstName(picks[0].name)}`, 'Show more options'],
    };
  }

  // First-message help (no name given)
  if (has(t, ['first message', 'what do i say', 'what should i say', 'how do i approach', 'opener', 'nervous', 'awkward', 'shy', 'reach out'])) {
    return {
      ...base,
      text:
        'A good first message is short and specific:\n\n1. Who you are, in one line.\n2. Why them. Mention something real from their profile.\n3. A small, clear ask, like 15 minutes for coffee or a quick video call.\n\nOn any profile, the "Say hello" box drafts one for you in a Friendly, Direct or Short style. Tell me a name and I’ll draft one here.',
      suggestions: ['Who should I connect with?', `Help me message ${firstName(recommend('', ctx).picks[0]?.name ?? 'Maya')}`],
    };
  }

  // App navigation and features
  if (has(t, ['open door', 'opendoor', 'offer my time', 'host'])) {
    return { ...base, text: 'An Open Door is a short, in-person chat you offer at a public place and time you pick. You choose topics, how long each chat is, and who can see the exact place. It ends automatically at the end time.', actions: [{ label: 'Offer an Open Door', href: '/open-door' }] };
  }
  if (has(t, ['event', 'hackathon', 'meetup', 'career fair'])) {
    return { ...base, text: 'The Events tab lists networking nights, career events and hackathons around Charlotte. Filter by type, date and distance, and save ones you like. Saving is private.', actions: [{ label: 'Open Events', href: '/(tabs)/events' }] };
  }
  if (has(t, ['hotspot', 'busy area', 'hub', 'where are people', 'colored circles', 'busy'])) {
    return { ...base, text: 'The colored zones on the map are hotspots, areas where offices, campuses and meetups cluster. Purple is a major hub, pink is an active hub, teal is an emerging spot. Tap a hotspot’s name for details and how many people from your network are there. Turn them on or off with the flame button.' };
  }
  if (has(t, ['search', 'look up', 'look someone up', 'find a person', 'find someone named'])) {
    return { ...base, text: 'Tap the magnifying glass at the top of the map to search people by name, role, company, skill, language or neighborhood.', actions: [{ label: 'Search people', href: '/search' }] };
  }
  if (has(t, ['privacy', 'location', 'track', 'gps', 'who can see', 'safe', 'safety'])) {
    return { ...base, text: 'Your location is used only while the map is open, to show distances. It’s never tracked in the background and nobody else sees it. Other people appear at their neighborhood, never a live position. You can hide yourself from discovery in Profile, and block or report anyone from their profile.', actions: [{ label: 'Privacy settings', href: '/(tabs)/profile' }] };
  }
  if (has(t, ['block', 'report', 'harass', 'uncomfortable'])) {
    return { ...base, text: 'Open the person’s profile, tap the "…" button at the top, then Block or Report. Blocking hides them from you and cancels pending requests. You can unblock in Profile. Always meet in public places.' };
  }
  if (has(t, ['preference', 'change my field', 'edit', 'settings', 'update my'])) {
    return { ...base, text: 'You can change your goals, field, what’s in your way, who you click with, foods and meeting style anytime.', actions: [{ label: 'Edit preferences', href: '/onboarding', params: { edit: 'prefs' } }, { label: 'Edit profile', href: '/onboarding', params: { edit: 'profile' } }] };
  }
  if (has(t, ['photo', 'picture', 'avatar'])) {
    return { ...base, text: 'Tap your avatar at the top of the Profile tab to add or change your photo.', actions: [{ label: 'Go to Profile', href: '/(tabs)/profile' }] };
  }
  if (has(t, ['meet', 'where to meet', 'restaurant', 'coffee', 'food'])) {
    return { ...base, text: 'On any profile, "Where you two could meet" suggests real places halfway between you that serve food you both picked. You can also open it from a chat with "Where to meet?". Tell me a name and I’ll point you there.' };
  }
  if (has(t, ['show more', 'more options', 'others', 'anyone else'])) {
    const { picks } = recommend('', ctx);
    const more = ctx.people.filter((p) => !picks.includes(p) && !ctx.blocked.includes(p.id)).sort((a, b) => matchScore(b, ctx.prefs) - matchScore(a, ctx.prefs)).slice(0, 3);
    return { ...base, text: `A few more:\n\n${more.map((p) => lineFor(p, ctx.prefs)).join('\n')}`, people: more.map((p) => p.id) };
  }
  if (has(t, ['thank', 'thanks', 'ty'])) return { ...base, text: 'Anytime. Good luck reaching out!' };

  return {
    ...base,
    text: 'I’m not sure about that one yet. I can recommend people, draft a first message, help you pick a place to meet, or explain any part of the app.',
    suggestions: STARTER_SUGGESTIONS,
  };
}

/** Short, factual context for the Claude proxy: who you are, what you want, and who's nearby. */
export function contextForClaude(ctx: AssistantContext): string {
  const p = ctx.prefs;
  const top = [...ctx.people]
    .filter((x) => !ctx.blocked.includes(x.id))
    .sort((a, b) => matchScore(b, p) - matchScore(a, p))
    .slice(0, 10);
  const me = [
    `Name: ${fullName(ctx.profile) || 'not set'}; status: ${ctx.profile.status ?? 'not set'}; org: ${ctx.profile.org || 'n/a'}`,
    `Wants to grow in: ${p.field ? fieldLabel(p.field) : 'not set'}${p.fromField ? `, coming from ${fieldLabel(p.fromField)}` : ''}`,
    `Goals: ${p.goals.join(', ') || 'none'}; challenges: ${p.challenges.join(', ') || 'none'}; clicks with: ${p.wantTraits.join(', ') || 'anyone'}`,
    `Interests: ${p.interests.join(', ') || 'none'}; skills: ${p.skills.join(', ') || 'none'}; languages: ${p.languages.join(', ')}; foods: ${p.foods.join(', ') || 'none'}`,
    `Intro: ${ctx.profile.intro || 'n/a'}`,
  ].join('\n');
  const list = top
    .map((x) => `- ${x.name} (id ${x.id}): ${x.role} at ${x.org}, ${x.areaName}. Field ${fieldLabel(x.field)}. Helps with: ${x.helpsWith.join('; ')}. Languages: ${x.languages.join(', ')}. Match: ${matchStrength(x, p)}. Bio: ${x.bio}`)
    .join('\n');
  const reqs = ctx.requests.filter((r) => r.status !== 'cancelled').map((r) => `${ctx.people.find((x) => x.id === r.personId)?.name ?? r.personId}: ${r.status}`).join('; ');
  return `ABOUT THE USER\n${me}\n\nBEST-MATCHED PEOPLE NEARBY (demo profiles)\n${list}\n\nUSER'S REQUESTS\n${reqs || 'none'}`;
}

/** Ask the Claude proxy. Returns null when it isn't configured or fails, so callers can fall back. */
export async function claudeReply(history: AssistantMsg[], ctx: AssistantContext): Promise<AssistantMsg | null> {
  const url = process.env.EXPO_PUBLIC_ASSISTANT_URL;
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-token': process.env.EXPO_PUBLIC_ASSISTANT_TOKEN ?? '' },
      body: JSON.stringify({
        messages: history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
        context: contextForClaude(ctx),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    if (!data.text) return null;
    const mentioned = ctx.people.filter((p) => data.text!.includes(p.name)).slice(0, 3).map((p) => p.id);
    return { id: uid(), role: 'assistant', text: data.text, people: mentioned.length ? mentioned : undefined, source: 'claude' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const claudeConfigured = () => !!process.env.EXPO_PUBLIC_ASSISTANT_URL;

/**
 * Everything that talks to Supabase. Screens and state call these functions; nothing else imports
 * the client directly. All reads go through row level security (see supabase/schema.sql).
 */
import { CHARLOTTE_CENTER, statusLabel } from '@/data/options';
import type {
  AvailabilityId, ChallengeId, DietId, FieldId, FoodId, GoalId, LatLng, MeetMode, Mode, Person, Prefs, Profile, RequestStatus, ShareMode, StatusId, TraitId,
} from '@/data/types';
import { fieldLabelShort } from './match';
import { supabase } from './supabase';

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  status: StatusId | null;
  org: string;
  intro: string;
  offer: string;
  field: FieldId | null;
  from_field: FieldId | null;
  mode: Mode;
  goals: GoalId[];
  challenges: ChallengeId[];
  want_traits: TraitId[];
  interests: string[];
  skills: string[];
  languages: string[];
  foods: FoodId[];
  diet: DietId[];
  availability: AvailabilityId[];
  meet_mode: MeetMode;
  share_mode: ShareMode;
  discoverable: boolean;
  area_name: string | null;
  area_lat: number | null;
  area_lng: number | null;
  updated_at?: string;
};

export type RemoteRequest = {
  id: string;
  from_user: string;
  to_user: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

export type RemoteMessage = { id: string; request_id: string; sender: string; body: string; created_at: string };

const db = () => {
  if (!supabase) throw new Error('Backend not configured');
  return supabase;
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** What other people see about a real user, in the same shape as demo people. */
export function rowToPerson(r: ProfileRow): Person {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Connected member';
  const fieldWord = r.field ? fieldLabelShort(r.field) : 'their field';
  const hidden = r.area_lat == null || r.area_lng == null;
  const traits: TraitId[] = [];
  if (r.status === 'changing') traits.push('switcher');
  if (r.status === 'experienced') traits.push('senior');
  if (r.status === 'early') traits.push('near');
  return {
    id: r.id,
    name,
    role: statusLabel(r.status),
    org: r.org || (r.field ? fieldWord.charAt(0).toUpperCase() + fieldWord.slice(1) : 'Connected'),
    status: r.status ?? 'early',
    field: r.field ?? 'tech',
    fieldPhrase: fieldWord,
    interests: r.interests ?? [],
    skills: r.skills ?? [],
    helpsWith: r.offer ? [r.offer] : r.mode === 'seeking' ? ['Swapping notes with people at the same stage'] : ['Sharing what they’ve learned'],
    offers: r.mode === 'seeking' ? ['peers'] : ['mentorship', 'advice', 'peers'],
    availability: r.availability?.length ? r.availability : ['week'],
    areaName: hidden ? 'Meets at public places' : r.area_name || 'Nearby',
    coord: hidden ? CHARLOTTE_CENTER : { latitude: r.area_lat!, longitude: r.area_lng! },
    areaHidden: hidden,
    meets: r.meet_mode === 'video' ? 'video' : r.meet_mode === 'inperson' ? 'public' : 'both',
    hook: r.org ? `are at ${r.org}` : `are in ${fieldWord}`,
    questions: ['How did you get started?', 'What do you wish you had known earlier?', 'What would you do in my position?'],
    bio: r.intro || r.offer || 'New to Connected.',
    traits,
    helpTags: [],
    languages: r.languages?.length ? r.languages : ['English'],
    yearsExp: 0,
    foods: r.foods ?? [],
    diet: r.diet ?? [],
    isDemo: false,
  };
}

type AreaCols = 'area_name' | 'area_lat' | 'area_lng';
/** Your row to save. The area columns are left out when there's no fresh position yet, so the saved area is kept. */
export type MyRow = Omit<ProfileRow, AreaCols> & Partial<Pick<ProfileRow, AreaCols>>;

export function myRow(userId: string, profile: Profile, prefs: Prefs, here: { coord: LatLng; label: string } | null): MyRow {
  const keepArea = prefs.shareMode === 'area' && !here;
  const row: MyRow = {
    id: userId,
    first_name: profile.name.trim().slice(0, 60),
    last_name: profile.lastName.trim().slice(0, 60),
    status: profile.status,
    org: profile.org.trim().slice(0, 120),
    intro: profile.intro.slice(0, 400),
    offer: profile.offer.slice(0, 300),
    field: prefs.field,
    from_field: prefs.fromField,
    mode: prefs.mode,
    goals: prefs.goals,
    challenges: prefs.challenges,
    want_traits: prefs.wantTraits,
    interests: prefs.interests,
    skills: prefs.skills,
    languages: prefs.languages,
    foods: prefs.foods,
    diet: prefs.diet,
    availability: prefs.availability,
    meet_mode: prefs.meetMode,
    share_mode: prefs.shareMode,
    discoverable: prefs.discoverable,
    // Rounded again by the database; "public places only" stores no area at all.
    area_name: prefs.shareMode === 'area' && here ? (here.label === 'you' ? null : here.label) : null,
    area_lat: prefs.shareMode === 'area' && here ? Math.round(here.coord.latitude * 100) / 100 : null,
    area_lng: prefs.shareMode === 'area' && here ? Math.round(here.coord.longitude * 100) / 100 : null,
  };
  if (keepArea) {
    delete row.area_name;
    delete row.area_lat;
    delete row.area_lng;
  }
  return row;
}

/** Turn your stored row back into app preferences and profile (used after signing in). */
export function rowToMine(r: ProfileRow): { profile: Partial<Profile>; prefs: Partial<Prefs> } {
  return {
    profile: { name: r.first_name, lastName: r.last_name, status: r.status, org: r.org, intro: r.intro, offer: r.offer },
    prefs: {
      field: r.field, fromField: r.from_field, mode: r.mode, goals: r.goals, challenges: r.challenges, wantTraits: r.want_traits,
      interests: r.interests, skills: r.skills, languages: r.languages, foods: r.foods, diet: r.diet, availability: r.availability,
      meetMode: r.meet_mode, shareMode: r.share_mode, discoverable: r.discoverable,
    },
  };
}

export async function loadMyRow(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function saveMyRow(row: MyRow): Promise<void> {
  const { error } = await db().from('profiles').upsert(row);
  if (error) throw error;
}

export async function fetchNearby(center: LatLng, radiusMi: number): Promise<Person[]> {
  const { data, error } = await db().rpc('nearby_profiles', { lat: center.latitude, lng: center.longitude, radius_mi: radiusMi });
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(rowToPerson);
}

/** Everyone you're allowed to see (for search and the assistant). RLS filters the rows. */
export async function fetchVisible(myId: string): Promise<Person[]> {
  const { data, error } = await db().from('profiles').select('*').neq('id', myId).eq('discoverable', true).limit(300);
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(rowToPerson);
}

export async function fetchPeopleByIds(ids: string[]): Promise<Person[]> {
  if (!ids.length) return [];
  const { data, error } = await db().from('profiles').select('*').in('id', ids);
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(rowToPerson);
}

// ---------------------------------------------------------------------------
// Requests and messages
// ---------------------------------------------------------------------------

export async function fetchMyRequests(): Promise<RemoteRequest[]> {
  const { data, error } = await db().from('connection_requests').select('*').order('updated_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as RemoteRequest[];
}

export async function sendRemoteRequest(toUser: string, message: string): Promise<RemoteRequest> {
  const { data, error } = await db().from('connection_requests').insert({ to_user: toUser, message: message.slice(0, 600) }).select('*').single();
  if (error) throw error;
  return data as RemoteRequest;
}

export async function setRemoteRequestStatus(id: string, status: Exclude<RequestStatus, 'requested'>): Promise<void> {
  const { error } = await db().from('connection_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function fetchMessages(requestIds: string[]): Promise<RemoteMessage[]> {
  if (!requestIds.length) return [];
  const { data, error } = await db().from('messages').select('*').in('request_id', requestIds).order('created_at', { ascending: true }).limit(1000);
  if (error) throw error;
  return (data ?? []) as RemoteMessage[];
}

export async function sendRemoteMessage(requestId: string, body: string): Promise<void> {
  const { error } = await db().from('messages').insert({ request_id: requestId, body: body.slice(0, 2000) });
  if (error) throw error;
}

export async function blockRemote(personId: string): Promise<void> {
  const { error } = await db().from('blocks').upsert({ blocked: personId });
  if (error) throw error;
}

export async function unblockRemote(myId: string, personId: string): Promise<void> {
  const { error } = await db().from('blocks').delete().eq('blocker', myId).eq('blocked', personId);
  if (error) throw error;
}

export async function reportRemote(personId: string, reason: string): Promise<void> {
  const { error } = await db().from('reports').insert({ reported: personId, reason });
  if (error) throw error;
}

/** Live updates for your requests and messages. Returns an unsubscribe function. */
export function subscribeToMine(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`mine-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests', filter: `to_user=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests', filter: `from_user=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

/** True for ids that belong to real (backend) people rather than built-in demo profiles. */
export const isRemoteId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

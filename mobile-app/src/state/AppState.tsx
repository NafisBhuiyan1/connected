import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_INCOMING } from '@/data/demo';
import { dataSource, rememberPeople, setBackendUser, setShowDemo } from '@/data/source';
import type { ConnectionRequest, IncomingRequest, LatLng, Message, OpenDoor, Prefs, Profile, RequestStatus } from '@/data/types';
import {
  blockRemote, fetchMessages, fetchMyRequests, fetchPeopleByIds, isRemoteId, loadMyRow, myRow, reportRemote, rowToMine, saveMyRow,
  sendRemoteMessage, sendRemoteRequest, setRemoteRequestStatus, subscribeToMine, unblockRemote, type RemoteMessage, type RemoteRequest,
} from '@/lib/backend';
import { backendEnabled, supabase } from '@/lib/supabase';

const KEY = 'opendoor.state.v1';
const REPLY_DELAY_MS = 6000;

export type AppData = {
  onboarded: boolean;
  prefs: Prefs;
  profile: Profile;
  requests: ConnectionRequest[];
  messages: Record<string, Message[]>;
  incoming: IncomingRequest[];
  doors: OpenDoor[];
  savedEvents: string[];
  blocked: string[];
  /** Show the built-in demo people alongside real users. */
  showDemo: boolean;
  /** Mix the built-in sample events in with real live events. */
  showDemoEvents: boolean;
  /** Notify me (while the app is open) when a real member is within 1 mile. */
  nearbyAlerts: boolean;
};

export const emptyPrefs: Prefs = {
  field: null, fromField: null, challenges: [], wantTraits: [], languages: ['English'], meetMode: 'either', foods: [], diet: [],
  interests: [], skills: [], goals: [], goalOther: '', travelMi: 5, mode: 'seeking', shareMode: 'area', discoverable: true, availability: ['week'],
};
const emptyProfile: Profile = { name: '', lastName: '', status: null, org: '', intro: '', offer: '', photoUri: null };

const fresh = (): AppData => ({
  onboarded: false, prefs: emptyPrefs, profile: emptyProfile, requests: [], messages: {}, incoming: DEMO_INCOMING, doors: [], savedEvents: [], blocked: [], showDemo: true, showDemoEvents: false, nearbyAlerts: false,
});

export const SAMPLE: Pick<AppData, 'prefs' | 'profile'> = {
  prefs: {
    field: 'finance', fromField: null, challenges: ['network', 'interviews', 'start'], wantTraits: ['firstgen', 'near'], languages: ['English', 'Spanish'], meetMode: 'either',
    foods: ['coffee', 'mediterranean', 'mexican'], diet: [],
    interests: ['Fintech', 'Data & analytics', 'Investing'], skills: ['Excel', 'Spanish', 'Customer service'],
    goals: ['mentorship', 'advice', 'peers'], goalOther: '', travelMi: 5, mode: 'both', shareMode: 'public', discoverable: true, availability: ['week', 'evenings'],
  },
  profile: {
    name: 'Alex', lastName: 'Rivera', status: 'student', org: 'UNC Charlotte', photoUri: null,
    intro: 'First-gen finance student, transferred from community college last year. Trying to break into banking without knowing anyone in it.',
    offer: 'Happy to help anyone navigating a community college transfer or job hunting in Spanish.',
  },
};

/** Where you're looking from: your GPS position or the area you picked. Kept in memory only. */
export type Here = { coord: LatLng; label: string; isGps: boolean };
export type Session = { userId: string; email: string };

type Ctx = Omit<AppData, 'requests' | 'messages'> & {
  /** Demo requests plus real ones from the backend (real ones have `remote: true`). */
  requests: ConnectionRequest[];
  messages: Record<string, Message[]>;
  hydrated: boolean;
  now: number;
  here: Here | null;
  setHere: (h: Here) => void;
  backendEnabled: boolean;
  session: Session | null;
  authReady: boolean;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ hasProfile: boolean }>;
  signOut: () => Promise<void>;
  refreshRemote: () => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setShowDemoPeople: (v: boolean) => void;
  setShowDemoEvents: (v: boolean) => void;
  setNearbyAlerts: (v: boolean) => void;
  finishOnboarding: () => void;
  loadSample: () => void;
  sendRequest: (personId: string, message: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
  respondRemote: (id: string, status: 'accepted' | 'declined') => Promise<void>;
  simulateReply: (id: string, status: Extract<RequestStatus, 'accepted' | 'declined'>) => void;
  sendMessage: (requestId: string, text: string) => Promise<void>;
  respondIncoming: (id: string, state: IncomingRequest['state']) => void;
  saveDoor: (door: OpenDoor) => void;
  endDoor: (id: string) => void;
  toggleSavedEvent: (id: string) => void;
  block: (personId: string) => void;
  unblock: (personId: string) => void;
  report: (personId: string, reason: string) => void;
  reset: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(fresh);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [here, setHere] = useState<Here | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!backendEnabled);
  const [remote, setRemote] = useState<{ requests: RemoteRequest[]; messages: RemoteMessage[] }>({ requests: [], messages: [] });
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<AppData>;
        const profile = { ...emptyProfile, ...saved.profile };
        // Older saves kept the full name in one field; split it into first and last.
        if (saved.profile && !('lastName' in saved.profile) && profile.name.trim().includes(' ')) {
          const [first, ...rest] = profile.name.trim().split(/\s+/);
          profile.name = first;
          profile.lastName = rest.join(' ');
        }
        setData((d) => ({ ...d, ...saved, prefs: { ...emptyPrefs, ...saved.prefs }, profile }));
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data, hydrated]);

  useEffect(() => {
    setShowDemo(data.showDemo);
  }, [data.showDemo]);

  // ---- Auth -------------------------------------------------------------------------------------
  const applySession = useCallback((s: { user: { id: string; email?: string } } | null) => {
    const next = s ? { userId: s.user.id, email: s.user.email ?? '' } : null;
    setBackendUser(next?.userId ?? null);
    setSession((cur) => (cur?.userId === next?.userId ? cur : next));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data: d }) => alive && applySession(d.session))
      .finally(() => alive && setAuthReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => applySession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  // ---- Real requests and messages ----------------------------------------------------------------
  const loadRemote = useCallback(async () => {
    if (!supabase) return;
    try {
      const requests = await fetchMyRequests();
      const [messages, people] = await Promise.all([
        fetchMessages(requests.map((r) => r.id)),
        fetchPeopleByIds([...new Set(requests.flatMap((r) => [r.from_user, r.to_user]))]),
      ]);
      rememberPeople(people);
      setRemote({ requests, messages });
    } catch (e) {
      console.warn('Could not load requests', e);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    // First load right after sign-in, then again whenever a live update arrives.
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => loadRemote(), 0);
    const unsubscribe = subscribeToMine(session.userId, () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadRemote(), 250);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [session, loadRemote]);

  // ---- Keep your profile in the backend up to date (debounced) ------------------------------------
  const hereKey = here ? `${here.coord.latitude.toFixed(2)},${here.coord.longitude.toFixed(2)},${here.label}` : '';
  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);
  useEffect(() => {
    if (!session || !data.onboarded || !data.profile.name.trim()) return;
    const t = setTimeout(() => {
      saveMyRow(myRow(session.userId, data.profile, data.prefs, hereRef.current)).catch((e) => console.warn('Could not save profile', e));
    }, 1200);
    return () => clearTimeout(t);
  }, [session, data.onboarded, data.profile, data.prefs, hereKey]);

  // ---- Demo replies and the clock -----------------------------------------------------------------
  const resolve = useCallback((id: string, forced: 'accepted' | 'declined' | undefined, at: number) => {
    setData((d) => {
      const r = d.requests.find((x) => x.id === id);
      if (!r || r.status !== 'requested') return d;
      const person = dataSource.getPerson(r.personId);
      const status = forced ?? (person?.demoResponse === 'decline' ? 'declined' : 'accepted');
      const msgs = d.messages[id] ?? [];
      const reply: Message | null =
        status === 'accepted'
          ? { id: `m${at}`, from: 'them', at, demo: true, text: `Thanks for reaching out! Happy to talk.${person?.door ? ' Come find me at my Open Door, or' : ''} Suggest a time that works and a public spot near you.` }
          : null;
      return {
        ...d,
        requests: d.requests.map((x) => (x.id === id ? { ...x, status, updatedAt: at } : x)),
        messages: reply ? { ...d.messages, [id]: [...msgs, reply] } : d.messages,
      };
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const due = dataRef.current.requests.filter((r) => r.status === 'requested' && r.respondAt <= n);
      due.forEach((r) => resolve(r.id, undefined, n));
    }, 1000);
    return () => clearInterval(t);
  }, [resolve]);

  const setPrefs = useCallback((p: Partial<Prefs>) => setData((d) => ({ ...d, prefs: { ...d.prefs, ...p } })), []);
  const setProfile = useCallback((p: Partial<Profile>) => setData((d) => ({ ...d, profile: { ...d.profile, ...p } })), []);

  // Merge real requests/messages into the same shapes the screens already use.
  const merged = useMemo(() => {
    const uid = session?.userId;
    if (!uid) return { requests: data.requests, messages: data.messages };
    const remoteReqs: ConnectionRequest[] = remote.requests.map((r) => {
      const incoming = r.to_user === uid;
      return {
        id: r.id,
        personId: incoming ? r.from_user : r.to_user,
        message: r.message,
        status: r.status,
        createdAt: Date.parse(r.created_at),
        updatedAt: Date.parse(r.updated_at),
        respondAt: Number.MAX_SAFE_INTEGER,
        remote: true,
        incoming,
      };
    });
    const remoteMsgs: Record<string, Message[]> = {};
    for (const r of remoteReqs) {
      remoteMsgs[r.id] = [
        { id: `first-${r.id}`, from: r.incoming ? 'them' : 'me', text: r.message, at: r.createdAt },
        ...remote.messages
          .filter((m) => m.request_id === r.id)
          .map((m): Message => ({ id: m.id, from: m.sender === uid ? 'me' : 'them', text: m.body, at: Date.parse(m.created_at) })),
      ];
    }
    return { requests: [...data.requests, ...remoteReqs], messages: { ...data.messages, ...remoteMsgs } };
  }, [data.requests, data.messages, remote, session]);

  const value = useMemo<Ctx>(
    () => ({
      ...data,
      requests: merged.requests,
      messages: merged.messages,
      hydrated,
      now,
      here,
      setHere,
      backendEnabled,
      session,
      authReady,
      refreshRemote: () => {
        loadRemote();
      },
      signUp: async (email, password) => {
        if (!supabase) throw new Error('Accounts aren’t set up in this build.');
        const { data: d, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw new Error(error.message);
        return { needsConfirmation: !d.session };
      },
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Accounts aren’t set up in this build.');
        const { data: d, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message);
        const row = await loadMyRow(d.user.id).catch(() => null);
        if (row) {
          const mine = rowToMine(row);
          setData((cur) => ({ ...cur, onboarded: true, prefs: { ...cur.prefs, ...mine.prefs }, profile: { ...cur.profile, ...mine.profile } }));
        }
        return { hasProfile: !!row };
      },
      signOut: async () => {
        await supabase?.auth.signOut();
        setRemote({ requests: [], messages: [] });
      },
      setPrefs,
      setProfile,
      setShowDemoPeople: (v) => setData((d) => ({ ...d, showDemo: v })),
      setShowDemoEvents: (v) => setData((d) => ({ ...d, showDemoEvents: v })),
      setNearbyAlerts: (v) => setData((d) => ({ ...d, nearbyAlerts: v })),
      finishOnboarding: () => setData((d) => ({ ...d, onboarded: true })),
      loadSample: () => setData((d) => ({ ...d, ...SAMPLE, onboarded: true })),
      sendRequest: async (personId, message) => {
        if (isRemoteId(personId)) {
          await sendRemoteRequest(personId, message);
          await loadRemote();
          return;
        }
        const t = Date.now();
        const id = `r${t}`;
        setData((d) => ({
          ...d,
          requests: [...d.requests.filter((r) => !(r.personId === personId && r.status === 'cancelled')), { id, personId, message, status: 'requested', createdAt: t, updatedAt: t, respondAt: t + REPLY_DELAY_MS }],
          messages: { ...d.messages, [id]: [{ id: `m${t}`, from: 'me', text: message, at: t }] },
        }));
      },
      cancelRequest: async (id) => {
        if (isRemoteId(id)) {
          await setRemoteRequestStatus(id, 'cancelled');
          await loadRemote();
          return;
        }
        setData((d) => ({ ...d, requests: d.requests.map((r) => (r.id === id ? { ...r, status: 'cancelled', updatedAt: Date.now() } : r)) }));
      },
      respondRemote: async (id, status) => {
        await setRemoteRequestStatus(id, status);
        await loadRemote();
      },
      simulateReply: (id, status) => resolve(id, status, Date.now()),
      sendMessage: async (requestId, text) => {
        if (isRemoteId(requestId)) {
          await sendRemoteMessage(requestId, text);
          await loadRemote();
          return;
        }
        const t = Date.now();
        setData((d) => ({ ...d, messages: { ...d.messages, [requestId]: [...(d.messages[requestId] ?? []), { id: `m${t}`, from: 'me', text, at: t }] } }));
      },
      respondIncoming: (id, state) => setData((d) => ({ ...d, incoming: d.incoming.map((x) => (x.id === id ? { ...x, state } : x)) })),
      saveDoor: (door) => setData((d) => ({ ...d, doors: d.doors.some((x) => x.id === door.id) ? d.doors.map((x) => (x.id === door.id ? door : x)) : [...d.doors, door] })),
      endDoor: (id) => setData((d) => ({ ...d, doors: d.doors.map((x) => (x.id === id ? { ...x, endedAt: Date.now() } : x)) })),
      toggleSavedEvent: (id) => setData((d) => ({ ...d, savedEvents: d.savedEvents.includes(id) ? d.savedEvents.filter((x) => x !== id) : [...d.savedEvents, id] })),
      block: (personId) => {
        if (isRemoteId(personId)) blockRemote(personId).then(loadRemote).catch((e) => console.warn('Could not block', e));
        setData((d) => ({
          ...d,
          blocked: d.blocked.includes(personId) ? d.blocked : [...d.blocked, personId],
          requests: d.requests.map((r) => (r.personId === personId && r.status === 'requested' ? { ...r, status: 'cancelled', updatedAt: Date.now() } : r)),
        }));
      },
      unblock: (personId) => {
        if (isRemoteId(personId) && session) unblockRemote(session.userId, personId).catch((e) => console.warn('Could not unblock', e));
        setData((d) => ({ ...d, blocked: d.blocked.filter((x) => x !== personId) }));
      },
      report: (personId, reason) => {
        if (isRemoteId(personId)) reportRemote(personId, reason).catch((e) => console.warn('Could not report', e));
      },
      reset: async () => {
        await AsyncStorage.removeItem(KEY).catch(() => {});
        await supabase?.auth.signOut();
        setRemote({ requests: [], messages: [] });
        setData(fresh());
      },
    }),
    [data, merged, hydrated, now, here, session, authReady, setPrefs, setProfile, resolve, loadRemote],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

/** Latest request with a person, in either direction (ignores cancelled ones so a new request can be sent). */
export function latestRequest(requests: ConnectionRequest[], personId: string) {
  return [...requests].sort((a, b) => a.updatedAt - b.updatedAt).reverse().find((r) => r.personId === personId && r.status !== 'cancelled');
}

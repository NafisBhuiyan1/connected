import "server-only";
import { recommendEvents, eventInsights } from "../engine/events";
import { introFacts } from "../engine/icebreakers";
import { parseIntentRules } from "../engine/intent";
import { activeStatus, buildNeed, rankCandidates, roleCoverage, scoreCandidate, toPublic, type MatchContext } from "../engine/match";
import { formTeam } from "../engine/team";
import { interestLabel, MISSION_TEMPLATES, ROLE_BY_ID, roleLabel, skillLabel } from "../ontology";
import type {
  ConnectionRequest,
  Database,
  Intent,
  LiveStatus,
  Mission,
  MissionKind,
  Notification,
  OutcomeRating,
  Post,
  Profile,
  PublicProfile,
  Team,
} from "../types";
import { tagText } from "../ontology";
import { CROWNHACKS_ID, DEFAULT_PREFS, PRIVACY } from "../constants";
import type { ConnectedEvent, Prefs } from "../types";
import { draftIntro, understandGoal, type AiSource } from "./ai";
import { publish } from "./bus";
import { getDb, mutate, newId } from "./store";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const nowIso = () => new Date().toISOString();
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function matchCtx(db: Database, now = new Date()): MatchContext {
  return { now, memberships: db.memberships, events: db.events };
}

// ---------- visibility & privacy ----------

function blocked(db: Database, a: string, b: string): boolean {
  return db.blocks.some((x) => (x.userId === a && x.blockedId === b) || (x.userId === b && x.blockedId === a));
}

function sharesOptedInEvent(db: Database, a: string, b: string): boolean {
  const ea = db.memberships.filter((m) => m.userId === a && m.optIn).map((m) => m.eventId);
  return db.memberships.some((m) => m.userId === b && m.optIn && ea.includes(m.eventId));
}

function connected(db: Database, a: string, b: string): boolean {
  return db.requests.some(
    (r) => r.status === "accepted" && ((r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a)),
  );
}

/** Can `viewer` see `target` at all? Hidden profiles are only visible to existing connections/teammates. */
export function canSee(db: Database, viewer: Profile, target: Profile): boolean {
  if (viewer.id === target.id) return true;
  if (blocked(db, viewer.id, target.id)) return false;
  if (connected(db, viewer.id, target.id)) return true;
  if (db.teams.some((t) => t.members.some((m) => m.userId === viewer.id) && t.members.some((m) => m.userId === target.id))) return true;
  if (target.visibility === "hidden") return false;
  if (target.visibility === "events") return sharesOptedInEvent(db, viewer.id, target.id);
  return true;
}

/** Who can show up in discovery for this viewer (and optionally within one event's opted-in space). */
export function discoveryPool(db: Database, viewer: Profile, eventId?: string): Profile[] {
  return db.profiles.filter((p) => {
    if (p.id === viewer.id) return false;
    if (p.visibility === "hidden" || blocked(db, viewer.id, p.id)) return false;
    if (p.visibility === "events" && !sharesOptedInEvent(db, viewer.id, p.id)) return false;
    if (eventId) return !prefsOf(p).ghostMode && db.memberships.some((m) => m.userId === p.id && m.eventId === eventId && m.optIn);
    return true;
  });
}

function pub(db: Database, viewer: Profile, p: Profile): PublicProfile {
  return toPublic(p, p.allowRequests && !blocked(db, viewer.id, p.id));
}

function notify(db: Database, n: Omit<Notification, "id" | "read" | "createdAt">) {
  db.notifications.push({ ...n, id: newId("n"), read: false, createdAt: nowIso() });
  publish(`user:${n.userId}`);
}

function profileOrThrow(db: Database, id: string): Profile {
  const p = db.profiles.find((x) => x.id === id);
  if (!p) throw new ApiError(404, "Person not found");
  return p;
}

// ---------- discovery ----------

export async function discover(me: Profile, query: string, eventId?: string) {
  const db = getDb();
  const text = query.trim() || me.ask;
  const { intent, source, ms } = text ? await understandGoal(text, me) : { intent: null, source: "rules" as AiSource, ms: 0 };
  const need = buildNeed(me, intent, eventId);
  const pool = discoveryPool(db, me, eventId);
  const t0 = performance.now();
  const matches = rankCandidates(me, pool, need, matchCtx(db), 12);  return {
    intent,
    source,
    aiMs: ms,
    rankMs: Math.round((performance.now() - t0) * 10) / 10,
    poolSize: pool.length,
    matches: matches.map((m) => ({ ...m, requestState: requestState(db, me.id, m.profile.id) })),
  };
}

export function requestState(db: Database, me: string, other: string): "none" | "pending-out" | "pending-in" | "connected" | "declined" {
  const r = db.requests
    .filter((x) => (x.fromId === me && x.toId === other) || (x.fromId === other && x.toId === me))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!r) return "none";
  if (r.status === "accepted") return "connected";
  if (r.status === "pending") return r.fromId === me ? "pending-out" : "pending-in";
  if (r.status === "declined") return r.fromId === me ? "declined" : "none";
  return "none";
}

export function personDetail(me: Profile, id: string) {
  const db = getDb();
  const p = profileOrThrow(db, id);
  if (!canSee(db, me, p)) throw new ApiError(404, "This profile isn't visible to you.");
  if (p.id !== me.id) recordView(me, p);
  const ctx = matchCtx(db);
  const match = p.id === me.id ? null : scoreCandidate(me, p, buildNeed(me), ctx);
  const sharedEvents = db.events.filter(
    (e) =>
      db.memberships.some((m) => m.userId === me.id && m.eventId === e.id) &&
      db.memberships.some((m) => m.userId === p.id && m.eventId === e.id && m.optIn),
  );
  const live = activeStatus(p.id, ctx);
  const liveEvent = live ? db.events.find((e) => e.id === live.eventId) : undefined;
  return {
    profile: pub(db, me, p),
    isMe: p.id === me.id,
    match,
    sharedEvents: sharedEvents.map((e) => ({ id: e.id, title: e.title })),
    live: live?.status
      ? { ...live.status, eventId: live.eventId, eventTitle: liveEvent?.title, zone: liveEvent?.zones.find((z) => z.id === live.zone)?.name }
      : null,
    requestState: requestState(db, me.id, p.id),
    quietInterestSent: db.interests.some((i) => i.fromId === me.id && i.toId === p.id),
    teamsTogether: db.teams
      .filter((t) => t.members.some((m) => m.userId === me.id) && t.members.some((m) => m.userId === p.id))
      .map((t) => ({ id: t.id, title: t.title })),
  };
}

// ---------- intros ----------

export async function intro(me: Profile, toId: string, ask: string, eventId?: string) {
  const db = getDb();
  const to = profileOrThrow(db, toId);
  if (!canSee(db, me, to)) throw new ApiError(404, "Person not found");
  const ev = eventId ? db.events.find((e) => e.id === eventId) : undefined;
  const live = activeStatus(to.id, matchCtx(db), eventId);
  const zoneId = live?.zone ?? db.memberships.find((m) => m.userId === to.id && m.eventId === eventId)?.zone;
  const zone = ev?.zones.find((z) => z.id === zoneId && z.meetingSpot) ?? ev?.zones.find((z) => z.meetingSpot);
  const facts = introFacts(me, to, ask || me.ask, { eventTitle: ev?.title, zoneName: zone?.name });
  const draft = await draftIntro(facts);
  return { ...draft, facts };
}

// ---------- requests ----------

export function listRequests(me: Profile) {
  const db = getDb();
  const mine = db.requests.filter((r) => r.fromId === me.id || r.toId === me.id);
  const people: Record<string, PublicProfile> = {};
  for (const r of mine) {
    const other = r.fromId === me.id ? r.toId : r.fromId;
    const p = db.profiles.find((x) => x.id === other);
    if (p) people[other] = pub(db, me, p);
  }
  const ev = (id?: string) => (id ? db.events.find((e) => e.id === id)?.title : undefined);
  const decorate = (r: ConnectionRequest) => ({ ...r, eventTitle: ev(r.eventId), myRating: r.outcomes?.[me.id] });
  return {
    incoming: mine.filter((r) => r.toId === me.id && r.status === "pending").map(decorate),
    outgoing: mine.filter((r) => r.fromId === me.id && r.status === "pending").map(decorate),
    connections: mine.filter((r) => r.status === "accepted").sort((a, b) => (b.respondedAt ?? "").localeCompare(a.respondedAt ?? "")).map(decorate),
    declined: mine.filter((r) => r.status === "declined" && r.fromId === me.id).map(decorate),
    people,
  };
}

export function createRequest(
  me: Profile,
  input: { toId: string; ask: string; message?: string; eventId?: string; missionId?: string; kind?: "connect" | "chat" },
) {
  const ask = input.ask.trim();
  if (ask.length < 12) throw new ApiError(400, "Add a specific ask (at least a short sentence) — it's what makes people say yes.");
  if (ask.length > 400) throw new ApiError(400, "Keep the ask under 400 characters.");
  return mutate((db) => {
    const to = profileOrThrow(db, input.toId);
    if (to.id === me.id) throw new ApiError(400, "You can't send a request to yourself.");
    if (!canSee(db, me, to) || blocked(db, me.id, to.id)) throw new ApiError(404, "Person not found");
    if (!to.allowRequests) throw new ApiError(403, `${to.name.split(" ")[0]} isn't accepting requests right now.`);
    const state = requestState(db, me.id, to.id);
    if (state === "connected") throw new ApiError(409, "You're already connected.");
    if (state === "pending-out") throw new ApiError(409, "You already have a pending request with them.");
    const outgoingPending = db.requests.filter((r) => r.fromId === me.id && r.status === "pending").length;
    if (outgoingPending >= 15) throw new ApiError(429, "You have 15 pending requests — wait for some replies first (anti-spam limit).");
    // Respect the recipient's time-boxed request cap.
    const live = activeStatus(to.id, matchCtx(db), input.eventId);
    if (live?.status) {
      const since = live.joinedAt;
      const received = db.requests.filter((r) => r.toId === to.id && r.createdAt >= since && r.status !== "withdrawn").length;
      if (live.status.mode === "heads-down") throw new ApiError(429, `${to.name.split(" ")[0]} is heads-down right now — try again later or use Quiet interest.`);
      if (received >= live.status.maxRequests) throw new ApiError(429, `${to.name.split(" ")[0]} has reached the request limit they set for now.`);
    }
    // Score in the context of this specific ask (a resume question to a banker ≠ a cofounder search).
    const match = scoreCandidate(me, to, buildNeed(me, parseIntentRules(ask), input.eventId), matchCtx(db));
    const req: ConnectionRequest = {
      id: newId("r"),
      fromId: me.id,
      toId: to.id,
      kind: input.kind ?? "chat",
      ask,
      message: (input.message ?? "").trim().slice(0, 1200) || ask,
      eventId: input.eventId,
      missionId: input.missionId,
      score: match.score,
      reasons: match.reasons.slice(0, 3).map((r) => r.text),
      status: "pending",
      createdAt: nowIso(),
    };
    db.requests.push(req);
    notify(db, {
      userId: to.id,
      kind: "request",
      title: `${me.name} wants to connect`,
      body: ask,
      href: "/connections",
    });
    return req;
  });
}

export function respondRequest(me: Profile, id: string, accept: boolean, meetingSpot?: string) {
  return mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r || r.toId !== me.id) throw new ApiError(404, "Request not found");
    if (r.status !== "pending") throw new ApiError(409, "This request was already answered.");
    r.status = accept ? "accepted" : "declined";
    r.respondedAt = nowIso();
    if (accept) {
      r.meetingSpot = meetingSpot?.trim() || suggestMeetingSpot(db, r) || undefined;
      notify(db, {
        userId: r.fromId,
        kind: "request-accepted",
        title: `${me.name} accepted your request`,
        body: r.meetingSpot ? `Suggested meeting spot: ${r.meetingSpot}` : "You're connected — say hi.",
        href: "/connections",
      });
      db.messages.push({ id: newId("m"), threadId: r.id, fromId: "system", body: `Connected${r.meetingSpot ? ` · meet at ${r.meetingSpot}` : ""}.`, createdAt: nowIso() });
    }
    // Declines are silent for the sender's dignity — they just see "no reply yet" → expires.
    return r;
  });
}

function suggestMeetingSpot(db: Database, r: ConnectionRequest): string | null {
  const eventId =
    r.eventId ??
    db.memberships.find((m) => m.userId === r.fromId && db.memberships.some((n) => n.userId === r.toId && n.eventId === m.eventId))?.eventId;
  const ev = db.events.find((e) => e.id === eventId);
  if (!ev) return null;
  const toZone = db.memberships.find((m) => m.userId === r.toId && m.eventId === ev.id)?.zone;
  const z = ev.zones.find((zz) => zz.id === toZone && zz.meetingSpot) ?? ev.zones.find((zz) => zz.meetingSpot);
  return z ? `${z.name} · ${ev.title}` : null;
}

export function rateOutcome(me: Profile, id: string, rating: OutcomeRating) {
  return mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r || (r.fromId !== me.id && r.toId !== me.id)) throw new ApiError(404, "Request not found");
    if (r.status !== "accepted") throw new ApiError(409, "You can only rate conversations that happened.");
    r.outcomes = { ...(r.outcomes ?? {}), [me.id]: rating };
    return r;
  });
}

export function withdrawRequest(me: Profile, id: string) {
  return mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r || r.fromId !== me.id || r.status !== "pending") throw new ApiError(404, "Request not found");
    r.status = "withdrawn";
    return r;
  });
}

/** Double opt-in: neither side is notified unless both express interest. */
export function quietInterest(me: Profile, toId: string) {
  return mutate((db) => {
    const to = profileOrThrow(db, toId);
    if (!canSee(db, me, to)) throw new ApiError(404, "Person not found");
    if (!db.interests.some((i) => i.fromId === me.id && i.toId === toId)) {
      db.interests.push({ fromId: me.id, toId, createdAt: nowIso() });
    }
    const reciprocal = db.interests.some((i) => i.fromId === toId && i.toId === me.id);
    if (reciprocal && requestState(db, me.id, toId) !== "connected") {
      const req: ConnectionRequest = {
        id: newId("r"),
        fromId: toId,
        toId: me.id,
        kind: "mutual",
        ask: "You both quietly said you'd like to meet.",
        message: "Mutual interest",
        status: "accepted",
        createdAt: nowIso(),
        respondedAt: nowIso(),
      };
      req.meetingSpot = suggestMeetingSpot(db, req) ?? undefined;
      db.requests.push(req);
      for (const [u, other] of [
        [me.id, to],
        [toId, me],
      ] as const) {
        notify(db, { userId: u, kind: "mutual", title: `It's mutual with ${other.name}!`, body: "You both wanted to meet — you're now connected.", href: "/connections" });
      }
      return { mutual: true };
    }
    return { mutual: false };
  });
}

export function block(me: Profile, userId: string) {
  return mutate((db) => {
    if (!db.blocks.some((b) => b.userId === me.id && b.blockedId === userId)) db.blocks.push({ userId: me.id, blockedId: userId, createdAt: nowIso() });
    for (const r of db.requests) {
      if (r.status === "pending" && ((r.fromId === userId && r.toId === me.id) || (r.fromId === me.id && r.toId === userId))) r.status = "withdrawn";
    }
    return { ok: true };
  });
}

// ---------- teams ----------

export async function planTeam(
  me: Profile,
  input: { pitch: string; eventId?: string; size?: number; locked?: string[]; excluded?: string[]; intent?: Intent },
) {
  const db = getDb();
  const { intent, source, ms } = input.intent
    ? { intent: input.intent, source: "rules" as AiSource, ms: 0 }
    : await understandGoal(input.pitch, me);
  const roles = intent.roles.length ? intent.roles : parseIntentRules(`build an app ${input.pitch}`).roles;
  const excluded = new Set(input.excluded ?? []);
  const pool = discoveryPool(db, me, input.eventId).filter(
    (p) => !excluded.has(p.id) && p.openTo.some((k) => ["hackathon-team", "project", "cofounder", "research"].includes(k)),
  );
  if ((input.locked?.length ?? 0) > 3) throw new ApiError(400, "A CrownHacks team includes you and at most 3 collaborators.");
  const result = formTeam({
    owner: me,
    roles,
    pool,
    maxSize: Math.max(1, Math.min(3, input.size ?? 3)),
    eventId: input.eventId,
    locked: input.locked,
    ctx: matchCtx(db),
  });
  const ids = new Set<string>([...result.members.map((m) => m.userId), ...result.slots.flatMap((s) => s.alternatives.map((a) => a.userId))]);
  const people: Record<string, PublicProfile> = {};
  for (const id of ids) {
    const p = db.profiles.find((x) => x.id === id);
    if (p) people[id] = pub(db, me, p);
  }
  return { intent: { ...intent, roles }, source, aiMs: ms, result, people };
}

export function createTeam(
  me: Profile,
  input: { title: string; pitch: string; eventId?: string; missionId?: string; roles: { roleId: string; why: string; weight: number }[]; members: { userId: string; roleId: string }[]; coverage: number; openRoles?: string[] },
) {
  const title = input.title.trim().slice(0, 90) || "Untitled project";
  if (!input.members.length) throw new ApiError(400, "Pick at least one teammate to invite.");
  if (input.members.length > 3) throw new ApiError(400, "Teams at CrownHacks are 2–4 people — invite at most 3 others here.");
  return mutate((db) => {
    const memberProfiles = input.members.map((m) => {
      const p = profileOrThrow(db, m.userId);
      if (!canSee(db, me, p)) throw new ApiError(404, "Person not found");
      return p;
    });
    const everyone = [me, ...memberProfiles];
    // Each role goes to whoever on the team covers it best (the owner included); weak coverage stays open.
    const roles = input.roles
      .filter((r) => ROLE_BY_ID[r.roleId])
      .map((r) => {
        const explicit = input.members.find((m) => m.roleId === r.roleId);
        let best = explicit ? { id: explicit.userId, c: roleCoverage(memberProfiles.find((p) => p.id === explicit.userId)!, r.roleId).coverage } : { id: "", c: 0 };
        for (const p of everyone) {
          const c = roleCoverage(p, r.roleId).coverage;
          if (!explicit && c > best.c) best = { id: p.id, c };
        }
        return {
          roleId: r.roleId,
          label: roleLabel(r.roleId),
          why: r.why,
          weight: r.weight,
          assignedUserId: best.c >= 0.45 ? best.id : undefined,
          coverage: Math.round(best.c * 100) / 100,
        };
      });
    const ownerRoles = roles.filter((r) => r.assignedUserId === me.id);
    const ownerRole =
      ownerRoles.sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0))[0]?.roleId ??
      roles.filter((r) => !input.members.some((m) => m.roleId === r.roleId)).sort((a, b) => roleCoverage(me, b.roleId).coverage - roleCoverage(me, a.roleId).coverage)[0]?.roleId ??
      "product-lead";
    const t: Team = {
      id: newId("t"),
      ownerId: me.id,
      title,
      pitch: input.pitch.trim().slice(0, 600),
      eventId: input.eventId,
      missionId: input.missionId,
      roles,
      members: [
        { userId: me.id, roleId: ownerRole, status: "owner", invitedAt: nowIso() },
        ...input.members.map((m) => ({ userId: m.userId, roleId: m.roleId, status: "invited" as const, invitedAt: nowIso() })),
      ],
      openRoles: input.openRoles ?? [],
      coverage: input.coverage,
      status: "forming",
      nextSteps: [
        { id: "s1", text: "Everyone accepts the invite", done: false },
        { id: "s2", text: "Agree on the one-sentence problem", done: false },
        { id: "s3", text: "Meet at the team-formation mixer", done: false },
        { id: "s4", text: "Split the first 3 tasks", done: false },
      ],
      createdAt: nowIso(),
    };
    db.teams.push(t);
    db.messages.push({
      id: newId("m"),
      threadId: t.id,
      fromId: "system",
      body: `${me.name} proposed this team. Connected matched it for ${Math.round(input.coverage * 100)}% role coverage. Invites sent — each person decides for themselves.`,
      createdAt: nowIso(),
    });
    for (const m of input.members) {
      notify(db, {
        userId: m.userId,
        kind: "team-invite",
        title: `${me.name} invited you to a team`,
        body: `${title} — as ${roleLabel(m.roleId)}`,
        href: `/teams/${t.id}`,
      });
    }
    return t;
  });
}

function teamAccess(db: Database, me: Profile, t: Team) {
  const member = t.members.find((m) => m.userId === me.id);
  if (t.ownerId !== me.id && (!member || member.status === "declined" || blocked(db, me.id, t.ownerId))) {
    throw new ApiError(403, "Only active invited members can open this team.");
  }
  return member;
}

export function teamDetail(me: Profile, id: string) {
  const db = getDb();
  const t = db.teams.find((x) => x.id === id);
  if (!t) throw new ApiError(404, "Team not found");
  teamAccess(db, me, t);
  const people: Record<string, PublicProfile> = {};
  for (const m of t.members) {
    const p = db.profiles.find((x) => x.id === m.userId);
    if (p) people[p.id] = pub(db, me, p);
  }
  const ev = t.eventId ? db.events.find((e) => e.id === t.eventId) : undefined;
  return {
    team: t,
    people,
    event: ev ? { id: ev.id, title: ev.title, meetingSpots: ev.zones.filter((z) => z.meetingSpot).map((z) => z.name) } : null,
    messages: db.messages.filter((m) => m.threadId === t.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    myStatus: t.members.find((m) => m.userId === me.id)?.status ?? null,
  };
}

export function myTeams(me: Profile) {
  const db = getDb();
  return db.teams
    .filter((t) => t.members.some((m) => m.userId === me.id && m.status !== "declined"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => ({
      ...t,
      memberNames: t.members.map((m) => ({ id: m.userId, name: db.profiles.find((p) => p.id === m.userId)?.name ?? "?", status: m.status, hue: db.profiles.find((p) => p.id === m.userId)?.avatarHue ?? 0 })),
      myStatus: t.members.find((m) => m.userId === me.id)?.status,
    }));
}

export function respondTeam(me: Profile, id: string, accept: boolean) {
  return mutate((db) => {
    const t = db.teams.find((x) => x.id === id);
    if (!t) throw new ApiError(404, "Team not found");
    const m = t.members.find((x) => x.userId === me.id);
    if (!m || m.status !== "invited") throw new ApiError(409, "No pending invite for you on this team.");
    m.status = accept ? "accepted" : "declined";
    m.respondedAt = nowIso();
    publish(`thread:${t.id}`);
    if (!accept) {
      for (const slot of t.roles) {
        if (slot.assignedUserId !== me.id) continue;
        slot.assignedUserId = undefined;
        if (!t.openRoles.includes(slot.roleId)) t.openRoles.push(slot.roleId);
      }
      if (t.status === "formed" && !t.members.some((x) => x.status === "accepted")) t.status = "forming";
    }
    db.messages.push({
      id: newId("m"),
      threadId: t.id,
      fromId: "system",
      body: accept ? `${me.name} joined as ${roleLabel(m.roleId)}.` : `${me.name} passed. The ${roleLabel(m.roleId)} role is open again.`,
      createdAt: nowIso(),
    });
    const pending = t.members.filter((x) => x.status === "invited").length;
    const accepted = t.members.filter((x) => x.status === "accepted").length;
    if (pending === 0 && accepted >= 1) {
      t.status = "formed";
      const step = t.nextSteps.find((s) => s.id === "s1");
      if (step) step.done = true;
      db.messages.push({ id: newId("m"), threadId: t.id, fromId: "system", body: "Team formed 🎉 Next: agree on the one-sentence problem and meet at the mixer.", createdAt: nowIso() });
    }
    notify(db, {
      userId: t.ownerId,
      kind: "team-update",
      title: accept ? `${me.name} joined ${t.title}` : `${me.name} passed on ${t.title}`,
      body: accept ? `As ${roleLabel(m.roleId)}` : "Connected can suggest a replacement.",
      href: `/teams/${t.id}`,
    });
    return t;
  });
}

export function postMessage(me: Profile, threadId: string, body: string) {
  const text = body.trim();
  if (!text) throw new ApiError(400, "Message is empty.");
  return mutate((db) => {
    const team = db.teams.find((t) => t.id === threadId);
    const req = db.requests.find((r) => r.id === threadId);
    if (team) {
      teamAccess(db, me, team);
      for (const other of team.members) {
        if (other.userId !== me.id && other.status !== "declined" && !blocked(db, me.id, other.userId)) {
          notify(db, { userId: other.userId, kind: "message", title: `${me.name} in ${team.title}`, body: text.slice(0, 120), href: `/teams/${team.id}` });
        }
      }
    } else if (req) {
      if (req.status !== "accepted" || (req.fromId !== me.id && req.toId !== me.id) || blocked(db, req.fromId, req.toId)) throw new ApiError(403, "Not part of this conversation.");
    } else throw new ApiError(404, "Thread not found");
    const msg = { id: newId("m"), threadId, fromId: me.id, body: text.slice(0, 2000), createdAt: nowIso() };
    db.messages.push(msg);
    publish(`thread:${threadId}`);
    return msg;
  });
}

export function threadMessages(me: Profile, threadId: string) {
  const db = getDb();
  const team = db.teams.find((t) => t.id === threadId);
  if (team) teamAccess(db, me, team);
  else {
    const req = db.requests.find((r) => r.id === threadId);
    if (!req || req.status !== "accepted" || (req.fromId !== me.id && req.toId !== me.id) || blocked(db, req.fromId, req.toId)) throw new ApiError(404, "Thread not found");
  }
  return db.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function toggleStep(me: Profile, teamId: string, stepId: string) {
  return mutate((db) => {
    const t = db.teams.find((x) => x.id === teamId);
    if (!t) throw new ApiError(404, "Team not found");
    teamAccess(db, me, t);
    const s = t.nextSteps.find((x) => x.id === stepId);
    if (!s) throw new ApiError(404, "Step not found");
    s.done = !s.done;
    publish(`thread:${t.id}`);
    return t;
  });
}

export function setOpenRoles(me: Profile, teamId: string, roles: string[]) {
  return mutate((db) => {
    const t = db.teams.find((x) => x.id === teamId);
    if (!t || t.ownerId !== me.id) throw new ApiError(403, "Only the team owner can post open roles.");
    t.openRoles = roles.filter((r) => ROLE_BY_ID[r]);
    return t;
  });
}

// ---------- events ----------

export function listEvents(me: Profile) {
  const db = getDb();
  const need = buildNeed(me);
  const recs = recommendEvents(me, need, db.events, discoveryPool(db, me), matchCtx(db));
  const people: Record<string, PublicProfile> = {};
  for (const r of recs) for (const tp of r.topPeople) {
    const p = db.profiles.find((x) => x.id === tp.userId);
    if (p) people[p.id] = pub(db, me, p);
  }
  return { events: recs.map((r) => ({ ...r, event: publicEvent(r.event) })), people };
}

export function eventDetail(me: Profile, id: string) {
  const db = getDb();
  const ev = db.events.find((e) => e.id === id);
  if (!ev) throw new ApiError(404, "Event not found");
  const ctx = matchCtx(db);
  const mine = db.memberships.find((m) => m.eventId === id && m.userId === me.id) ?? null;
  const need = { ...buildNeed(me), eventId: id };
  // You only see the event's networking space after joining *and* opting in yourself (reciprocal privacy).
  const canBrowse = Boolean(mine?.optIn);
  const pool = canBrowse ? discoveryPool(db, me, id) : [];
  const participants = rankCandidates(me, pool, need, ctx, 60).map((m) => {
    const mm = db.memberships.find((x) => x.userId === m.profile.id && x.eventId === id);
    return { ...m, zone: mm?.zone ?? null, requestState: requestState(db, me.id, m.profile.id) };
  });
  const zoneCounts: Record<string, number> = {};
  const hiddenIds = new Set(db.profiles.filter((p) => p.visibility === "hidden").map((p) => p.id));
  for (const m of db.memberships) {
    if (m.eventId === id && m.optIn && m.zone && !hiddenIds.has(m.userId)) zoneCounts[m.zone] = (zoneCounts[m.zone] ?? 0) + 1;
  }
  const reqs = db.requests.filter((r) => r.eventId === id);
  const insights = eventInsights(ev, db.profiles, db.teams, ctx, {
    accepted: reqs.filter((r) => r.status === "accepted").length,
    ratings: reqs.flatMap((r) => Object.values(r.outcomes ?? {})).filter(Boolean) as string[],
  });
  const openRoles = db.teams
    .filter((t) => t.eventId === id && t.openRoles.length && t.ownerId !== me.id && t.status === "forming")
    .map((t) => {
      const owner = db.profiles.find((p) => p.id === t.ownerId);
      return {
        teamId: t.id,
        title: t.title,
        pitch: t.pitch,
        owner: owner ? pub(db, me, owner) : null,
        roles: t.openRoles.map((r) => ({ roleId: r, label: roleLabel(r), myFit: Math.round(roleCoverage(me, r).coverage * 100) })),
      };
    });
  return {
    event: publicEvent(ev),
    membership: mine,
    canBrowse,
    participants,
    zoneCounts,
    insights,
    openRoles,
    attendeeCount: db.memberships.filter((m) => m.eventId === id).length,
  };
}

export function joinEvent(
  me: Profile,
  id: string,
  input: { optIn: boolean; zone?: string | null; status?: (Omit<LiveStatus, "until"> & { minutes: number }) | null; leave?: boolean; checkIn?: boolean; checkInCode?: string },
) {
  return mutate((db) => {
    const ev = db.events.find((e) => e.id === id);
    if (!ev) throw new ApiError(404, "Event not found");
    if (input.checkInCode !== undefined) {
      const ok = Boolean(ev.checkInCode) && input.checkInCode.trim().toUpperCase() === ev.checkInCode!.toUpperCase();
      if (!ok) throw new ApiError(400, "That code doesn't match. Check the screen at the venue.");
      input = { ...input, checkIn: true };
    }
    const idx = db.memberships.findIndex((m) => m.eventId === id && m.userId === me.id);
    if (input.leave) {
      if (idx >= 0) db.memberships.splice(idx, 1);
      return null;
    }
    if (input.zone && !ev.zones.some((z) => z.id === input.zone)) throw new ApiError(400, "Unknown zone");
    const status: LiveStatus | undefined = input.status
      ? {
          mode: input.status.mode,
          topics: input.status.topics.map((t) => t.trim()).filter(Boolean).slice(0, 4),
          maxRequests: Math.max(0, Math.min(20, input.status.maxRequests)),
          until: new Date(Date.now() + Math.max(15, Math.min(12 * 60, input.status.minutes)) * 60_000).toISOString(),
        }
      : undefined;
    const prev = idx >= 0 ? db.memberships[idx] : null;
    const m = {
      eventId: id,
      userId: me.id,
      optIn: input.optIn,
      zone: input.zone ?? prev?.zone,
      status: input.status === null ? undefined : (status ?? prev?.status),
      checkedInAt: input.checkIn === true ? nowIso() : input.checkIn === false ? undefined : prev?.checkedInAt,
      joinedAt: input.status ? nowIso() : (prev?.joinedAt ?? nowIso()),
    };
    if (idx >= 0) db.memberships[idx] = m;
    else db.memberships.push(m);
    return m;
  });
}

// ---------- missions ----------

export async function createMission(me: Profile, input: { goal: string; kind?: MissionKind; title?: string; eventId?: string }) {
  const goal = input.goal.trim();
  if (goal.length < 6) throw new ApiError(400, "Describe the mission in a few words.");
  const template = MISSION_TEMPLATES.find((t) => t.kind === input.kind);
  const { intent, source } = await understandGoal(goal, me);
  const targets = (intent.roles.length ? intent.roles.slice(0, 4).map((r) => ({ roleId: r.roleId, count: 1 })) : (template?.targets ?? [])).map((t) => ({
    ...t,
    label: roleLabel(t.roleId),
  }));
  const kind: MissionKind =
    input.kind ??
    (intent.kind === "cofounder" ? "cofounder" : intent.kind === "hackathon-team" || intent.isProject ? "hackathon-team" : intent.kind === "mentorship-get" ? "mentor" : intent.kind === "internship" ? "internship" : "custom");
  const mission: Mission = {
    id: newId("ms"),
    userId: me.id,
    title: capitalize((input.title?.trim() || intent.projectTitle || template?.title || intent.summary).slice(0, 80)),
    goal,
    kind,
    targets,
    eventId: input.eventId,
    status: "active",
    createdAt: nowIso(),
  };
  mutate((db) => db.missions.push(mission));
  return { mission, source };
}

export function missionProgress(db: Database, me: Profile, m: Mission) {
  const pool = discoveryPool(db, me, m.eventId);
  const relevant = pool.filter((p) => m.targets.some((t) => roleCoverage(p, t.roleId).coverage >= 0.6));
  const sent = db.requests.filter(
    (r) => r.fromId === me.id && r.createdAt >= m.createdAt && (r.missionId === m.id || relevant.some((p) => p.id === r.toId)),
  );
  const accepted = db.requests.filter(
    (r) =>
      r.status === "accepted" &&
      (r.fromId === me.id || r.toId === me.id) &&
      (r.respondedAt ?? r.createdAt) >= m.createdAt &&
      relevant.some((p) => p.id === (r.fromId === me.id ? r.toId : r.fromId)),
  );
  const useful = accepted.filter((r) => r.outcomes?.[me.id] === "useful");
  const teams = db.teams.filter((t) => t.createdAt >= m.createdAt && t.members.some((x) => x.userId === me.id && (x.status === "owner" || x.status === "accepted")));
  const teamFormed = teams.some((t) => t.status === "formed" || t.members.filter((x) => x.status === "accepted").length > 0);
  const want = m.targets.reduce((a, t) => a + t.count, 0) || 1;
  const steps = [
    { id: "discover", label: "Discover relevant people", value: Math.min(relevant.length, want * 3), target: want * 3 },
    { id: "reach", label: "Reach out with a specific ask", value: Math.min(sent.length, want), target: want },
    { id: "connect", label: "Get accepted", value: Math.min(accepted.length, want), target: want },
    { id: "outcome", label: m.kind === "hackathon-team" || m.kind === "cofounder" ? "Form a team" : "Have a useful conversation", value: m.kind === "hackathon-team" || m.kind === "cofounder" ? (teamFormed ? 1 : 0) : Math.min(useful.length, 1), target: 1 },
  ];
  const progress = steps.reduce((a, s) => a + s.value / s.target, 0) / steps.length;
  const coveredTargets = m.targets.map((t) => ({
    ...t,
    found: relevant.filter((p) => roleCoverage(p, t.roleId).coverage >= 0.6).length,
    connected: accepted.filter((r) => {
      const other = db.profiles.find((p) => p.id === (r.fromId === me.id ? r.toId : r.fromId));
      return other ? roleCoverage(other, t.roleId).coverage >= 0.6 : false;
    }).length,
  }));
  return { steps, progress: Math.round(progress * 100), targets: coveredTargets, done: progress >= 0.999 };
}

export function listMissions(me: Profile) {
  const db = getDb();
  return db.missions
    .filter((m) => m.userId === me.id && m.status !== "archived")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => ({ mission: m, ...missionProgress(db, me, m) }));
}

export function updateMission(me: Profile, id: string, status: Mission["status"]) {
  return mutate((db) => {
    const m = db.missions.find((x) => x.id === id && x.userId === me.id);
    if (!m) throw new ApiError(404, "Mission not found");
    m.status = status;
    return m;
  });
}

// ---------- opportunity radar ----------

export interface RadarItem {
  id: string;
  kind: "open-role" | "live-match" | "event" | "mentor" | "mutual-path";
  title: string;
  body: string;
  href: string;
  score: number;
  personId?: string;
}

export function radar(me: Profile): RadarItem[] {
  const db = getDb();
  const ctx = matchCtx(db);
  const items: RadarItem[] = [];
  // 1) Open roles on forming teams that fit my skills
  for (const t of db.teams) {
    if (t.ownerId === me.id || t.status !== "forming" || t.members.some((m) => m.userId === me.id)) continue;
    const owner = db.profiles.find((p) => p.id === t.ownerId);
    if (!owner || !canSee(db, me, owner)) continue;
    for (const r of t.openRoles) {
      const cov = roleCoverage(me, r);
      if (cov.coverage >= 0.55) {
        items.push({
          id: `role_${t.id}_${r}`,
          kind: "open-role",
          title: `${owner.name.split(" ")[0]}'s team needs a ${roleLabel(r).toLowerCase()}`,
          body: `“${t.title}” — your ${cov.evidence.map(skillLabel).slice(0, 2).join(" + ") || "skills"} fit this role (${Math.round(cov.coverage * 100)}%).`,
          href: `/people/${owner.id}`,
          score: 70 + cov.coverage * 30,
          personId: owner.id,
        });
      }
    }
  }
  // 2) Live, high-fit people at an event I've opted into
  const myEvents = db.memberships.filter((m) => m.userId === me.id && m.optIn).map((m) => m.eventId);
  for (const eventId of myEvents) {
    const ev = db.events.find((e) => e.id === eventId);
    const pool = discoveryPool(db, me, eventId);
    const top = rankCandidates(me, pool, { ...buildNeed(me), eventId }, ctx, 6).filter((m) => m.liveNow && m.liveNow.mode !== "heads-down" && m.score >= 55);
    for (const m of top.slice(0, 3)) {
      const zone = ev?.zones.find((z) => z.id === m.liveNow?.zone)?.name;
      items.push({
        id: `live_${m.profile.id}`,
        kind: m.profile.openTo.includes("mentorship-give") ? "mentor" : "live-match",
        title: `${m.profile.name} is open ${m.liveNow!.mode === "mentoring" ? "to mentoring" : m.liveNow!.mode === "team-up" ? "to teaming up" : "for a quick chat"} now`,
        body: `${m.reasons[0]?.text ?? m.profile.headline}${zone ? ` · near ${zone}` : ""}`,
        href: `/people/${m.profile.id}`,
        score: m.score,
        personId: m.profile.id,
      });
    }
  }
  // 3) Upcoming events with several high-fit people (that I haven't joined)
  const recs = recommendEvents(me, buildNeed(me), db.events, discoveryPool(db, me), ctx).filter((r) => !r.joined && r.topPeople.some((p) => p.score >= 60));
  for (const r of recs.slice(0, 2)) {
    const strong = r.topPeople.filter((p) => p.score >= 60).length;
    items.push({
      id: `ev_${r.event.id}`,
      kind: "event",
      title: `${strong} strong ${strong === 1 ? "match is" : "matches are"} going to ${r.event.title}`,
      body: r.reasons[0] ?? r.event.description,
      href: `/events/${r.event.id}`,
      score: r.score,
    });
  }
  // 4) Warm paths: someone who has offered to consider intros in a domain I care about
  for (const p of discoveryPool(db, me)) {
    const domain = p.introsOffered.find((d) => me.interests.includes(d));
    if (!domain) continue;
    items.push({
      id: `path_${p.id}`,
      kind: "mutual-path",
      title: `Warm path into ${interestLabel(domain)}`,
      body: `${p.name} (${p.headline}) is open to considering intros in ${interestLabel(domain).toLowerCase()} — start with a specific ask.`,
      href: `/people/${p.id}`,
      score: 50,
      personId: p.id,
    });
  }
  const seen = new Set<string>();
  return items
    .sort((a, b) => b.score - a.score)
    .filter((i) => {
      const key = i.personId ?? i.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

// ---------- home & graph ----------

export function home(me: Profile) {
  const db = getDb();
  const ctx = matchCtx(db);
  const missions = listMissions(me);
  const active = missions[0] ?? null;
  const intent = active ? parseIntentRules(active.mission.goal) : me.ask ? parseIntentRules(me.ask) : null;
  const eventId = db.memberships.find((m) => m.userId === me.id && m.optIn && db.events.find((e) => e.id === m.eventId && new Date(e.end) > new Date()))?.eventId;
  const need = buildNeed(me, intent, eventId);
  const matches = rankCandidates(me, discoveryPool(db, me), need, ctx, 6).map((m) => ({ ...m, requestState: requestState(db, me.id, m.profile.id) }));
  const evs = listEvents(me);
  const reqs = db.requests.filter((r) => r.fromId === me.id || r.toId === me.id);
  const stats = {
    connections: reqs.filter((r) => r.status === "accepted").length,
    pendingIn: reqs.filter((r) => r.toId === me.id && r.status === "pending").length,
    teams: db.teams.filter((t) => t.members.some((m) => m.userId === me.id && (m.status === "owner" || m.status === "accepted"))).length,
    useful: reqs.filter((r) => r.outcomes?.[me.id] === "useful").length,
    teamInvites: db.teams.filter((t) => t.members.some((m) => m.userId === me.id && m.status === "invited")).length,
  };
  return { me, activeMission: active, matches, radar: radar(me), events: evs.events.slice(0, 10), eventPeople: evs.people, stats, liveEventId: eventId ?? null };
}

export interface GraphNode {
  id: string;
  type: "me" | "person" | "skill" | "interest" | "event" | "team";
  label: string;
  sub?: string;
  hue?: number;
  score?: number;
  connected?: boolean;
  href?: string;
}
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  kind: "connected" | "match" | "has-skill" | "needs" | "interest" | "attending" | "team";
}

export function graph(me: Profile) {
  const db = getDb();
  const ctx = matchCtx(db);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const add = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  add({ id: me.id, type: "me", label: me.name.split(" ")[0] || "You", sub: me.headline, hue: me.avatarHue });
  const intent = me.ask ? parseIntentRules(me.ask) : null;
  const need = buildNeed(me, intent);
  const matches = rankCandidates(me, discoveryPool(db, me), need, ctx, 7);
  const connections = db.requests
    .filter((r) => r.status === "accepted" && (r.fromId === me.id || r.toId === me.id))
    .map((r) => (r.fromId === me.id ? r.toId : r.fromId));
  const people = new Map<string, { p: Profile; score?: number; connected: boolean; reason?: string }>();
  for (const id of connections) {
    const p = db.profiles.find((x) => x.id === id);
    if (p) people.set(id, { p, connected: true, score: matches.find((m) => m.profile.id === id)?.score });
  }
  for (const m of matches) {
    const p = db.profiles.find((x) => x.id === m.profile.id);
    if (p && !people.has(p.id)) people.set(p.id, { p, connected: false, score: m.score, reason: m.reasons[0]?.text });
  }
  for (const { p, score, connected, reason } of people.values()) {
    add({ id: p.id, type: "person", label: p.name, sub: p.headline, hue: p.avatarHue, score, connected, href: `/people/${p.id}` });
    edges.push({ source: me.id, target: p.id, label: connected ? "Connected" : (reason ?? "Recommended"), kind: connected ? "connected" : "match" });
  }
  // Needed roles → which recommended people fill them
  for (const r of need.roles.slice(0, 4)) {
    const nid = `role:${r.roleId}`;
    add({ id: nid, type: "skill", label: ROLE_BY_ID[r.roleId]?.short ?? r.roleId, sub: "Role you need" });
    edges.push({ source: me.id, target: nid, label: `You need a ${roleLabel(r.roleId).toLowerCase()}`, kind: "needs" });
    for (const { p } of people.values()) {
      if (roleCoverage(p, r.roleId).coverage >= 0.7) edges.push({ source: p.id, target: nid, label: `${p.name.split(" ")[0]} can fill ${roleLabel(r.roleId).toLowerCase()}`, kind: "has-skill" });
    }
  }
  // Shared interests
  for (const i of me.interests.slice(0, 4)) {
    const nid = `interest:${i}`;
    const sharers = [...people.values()].filter(({ p }) => p.interests.includes(i));
    if (!sharers.length) continue;
    add({ id: nid, type: "interest", label: interestLabel(i), sub: "Shared interest" });
    edges.push({ source: me.id, target: nid, label: `You care about ${interestLabel(i)}`, kind: "interest" });
    for (const { p } of sharers.slice(0, 4)) edges.push({ source: p.id, target: nid, label: `Shares interest in ${interestLabel(i)}`, kind: "interest" });
  }
  // Events I joined
  for (const m of db.memberships.filter((x) => x.userId === me.id)) {
    const ev = db.events.find((e) => e.id === m.eventId);
    if (!ev) continue;
    const nid = `event:${ev.id}`;
    add({ id: nid, type: "event", label: ev.title, sub: ev.venue, href: `/events/${ev.id}` });
    edges.push({ source: me.id, target: nid, label: "You're attending", kind: "attending" });
    for (const { p } of people.values()) {
      if (db.memberships.some((x) => x.userId === p.id && x.eventId === ev.id && x.optIn)) edges.push({ source: p.id, target: nid, label: `${p.name.split(" ")[0]} is attending`, kind: "attending" });
    }
  }
  // Teams
  for (const t of db.teams.filter((x) => x.members.some((m) => m.userId === me.id && m.status !== "declined"))) {
    const nid = `team:${t.id}`;
    add({ id: nid, type: "team", label: t.title.split(" — ")[0], sub: t.status === "formed" ? "Team formed" : "Team forming", href: `/teams/${t.id}` });
    for (const m of t.members) {
      if (m.status === "declined") continue;
      const p = db.profiles.find((x) => x.id === m.userId);
      if (p && !nodes.has(p.id)) add({ id: p.id, type: "person", label: p.name, sub: p.headline, hue: p.avatarHue, href: `/people/${p.id}`, connected: true });
      edges.push({ source: m.userId, target: nid, label: `${m.userId === me.id ? "You" : (p?.name.split(" ")[0] ?? "")} · ${roleLabel(m.roleId)}`, kind: "team" });
    }
  }
  return { nodes: [...nodes.values()], edges };
}

// ---------- notifications ----------

export function notifications(me: Profile) {
  const db = getDb();
  const list = db.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  return { items: list, unread: list.filter((n) => !n.read).length };
}

export function markAllRead(me: Profile) {
  return mutate((db) => {
    for (const n of db.notifications) if (n.userId === me.id) n.read = true;
    return { ok: true };
  });
}

// ---------- feed (LinkedIn-style) ----------

export type FeedItem =
  | { type: "post"; id: string; at: string; post: Post; author: PublicProfile; likes: number; likedByMe: boolean; fit: number | null; isMine: boolean }
  | { type: "team"; id: string; at: string; teamId: string; title: string; status: "forming" | "formed"; members: PublicProfile[]; openRoles: { roleId: string; label: string; myFit: number }[]; ownerId: string }
  | { type: "checkins"; id: string; at: string; eventId: string; eventTitle: string; people: PublicProfile[]; count: number }
  | { type: "connected"; id: string; at: string; other: PublicProfile };

export function feed(me: Profile): { items: FeedItem[] } {
  const db = getDb();
  const ctx = matchCtx(db);
  const need = buildNeed(me);
  const items: FeedItem[] = [];

  for (const p of db.posts) {
    const author = db.profiles.find((x) => x.id === p.authorId);
    if (!author || !canSee(db, me, author)) continue;
    items.push({
      type: "post",
      id: p.id,
      at: p.createdAt,
      post: p,
      author: pub(db, me, author),
      likes: p.likes.length,
      likedByMe: p.likes.includes(me.id),
      fit: author.id === me.id ? null : scoreCandidate(me, author, need, ctx).score,
      isMine: author.id === me.id,
    });
  }

  for (const t of db.teams) {
    const visible = t.members
      .filter((m) => m.status === "owner" || m.status === "accepted")
      .map((m) => db.profiles.find((x) => x.id === m.userId))
      .filter((p): p is Profile => Boolean(p) && canSee(db, me, p!));
    if (!visible.length) continue;
    items.push({
      type: "team",
      id: `team_${t.id}`,
      at: t.createdAt,
      teamId: t.id,
      title: t.title,
      status: t.status,
      members: visible.map((p) => pub(db, me, p)),
      openRoles: t.status === "forming" && t.ownerId !== me.id ? t.openRoles.map((r) => ({ roleId: r, label: roleLabel(r), myFit: Math.round(roleCoverage(me, r).coverage * 100) })) : [],
      ownerId: t.ownerId,
    });
  }

  for (const ev of db.events) {
    const here = db.memberships
      .filter((m) => m.eventId === ev.id && m.optIn && m.checkedInAt && m.userId !== me.id)
      .map((m) => ({ m, p: db.profiles.find((x) => x.id === m.userId) }))
      .filter((x): x is { m: (typeof db.memberships)[number]; p: Profile } => Boolean(x.p) && canSee(db, me, x.p!));
    if (!here.length) continue;
    const latest = here.map((x) => x.m.checkedInAt!).sort().at(-1)!;
    items.push({ type: "checkins", id: `checkins_${ev.id}`, at: latest, eventId: ev.id, eventTitle: ev.title, people: here.slice(0, 6).map((x) => pub(db, me, x.p)), count: here.length });
  }

  for (const r of db.requests) {
    if (r.status !== "accepted" || (r.fromId !== me.id && r.toId !== me.id)) continue;
    const other = db.profiles.find((x) => x.id === (r.fromId === me.id ? r.toId : r.fromId));
    if (other) items.push({ type: "connected", id: `conn_${r.id}`, at: r.respondedAt ?? r.createdAt, other: pub(db, me, other) });
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return { items: items.slice(0, 40) };
}

export function createPost(me: Profile, input: { body: string; kind: Post["kind"]; eventId?: string }) {
  const text = input.body.trim();
  if (text.length < 3) throw new ApiError(400, "Write a little more.");
  if (text.length > 600) throw new ApiError(400, "Keep posts under 600 characters.");
  return mutate((db) => {
    const t = tagText(text);
    const p: Post = { id: newId("p"), authorId: me.id, kind: input.kind, body: text, tags: [...t.skills, ...t.interests].slice(0, 6), eventId: input.eventId, likes: [], createdAt: nowIso() };
    db.posts.push(p);
    return p;
  });
}

export function toggleLike(me: Profile, postId: string) {
  return mutate((db) => {
    const p = db.posts.find((x) => x.id === postId);
    if (!p) throw new ApiError(404, "Post not found");
    p.likes = p.likes.includes(me.id) ? p.likes.filter((x) => x !== me.id) : [...p.likes, me.id];
    if (p.likes.includes(me.id) && p.authorId !== me.id) {
      notify(db, { userId: p.authorId, kind: "system", title: `${me.name} is interested in your post`, body: p.body.slice(0, 100), href: `/people/${me.id}` });
    }
    return { likes: p.likes.length, likedByMe: p.likes.includes(me.id) };
  });
}

export function deletePost(me: Profile, postId: string) {
  return mutate((db) => {
    const i = db.posts.findIndex((x) => x.id === postId && x.authorId === me.id);
    if (i < 0) throw new ApiError(404, "Post not found");
    db.posts.splice(i, 1);
    return { ok: true };
  });
}

// ---------- anti-stalking & preferences ----------

export function prefsOf(p: Pick<Profile, "prefs">): Prefs {
  return { ...DEFAULT_PREFS, ...(p.prefs ?? {}) };
}

/**
 * Log a profile view and stop stalking-like repetition: opening the same profile more than
 * PRIVACY.maxViewsPerHour times in an hour is refused. Views are pruned after 7 days.
 */
function recordView(me: Profile, target: Profile) {
  mutate((db) => {
    const now = Date.now();
    db.views = (db.views ?? []).filter((v) => now - new Date(v.at).getTime() < 7 * 86_400_000);
    const lastHour = db.views.filter((v) => v.viewerId === me.id && v.targetId === target.id && now - new Date(v.at).getTime() < 3_600_000);
    if (lastHour.length >= PRIVACY.maxViewsPerHour) {
      throw new ApiError(429, `You've opened ${target.name.split(" ")[0]}'s profile a lot in the last hour. Give it a break — repeated viewing is limited to protect people from stalking.`);
    }
    // Collapse rapid refreshes (polling, re-renders) into one view per 2 minutes.
    if (!lastHour.some((v) => now - new Date(v.at).getTime() < 120_000)) {
      db.views.push({ viewerId: me.id, targetId: target.id, at: new Date(now).toISOString() });
    }
  });
}

export function preferences(me: Profile) {
  const db = getDb();
  const p = prefsOf(me);
  const since = Date.now() - 86_400_000;
  // "Who viewed you" is reciprocal: only shown if you also let others see your views.
  const viewers = p.viewTransparency
    ? [...new Map(
        (db.views ?? [])
          .filter((v) => v.targetId === me.id && new Date(v.at).getTime() > since)
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((v) => [v.viewerId, v] as const),
      ).values()]
        .map((v) => ({ at: v.at, viewer: db.profiles.find((x) => x.id === v.viewerId) }))
        .filter((x): x is { at: string; viewer: Profile } => Boolean(x.viewer) && prefsOf(x.viewer!).viewTransparency)
        .map((x) => ({ at: x.at, profile: pub(db, me, x.viewer) }))
    : [];
  const blocked = db.blocks
    .filter((b) => b.userId === me.id)
    .map((b) => db.profiles.find((x) => x.id === b.blockedId))
    .filter((x): x is Profile => Boolean(x))
    .map((x) => ({ id: x.id, name: x.name, headline: x.headline, avatarHue: x.avatarHue, isDemo: x.isDemo }));
  return { prefs: p, visibility: me.visibility, allowRequests: me.allowRequests, viewers, blocked, privacy: PRIVACY };
}

export function updatePreferences(me: Profile, patch: Partial<Prefs> & { visibility?: Profile["visibility"]; allowRequests?: boolean }) {
  return mutate((db) => {
    const p = db.profiles.find((x) => x.id === me.id);
    if (!p) throw new ApiError(404, "Profile not found");
    const { visibility, allowRequests, ...prefPatch } = patch;
    p.prefs = { ...prefsOf(p), ...prefPatch };
    if (visibility) p.visibility = visibility;
    if (allowRequests !== undefined) p.allowRequests = allowRequests;
    return prefsOf(p);
  });
}

export function unblock(me: Profile, userId: string) {
  return mutate((db) => {
    db.blocks = db.blocks.filter((b) => !(b.userId === me.id && b.blockedId === userId));
    return { ok: true };
  });
}

// ---------- live map ----------

/** Deterministic pseudo-random in [0,1) from a string (FNV-1a). */
function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

const M_PER_DEG_LAT = 111_320;
function offset(lat: number, lng: number, dx: number, dy: number) {
  return { lat: lat + dy / M_PER_DEG_LAT, lng: lng + dx / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)) };
}

/** Map a zone's spot on the 100×60 venue grid to meters around the venue center. */
function zoneAnchor(ev: ConnectedEvent, zoneId?: string) {
  const z = ev.zones.find((x) => x.id === zoneId);
  if (!z || !ev.geo) return null;
  const cx = z.x + z.w / 2;
  const cy = z.y + z.h / 2;
  return offset(ev.geo.lat, ev.geo.lng, (cx - 50) * 3.6, (30 - cy) * 3.6);
}

export interface MapPerson {
  profile: PublicProfile;
  score: number;
  reasons: string[];
  lat: number;
  lng: number;
  zoneName?: string;
  live: boolean;
  liveLabel?: string;
  hereNow: boolean;
  requestState: ReturnType<typeof requestState>;
}

/**
 * Privacy-preserving live map for one event.
 * - Only people who opted in to this event, are discoverable to you, and aren't in ghost mode.
 * - You must be opted in yourself (reciprocity) and the event must be live.
 * - Positions are zone anchors + a per-viewer offset that re-randomizes every PRIVACY.refreshMinutes,
 *   so two viewers (or one viewer over time) can't triangulate anyone. Nobody's GPS is ever used.
 * - Zones with fewer than PRIVACY.minCrowd visible people become an anonymous crowd bubble.
 * - People who chose "compatible only" are shown just to viewers they'd match well with.
 */
export function liveMap(me: Profile, eventId?: string) {
  const db = getDb();
  const ctx = matchCtx(db);
  const now = new Date();
  const myPrefs = prefsOf(me);
  const myEvents = db.memberships.filter((m) => m.userId === me.id && m.optIn).map((m) => m.eventId);
  const liveEvents = db.events.filter((e) => new Date(e.start) <= now && new Date(e.end) >= now);
  const focus =
    db.events.find((e) => e.id === eventId) ??
    liveEvents.find((e) => myEvents.includes(e.id)) ??
    db.events.find((e) => e.id === CROWNHACKS_ID) ??
    db.events[0];

  // Event "towers": every upcoming/live event with a location.
  const need = buildNeed(me);
  const pool = discoveryPool(db, me);
  const events = db.events
    .filter((e) => e.geo && new Date(e.end) >= now)
    .map((e) => {
      const ms = db.memberships.filter((m) => m.eventId === e.id && m.optIn);
      const fits = ms
        .map((m) => pool.find((p) => p.id === m.userId))
        .filter((p): p is Profile => Boolean(p))
        .map((p) => scoreCandidate(me, p, { ...need, eventId: e.id }, ctx).score)
        .filter((s) => s >= 60).length;
      return {
        id: e.id,
        title: e.title,
        kind: e.kind,
        lat: e.geo!.lat,
        lng: e.geo!.lng,
        venue: e.venue,
        start: e.start,
        end: e.end,
        live: new Date(e.start) <= now && new Date(e.end) >= now,
        attendees: ms.length,
        strongMatches: fits,
        joined: myEvents.includes(e.id),
        isSample: e.isSample,
      };
    });

  const base = { center: focus.geo ?? { lat: 35.3071, lng: -80.7338 }, focus: publicEvent(focus), events, privacy: PRIVACY, myPrefs };
  const iAmIn = myEvents.includes(focus.id);
  const isLive = new Date(focus.start) <= now && new Date(focus.end) >= now;
  if (!iAmIn) return { ...base, people: [] as MapPerson[], crowds: [], me: { visible: false, reason: "Opt in to this event to see who's here." } };
  if (!isLive) return { ...base, people: [] as MapPerson[], crowds: [], me: { visible: false, reason: "People appear on the map only while the event is live." } };

  const bucket = Math.floor(now.getTime() / (PRIVACY.refreshMinutes * 60_000));
  const eventNeed = { ...need, eventId: focus.id };
  const candidates = discoveryPool(db, me, focus.id).filter((p) => !prefsOf(p).ghostMode);

  const placed: (MapPerson & { zoneId: string })[] = [];
  for (const p of candidates) {
    const m = db.memberships.find((x) => x.userId === p.id && x.eventId === focus.id)!;
    const match = scoreCandidate(me, p, eventNeed, ctx);
    const theirPrefs = prefsOf(p);
    if (theirPrefs.mapAudience === "compatible" && match.backward < 0.45) continue;
    if (match.score < myPrefs.minScore) continue;
    const live = Boolean(m.status && new Date(m.status.until) > now && m.status.mode !== "heads-down");
    if (myPrefs.openNowOnly && !live) continue;
    const zoneId = theirPrefs.showZone && m.zone ? m.zone : "_venue";
    const anchor = zoneId === "_venue" ? null : zoneAnchor(focus, zoneId);
    const center = anchor ?? focus.geo!;
    const spread = anchor ? PRIVACY.jitterMeters : PRIVACY.jitterMeters * 3;
    const a = hash01(`${me.id}|${p.id}|${bucket}|a`) * Math.PI * 2;
    const r = Math.sqrt(hash01(`${me.id}|${p.id}|${bucket}|r`)) * spread;
    const pos = offset(center.lat, center.lng, Math.cos(a) * r, Math.sin(a) * r);
    const mode = m.status?.mode;
    placed.push({
      profile: pub(db, me, p),
      score: match.score,
      reasons: match.reasons.slice(0, 2).map((x) => x.text),
      lat: pos.lat,
      lng: pos.lng,
      zoneId,
      zoneName: focus.zones.find((z) => z.id === zoneId)?.name,
      live,
      liveLabel: live ? (mode === "quick-chat" ? "Open to chat" : mode === "mentoring" ? "Mentoring" : "Teaming up") : undefined,
      hereNow: match.hereNow ?? false,
      requestState: requestState(db, me.id, p.id),
    });
  }

  // k-anonymity: small groups become an anonymous crowd bubble (no faces, no names).
  const byZone = new Map<string, typeof placed>();
  for (const x of placed) byZone.set(x.zoneId, [...(byZone.get(x.zoneId) ?? []), x]);
  const people: MapPerson[] = [];
  const crowds: { lat: number; lng: number; count: number; zoneName?: string }[] = [];
  for (const [zoneId, list] of byZone) {
    if (list.length >= PRIVACY.minCrowd) {
      people.push(...list.map(({ zoneId: _z, ...rest }) => rest));
    } else {
      const anchor = (zoneId !== "_venue" && zoneAnchor(focus, zoneId)) || focus.geo!;
      crowds.push({ lat: anchor.lat, lng: anchor.lng, count: list.length, zoneName: focus.zones.find((z) => z.id === zoneId)?.name });
    }
  }
  people.sort((a, b) => b.score - a.score);
  return {
    ...base,
    people,
    crowds,
    me: myPrefs.ghostMode ? { visible: false, reason: "Ghost mode is on — nobody sees you on the map." } : { visible: true, reason: "Others see you near your zone, never your exact spot." },
  };
}

// ---------- event lounge (public chat) & photos ----------

const REPORT_HIDE_THRESHOLD = 3;

/** Realtime topics follow the same access rules as the data behind them. */
export function canSubscribe(me: Profile, topic: string): boolean {
  const i = topic.indexOf(":");
  if (i < 1) return false;
  const kind = topic.slice(0, i);
  const id = topic.slice(i + 1);
  const db = getDb();
  if (kind === "user") return id === me.id;
  if (kind === "lounge") return db.events.some((e) => e.id === id) && db.memberships.some((m) => m.userId === me.id && m.eventId === id);
  if (kind === "thread") {
    const t = db.teams.find((x) => x.id === id);
    if (t) return t.ownerId === me.id || (!blocked(db, me.id, t.ownerId) && t.members.some((m) => m.userId === me.id && m.status !== "declined"));
    const r = db.requests.find((x) => x.id === id);
    return Boolean(r && r.status === "accepted" && (r.fromId === me.id || r.toId === me.id) && !blocked(db, r.fromId, r.toId));
  }
  return false;
}

function requireMember(db: Database, me: Profile, eventId: string) {
  const ev = db.events.find((e) => e.id === eventId);
  if (!ev) throw new ApiError(404, "Event not found");
  if (!db.memberships.some((m) => m.userId === me.id && m.eventId === eventId)) throw new ApiError(403, "Join the event to see its lounge.");
  return ev;
}

export function lounge(me: Profile, eventId: string) {
  const db = getDb();
  const ev = requireMember(db, me, eventId);
  const authors = new Map<string, PublicProfile>();
  const messages = (db.lounge ?? [])
    .filter((m) => m.eventId === eventId && m.reports.length < REPORT_HIDE_THRESHOLD && !blocked(db, me.id, m.userId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-100)
    .map((m) => {
      if (!authors.has(m.userId)) {
        const p = db.profiles.find((x) => x.id === m.userId);
        if (p) authors.set(m.userId, pub(db, me, p));
      }
      return { id: m.id, userId: m.userId, body: m.body, createdAt: m.createdAt, mine: m.userId === me.id, reportedByMe: m.reports.includes(me.id) };
    });
  const photos = (db.photos ?? [])
    .filter((p) => p.eventId === eventId && p.reports.length < REPORT_HIDE_THRESHOLD && !blocked(db, me.id, p.userId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => {
      if (!authors.has(p.userId)) {
        const u = db.profiles.find((x) => x.id === p.userId);
        if (u) authors.set(p.userId, pub(db, me, u));
      }
      return { id: p.id, userId: p.userId, caption: p.caption, url: `/api/photos/${p.id}`, likes: p.likes.length, likedByMe: p.likes.includes(me.id), createdAt: p.createdAt, mine: p.userId === me.id };
    });
  const online = db.memberships.filter((m) => m.eventId === eventId && m.optIn && m.checkedInAt).length;
  return { event: { id: ev.id, title: ev.title }, messages, photos, authors: Object.fromEntries(authors), online };
}

export function postLounge(me: Profile, eventId: string, body: string) {
  const text = body.trim();
  if (!text) throw new ApiError(400, "Message is empty.");
  if (text.length > 500) throw new ApiError(400, "Keep it under 500 characters.");
  return mutate((db) => {
    requireMember(db, me, eventId);
    db.lounge ??= [];
    const now = Date.now();
    const mine = db.lounge.filter((m) => m.userId === me.id && now - new Date(m.createdAt).getTime() < 10 * 60_000);
    if (mine.some((m) => now - new Date(m.createdAt).getTime() < 2_500)) throw new ApiError(429, "Slow down a little.");
    if (mine.length >= 20) throw new ApiError(429, "You've posted a lot — take a short break.");
    const msg = { id: newId("lg"), eventId, userId: me.id, body: text, createdAt: new Date(now).toISOString(), reports: [] as string[] };
    db.lounge.push(msg);
    if (db.lounge.length > 5000) db.lounge.splice(0, db.lounge.length - 5000);
    publish(`lounge:${eventId}`);
    return msg;
  });
}

export function reportLounge(me: Profile, messageId: string) {
  return mutate((db) => {
    const m = (db.lounge ?? []).find((x) => x.id === messageId);
    if (!m) throw new ApiError(404, "Message not found");
    publish(`lounge:${m.eventId}`);
    if (m.userId === me.id) {
      db.lounge = db.lounge.filter((x) => x.id !== messageId); // reporting your own = delete
      return { deleted: true };
    }
    if (!m.reports.includes(me.id)) m.reports.push(me.id);
    return { hidden: m.reports.length >= REPORT_HIDE_THRESHOLD };
  });
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

export async function uploadPhoto(me: Profile, eventId: string, file: File, caption: string) {
  const ext = PHOTO_TYPES[file.type];
  if (!ext) throw new ApiError(415, "Only JPEG, PNG, WebP or GIF images.");
  if (file.size > MAX_PHOTO_BYTES) throw new ApiError(413, "Photos must be under 6 MB.");
  const db = getDb();
  requireMember(db, me, eventId);
  const recent = (db.photos ?? []).filter((p) => p.userId === me.id && Date.now() - new Date(p.createdAt).getTime() < 3_600_000);
  if (recent.length >= 15) throw new ApiError(429, "Photo limit reached for this hour.");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Verify the magic bytes really are an image (don't trust the browser's MIME label).
  const sig = bytes.subarray(0, 12).toString("hex");
  const looksLikeImage = sig.startsWith("ffd8ff") || sig.startsWith("89504e47") || sig.startsWith("47494638") || (sig.startsWith("52494646") && bytes.subarray(8, 12).toString() === "WEBP");
  if (!looksLikeImage) throw new ApiError(415, "That file doesn't look like an image.");
  const id = newId("ph");
  const fileName = `${id}.${ext}`;
  const { photosDir } = await import("./store");
  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.writeFileSync(path.join(photosDir(), fileName), bytes);
  return mutate((d) => {
    d.photos ??= [];
    const photo = { id, eventId, userId: me.id, file: fileName, mime: file.type, caption: caption.trim().slice(0, 200), likes: [] as string[], reports: [] as string[], createdAt: new Date().toISOString() };
    d.photos.push(photo);
    publish(`lounge:${eventId}`);
    return photo;
  });
}

export function photoFile(me: Profile, photoId: string) {
  const db = getDb();
  const p = (db.photos ?? []).find((x) => x.id === photoId);
  if (!p || p.reports.length >= REPORT_HIDE_THRESHOLD) throw new ApiError(404, "Photo not found");
  if (!db.memberships.some((m) => m.userId === me.id && m.eventId === p.eventId)) throw new ApiError(403, "Join the event to see its photos.");
  return p;
}

export function photoAction(me: Profile, photoId: string, action: "like" | "report" | "delete") {
  return mutate((db) => {
    const p = (db.photos ?? []).find((x) => x.id === photoId);
    if (!p) throw new ApiError(404, "Photo not found");
    publish(`lounge:${p.eventId}`);
    if (action === "delete") {
      if (p.userId !== me.id) throw new ApiError(403, "You can only delete your own photos.");
      db.photos = db.photos.filter((x) => x.id !== photoId);
      return { deleted: true };
    }
    const list = action === "like" ? p.likes : p.reports;
    const i = list.indexOf(me.id);
    if (action === "like" && i >= 0) list.splice(i, 1);
    else if (i < 0) list.push(me.id);
    return { likes: p.likes.length, likedByMe: p.likes.includes(me.id) };
  });
}

/** Events as clients may see them: the venue check-in code never leaves the server. */
export function publicEvent<T extends { checkInCode?: string }>(ev: T): Omit<T, "checkInCode"> {
  const { checkInCode: _code, ...rest } = ev;
  return rest;
}

// ---------- profile ----------

export function updateProfile(me: Profile, patch: Partial<Profile>) {
  return mutate((db) => {
    const p = db.profiles.find((x) => x.id === me.id);
    if (!p) throw new ApiError(404, "Profile not found");
    const allowed: (keyof Profile)[] = [
      "name", "pronouns", "headline", "role", "university", "major", "gradYear", "bio", "skills", "interests", "gives", "ask",
      "lookingFor", "openTo", "introsOffered", "availability", "area", "visibility", "allowRequests", "links",
    ];
    for (const k of allowed) if (k in patch) (p as unknown as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
    // Links merge (a form that only knows some networks must not wipe the others).
    if (patch.links) p.links = { ...(me.links ?? {}), ...patch.links };
    return p;
  });
}

// Explainable, reciprocal people matching.
//
// Pipeline: hard filters (done by the caller, see store/discovery) → factor scoring → reciprocity
// → grounded reasons → next step. Every number here traces back to profile fields, so the
// explanation can never claim something the data doesn't say.

import {
  collabCompat,
  COLLAB_LABELS,
  interestLabel,
  interestsRelated,
  ROLE_BY_ID,
  roleLabel,
  SKILL_BY_ID,
  skillLabel,
  tagText,
} from "../ontology";
import type {
  CollabType,
  ConnectedEvent,
  Intent,
  LiveMode,
  MatchResult,
  Membership,
  Profile,
  PublicProfile,
  Reason,
  ScoreBreakdown,
} from "../types";

export const WEIGHTS = {
  skills: 0.3,
  interests: 0.2,
  goals: 0.2,
  willing: 0.1,
  event: 0.15,
  availability: 0.05,
} as const;

/** Share of the final score that comes from reciprocity ("would they want to meet you too?"). */
export const RECIPROCITY_SHARE = 0.2;

const LEVEL_CREDIT = { 1: 0.5, 2: 0.8, 3: 1 } as const;
const RELATED_CREDIT = 0.45;
const NOISY_OR_ALPHA = 0.85;

export interface MatchContext {
  now: Date;
  memberships: Membership[];
  events: ConnectedEvent[];
}

export interface Need {
  roles: { roleId: string; weight: number }[];
  skills: string[];
  interests: string[];
  kinds: CollabType[];
  topics: string[]; // skill/interest ids the user wants help with
  eventId?: string;
  isProject: boolean;
}

// ---------- primitives ----------

/** How much credit a person gets for a skill: exact level, or partial credit through a related skill. */
export function skillCredit(p: Pick<Profile, "skills">, skillId: string): { credit: number; via?: string } {
  let best = 0;
  let via: string | undefined;
  for (const us of p.skills) {
    if (us.skill === skillId) {
      const c = LEVEL_CREDIT[us.level];
      if (c > best) {
        best = c;
        via = undefined;
      }
    } else if (SKILL_BY_ID[us.skill]?.related.includes(skillId) || SKILL_BY_ID[skillId]?.related.includes(us.skill)) {
      const c = LEVEL_CREDIT[us.level] * RELATED_CREDIT;
      if (c > best) {
        best = c;
        via = us.skill;
      }
    }
  }
  return { credit: best, via };
}

/**
 * Role coverage as a noisy-OR over the role's skills: one expert skill already covers most of a role,
 * additional skills push it toward 1. Returns the skills that contributed most (for explanations).
 */
export function roleCoverage(p: Pick<Profile, "skills">, roleId: string): { coverage: number; evidence: string[] } {
  const role = ROLE_BY_ID[roleId];
  if (!role) return { coverage: 0, evidence: [] };
  let miss = 1;
  const contrib: { skill: string; c: number }[] = [];
  for (const sk of role.skills) {
    const { credit } = skillCredit(p, sk);
    if (credit > 0) {
      miss *= 1 - NOISY_OR_ALPHA * credit;
      contrib.push({ skill: sk, c: credit });
    }
  }
  contrib.sort((a, b) => b.c - a.c);
  const exactEvidence = contrib.filter((c) => p.skills.some((s) => s.skill === c.skill)).map((c) => c.skill);
  return { coverage: 1 - miss, evidence: exactEvidence.slice(0, 3) };
}

export function interestSimilarity(a: string[], b: string[]): { score: number; shared: string[]; related: [string, string][] } {
  if (!a.length || !b.length) return { score: 0, shared: [], related: [] };
  const shared = a.filter((x) => b.includes(x));
  const related: [string, string][] = [];
  for (const x of a) {
    if (shared.includes(x)) continue;
    const y = b.find((yy) => !shared.includes(yy) && interestsRelated(x, yy));
    if (y) related.push([x, y]);
  }
  const raw = shared.length + 0.5 * related.length;
  const denom = Math.min(a.length, b.length, 4);
  return { score: Math.min(1, raw / denom), shared, related };
}

function bestCollab(seekerKinds: CollabType[], candidateKinds: CollabType[]): { score: number; pair?: [CollabType, CollabType] } {
  let best = 0;
  let pair: [CollabType, CollabType] | undefined;
  for (const a of seekerKinds) {
    for (const b of candidateKinds) {
      const c = collabCompat(a, b);
      if (c > best) {
        best = c;
        pair = [a, b];
      }
    }
  }
  return { score: best, pair };
}

export function activeStatus(userId: string, ctx: MatchContext, eventId?: string) {
  const ms = ctx.memberships.filter(
    (m) => m.userId === userId && m.optIn && m.status && new Date(m.status.until) > ctx.now && (!eventId || m.eventId === eventId),
  );
  return ms.find((m) => m.status!.mode !== "heads-down") ?? ms[0];
}

function optedInEvents(userId: string, ctx: MatchContext): string[] {
  return ctx.memberships.filter((m) => m.userId === userId && m.optIn).map((m) => m.eventId);
}

export function buildNeed(seeker: Profile, intent?: Intent | null, eventId?: string): Need {
  if (intent && (intent.roles.length || intent.skills.length || intent.interests.length || intent.kind)) {
    return {
      roles: intent.roles.map((r) => ({ roleId: r.roleId, weight: r.weight })),
      skills: intent.skills,
      interests: [...new Set([...intent.interests, ...seeker.interests])],
      kinds: intent.kind ? [intent.kind] : seeker.openTo,
      topics: [...new Set([...intent.helpTopics, ...intent.skills])],
      eventId,
      isProject: intent.isProject,
    };
  }
  const askTags = tagText(seeker.ask);
  return {
    roles: seeker.lookingFor.map((r) => ({ roleId: r, weight: 1 })),
    skills: askTags.skills,
    interests: seeker.interests,
    kinds: seeker.openTo,
    topics: [...askTags.skills, ...askTags.interests],
    eventId,
    isProject: false,
  };
}

export function toPublic(p: Profile, canRequest: boolean): PublicProfile {
  const { visibility: _v, allowRequests: _a, createdAt: _c, ...rest } = p;
  return { ...rest, canRequest };
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// ---------- the scorer ----------

export function scoreCandidate(seeker: Profile, candidate: Profile, need: Need, ctx: MatchContext): MatchResult {
  const reasons: Reason[] = [];
  const fwdScale = (1 - RECIPROCITY_SHARE) * 100;

  // 1) Complementary skills
  let skillsV = 0;
  let bestRole: { roleId: string; coverage: number } | undefined;
  let skillText = "";
  if (need.roles.length) {
    const maxW = Math.max(...need.roles.map((r) => r.weight));
    for (const r of need.roles) {
      const cov = roleCoverage(candidate, r.roleId);
      // Complementarity: a role the seeker already covers well is worth less.
      const seekerCov = roleCoverage(seeker, r.roleId).coverage;
      const comp = seekerCov >= 0.8 ? 0.6 : seekerCov >= 0.5 ? 0.85 : 1;
      const v = cov.coverage * (r.weight / maxW) * comp;
      if (v > skillsV) {
        skillsV = v;
        bestRole = { roleId: r.roleId, coverage: cov.coverage };
        const ev = cov.evidence.map((e) => {
          const lvl = candidate.skills.find((s) => s.skill === e)?.level;
          return lvl === 3 ? `${skillLabel(e)} (expert)` : skillLabel(e);
        });
        skillText = ev.length
          ? `${ev.slice(0, 2).join(" and ")} — covers the ${roleLabel(r.roleId)} role you need (${Math.round(cov.coverage * 100)}%).`
          : `Related experience for the ${roleLabel(r.roleId)} role (${Math.round(cov.coverage * 100)}%).`;
      }
    }
  }
  if (need.skills.length) {
    const credits = need.skills.map((sk) => ({ sk, ...skillCredit(candidate, sk) }));
    const v = credits.reduce((a, c) => a + c.credit, 0) / need.skills.length;
    if (v > skillsV) {
      skillsV = v;
      const hits = credits.filter((c) => c.credit >= 0.5).map((c) => skillLabel(c.sk));
      skillText = hits.length ? `Has ${hits.slice(0, 3).join(", ")} — skills you mentioned.` : "Has skills related to what you mentioned.";
    }
  }
  if (!need.roles.length && !need.skills.length) {
    // No explicit need: reward skills the seeker lacks (complementary, not identical).
    const strong = candidate.skills.filter((s) => s.level >= 2);
    const novel = strong.filter((s) => skillCredit(seeker, s.skill).credit < 0.4);
    skillsV = strong.length ? 0.25 + 0.6 * (novel.length / strong.length) : 0.1;
    if (novel.length) skillText = `Brings skills you don't have: ${novel.slice(0, 3).map((s) => skillLabel(s.skill)).join(", ")}.`;
  }
  if (skillText && skillsV > 0.15) reasons.push({ kind: "skills", text: skillText, points: skillsV * WEIGHTS.skills * fwdScale });

  // 2) Shared interests
  const sim = interestSimilarity(need.interests, candidate.interests);
  if (sim.shared.length) {
    reasons.push({
      kind: "interests",
      text: `You both care about ${listJoin(sim.shared.slice(0, 3).map(interestLabel))}.`,
      points: sim.score * WEIGHTS.interests * fwdScale,
    });
  } else if (sim.related.length) {
    const [a, b] = sim.related[0];
    reasons.push({
      kind: "interests",
      text: `Their interest in ${interestLabel(b)} is close to your ${interestLabel(a)}.`,
      points: sim.score * WEIGHTS.interests * fwdScale,
    });
  }

  // 3) Goal compatibility
  const collab = bestCollab(need.kinds, candidate.openTo);
  if (collab.pair && collab.score >= 0.5) {
    const [a, b] = collab.pair;
    const text =
      a === b
        ? `Also ${COLLAB_LABELS[b].toLowerCase()}.`
        : `Open to ${COLLAB_LABELS[b].toLowerCase().replace(/^looking for /, "")} — you're ${COLLAB_LABELS[a].toLowerCase()}.`;
    reasons.push({ kind: "goals", text, points: collab.score * WEIGHTS.goals * fwdScale });
  }

  // 4) Explicit willingness to help (their "gives")
  let willingV = 0;
  let willingText = "";
  if (need.topics.length && candidate.gives.length) {
    for (const g of candidate.gives) {
      const tags = tagText(g);
      const overlap = [...tags.skills, ...tags.interests].filter((t) => need.topics.includes(t)).length;
      if (overlap > 0) {
        const v = Math.min(1, 0.6 + 0.2 * overlap);
        if (v > willingV) {
          willingV = v;
          willingText = `Offered to help with “${g}”.`;
        }
      }
    }
  }
  if (!willingV && candidate.gives.length && need.kinds.includes("mentorship-get") && candidate.openTo.includes("mentorship-give")) {
    willingV = 0.5;
    willingText = `Offers mentoring: “${candidate.gives[0]}”.`;
  }
  if (willingV) reasons.push({ kind: "willing", text: willingText, points: willingV * WEIGHTS.willing * fwdScale });

  // 5) Event overlap & live presence
  const seekerEvents = optedInEvents(seeker.id, ctx);
  const candEvents = optedInEvents(candidate.id, ctx);
  const sharedEvents = seekerEvents.filter((e) => candEvents.includes(e));
  let eventV = 0;
  let liveNow: MatchResult["liveNow"];
  const focus = need.eventId && candEvents.includes(need.eventId) ? need.eventId : sharedEvents[0];
  let hereNow = false;
  if (focus) {
    eventV = need.eventId && focus === need.eventId ? 1 : 0.75;
    const ev = ctx.events.find((e) => e.id === focus);
    const m = ctx.memberships.find((mm) => mm.userId === candidate.id && mm.eventId === focus);
    const zone = ev?.zones.find((z) => z.id === m?.zone)?.name;
    hereNow = Boolean(m?.checkedInAt && ev && new Date(m.checkedInAt) >= new Date(new Date(ev.start).getTime() - 6 * 3_600_000));
    reasons.push({
      kind: "event",
      text: hereNow
        ? `Checked in at ${ev?.title ?? "the venue"}${zone ? ` · near ${zone}` : ""}.`
        : `In the ${ev?.title ?? "same event"} networking space${zone ? ` · near ${zone}` : ""}.`,
      points: eventV * WEIGHTS.event * fwdScale,
    });
  }

  // 6) Availability (time-boxed live status beats a static setting)
  const live = activeStatus(candidate.id, ctx, need.eventId);
  let availV = candidate.availability === "high" ? 1 : candidate.availability === "medium" ? 0.6 : 0.3;
  if (live?.status) {
    const mode: LiveMode = live.status.mode;
    availV = mode === "heads-down" ? 0.2 : 1;
    liveNow = { eventId: live.eventId, zone: live.zone, mode, until: live.status.until };
    if (mode !== "heads-down") {
      const label = mode === "quick-chat" ? "a quick chat" : mode === "mentoring" ? "mentoring" : "teaming up";
      reasons.push({ kind: "availability", text: `Open to ${label} until ${fmtTime(live.status.until)}.`, points: availV * WEIGHTS.availability * fwdScale });
    }
  }

  const forward =
    WEIGHTS.skills * skillsV +
    WEIGHTS.interests * sim.score +
    WEIGHTS.goals * collab.score +
    WEIGHTS.willing * willingV +
    WEIGHTS.event * eventV +
    WEIGHTS.availability * availV;

  // 7) Reciprocity — how well the seeker fits what the candidate is looking for.
  let lookingCov = 0.5;
  let lookingRole: string | undefined;
  if (candidate.lookingFor.length) {
    lookingCov = 0;
    for (const r of candidate.lookingFor) {
      const c = roleCoverage(seeker, r).coverage;
      if (c > lookingCov) {
        lookingCov = c;
        lookingRole = r;
      }
    }
  }
  const backSim = interestSimilarity(candidate.interests, seeker.interests).score;
  const backCollab = bestCollab(candidate.openTo, seeker.openTo).score;
  const backward = 0.5 * lookingCov + 0.25 * backSim + 0.25 * backCollab;
  if (lookingRole && lookingCov >= 0.5) {
    reasons.push({
      kind: "mutual",
      text: `It's mutual: they're looking for a ${roleLabel(lookingRole)}, and your profile fits.`,
      points: backward * RECIPROCITY_SHARE * 100,
    });
  }

  // Warm path: they will consider intros in a domain you care about (never implies a guaranteed intro).
  const introDomain = candidate.introsOffered.find((d) => need.interests.includes(d));
  if (introDomain) {
    reasons.push({ kind: "intro", text: `Will consider making intros in ${interestLabel(introDomain)} (their choice).`, points: 0 });
  }

  const score = Math.round(100 * ((1 - RECIPROCITY_SHARE) * forward + RECIPROCITY_SHARE * backward));
  const breakdown: ScoreBreakdown = {
    skills: round1(skillsV * WEIGHTS.skills * fwdScale),
    interests: round1(sim.score * WEIGHTS.interests * fwdScale),
    goals: round1(collab.score * WEIGHTS.goals * fwdScale),
    willing: round1(willingV * WEIGHTS.willing * fwdScale),
    event: round1(eventV * WEIGHTS.event * fwdScale),
    availability: round1(availV * WEIGHTS.availability * fwdScale),
    mutual: round1(backward * RECIPROCITY_SHARE * 100),
  };

  reasons.sort((a, b) => b.points - a.points);

  return {
    profile: toPublic(candidate, candidate.allowRequests),
    score: Math.min(99, score),
    forward,
    backward,
    breakdown,
    reasons,
    bestRole,
    liveNow,
    hereNow,
    nextStep: nextStep(need, liveNow, ctx),
  };
}

function nextStep(need: Need, live: MatchResult["liveNow"], ctx: MatchContext): string {
  if (live && live.mode !== "heads-down") {
    const ev = ctx.events.find((e) => e.id === live.eventId);
    const zone = ev?.zones.find((z) => z.id === live.zone)?.name;
    return `Ask for a 10-minute chat${zone ? ` at ${zone}` : ""}`;
  }
  if (need.isProject) return "Invite them to your team";
  if (need.kinds.includes("mentorship-get") || need.kinds.includes("internship")) return "Ask one specific question";
  if (need.kinds.includes("cofounder")) return "Suggest a 20-minute idea jam";
  return "Send a request with a specific ask";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Points subtracted per already-shown match that fills the same role (diversity re-ranking). */
export const DIVERSITY_PENALTY = 10;

/**
 * Rank candidates. When the need spans several roles, re-rank with a maximal-marginal-relevance
 * style penalty (Carbonell & Goldstein, 1998) so the list covers every role you asked for instead
 * of showing eight backend engineers. Scores themselves are not changed — only the order.
 */
export function rankCandidates(seeker: Profile, pool: Profile[], need: Need, ctx: MatchContext, limit = 12): MatchResult[] {
  const scored = pool
    .filter((p) => p.id !== seeker.id)
    .map((p) => scoreCandidate(seeker, p, need, ctx))
    .sort((a, b) => b.score - a.score);
  if (need.roles.length < 2) return scored.slice(0, limit);

  const out: MatchResult[] = [];
  const shown = new Map<string, number>();
  const remaining = scored.slice();
  while (out.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const m = remaining[i];
      const role = m.bestRole && m.bestRole.coverage >= 0.5 ? m.bestRole.roleId : "_none";
      const adj = m.score - DIVERSITY_PENALTY * (shown.get(role) ?? 0);
      if (adj > bestAdj) {
        bestAdj = adj;
        bestIdx = i;
      }
    }
    const [pick] = remaining.splice(bestIdx, 1);
    const role = pick.bestRole && pick.bestRole.coverage >= 0.5 ? pick.bestRole.roleId : "_none";
    shown.set(role, (shown.get(role) ?? 0) + 1);
    out.push(pick);
  }
  return out;
}

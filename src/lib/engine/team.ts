// AI team formation as constrained optimization.
//
// Objective for a candidate team T (plus the owner o):
//   f(T) = Σ_r w_r · max_{p ∈ T∪{o}} cov(p, r) / Σ_r w_r          (weighted role coverage — facility-location, monotone submodular)
//        + λ · cohesion(T ∪ {o})                                     (shared interests, compatible goals, same event)
//        + μ · mean_p reciprocity(p)                                 (would each person want this team?)
//        − κ · |T|                                                    (small cost per extra person → no padding)
//
// Coverage alone is submodular, so plain greedy is within (1 − 1/e) of optimal for it
// (Nemhauser, Wolsey & Fisher 1978). Cohesion breaks that guarantee, so we follow greedy with
// 1-swap local search. When the search space is small enough (≤ EXACT_LIMIT combinations) we
// enumerate every team and return the exact optimum — and report which method ran.
// Team formation with coverage + communication cost is NP-hard in general (Lappas, Liu & Terzi, KDD 2009).

import { collabCompat, interestLabel, ROLE_BY_ID, roleLabel, skillLabel } from "../ontology";
import type { CollabType, Profile, TeamResult, TeamSlotResult } from "../types";
import { interestSimilarity, roleCoverage, type MatchContext } from "./match";

export const TEAM_LAMBDA = 0.25;
export const TEAM_MU = 0.1;
export const TEAM_KAPPA = 0.02;
export const EXACT_LIMIT = 60_000;
export const GAP_THRESHOLD = 0.45;

export interface RoleNeedInput {
  roleId: string;
  weight: number;
  why: string;
}

export interface TeamInput {
  owner: Profile;
  roles: RoleNeedInput[];
  pool: Profile[];
  maxSize: number; // additional members, excluding the owner (1..5)
  eventId?: string;
  locked?: string[]; // user ids that must be on the team
  ctx: MatchContext;
  forceMethod?: "exact" | "greedy";
}

interface Prepared {
  people: Profile[]; // index 0 = owner
  cov: number[][]; // cov[personIdx][roleIdx]
  pair: number[][]; // cohesion between people
  recip: number[]; // per-person reciprocity toward this project
  weights: number[];
  wSum: number;
}

const TEAM_KINDS: CollabType[] = ["hackathon-team", "project", "cofounder"];

function pairCohesion(a: Profile, b: Profile, ctx: MatchContext, eventId?: string): number {
  const interests = interestSimilarity(a.interests, b.interests).score;
  let goals = 0;
  for (const x of a.openTo) for (const y of b.openTo) goals = Math.max(goals, collabCompat(x, y));
  let sameEvent = 0;
  if (eventId) {
    const inA = ctx.memberships.some((m) => m.userId === a.id && m.eventId === eventId && m.optIn);
    const inB = ctx.memberships.some((m) => m.userId === b.id && m.eventId === eventId && m.optIn);
    sameEvent = inA && inB ? 1 : 0;
  } else {
    const evA = ctx.memberships.filter((m) => m.userId === a.id && m.optIn).map((m) => m.eventId);
    sameEvent = ctx.memberships.some((m) => m.userId === b.id && m.optIn && evA.includes(m.eventId)) ? 1 : 0;
  }
  return (interests + goals + sameEvent) / 3;
}

function reciprocity(p: Profile, owner: Profile, roles: RoleNeedInput[]): number {
  // Wants to be on a team, and the owner covers something p is looking for (or p has no preference).
  const wantsTeam = p.openTo.some((k) => TEAM_KINDS.includes(k)) ? 1 : 0.3;
  let looking = 0.5;
  if (p.lookingFor.length) {
    looking = Math.max(0, ...p.lookingFor.map((r) => roleCoverage(owner, r).coverage));
  }
  const avail = p.availability === "high" ? 1 : p.availability === "medium" ? 0.7 : 0.35;
  void roles;
  return 0.45 * wantsTeam + 0.3 * looking + 0.25 * avail;
}

function prepare(input: TeamInput): Prepared {
  const people = [input.owner, ...input.pool.filter((p) => p.id !== input.owner.id)];
  const cov = people.map((p) => input.roles.map((r) => roleCoverage(p, r.roleId).coverage));
  // Interest similarity is directional, so symmetrize: the objective must not depend on member order.
  const raw = people.map((a) => people.map((b) => (a.id === b.id ? 0 : pairCohesion(a, b, input.ctx, input.eventId))));
  const pair = raw.map((row, i) => row.map((v, j) => (v + raw[j][i]) / 2));
  const recip = people.map((p, i) => (i === 0 ? 1 : reciprocity(p, input.owner, input.roles)));
  const weights = input.roles.map((r) => r.weight);
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  return { people, cov, pair, recip, weights, wSum };
}

/** Objective over a set of person indices (excluding the owner, who is always index 0). */
function objective(P: Prepared, members: number[]): { f: number; coverage: number; cohesion: number } {
  const all = [0, ...members];
  let covSum = 0;
  for (let r = 0; r < P.weights.length; r++) {
    let best = 0;
    for (const i of all) if (P.cov[i][r] > best) best = P.cov[i][r];
    covSum += P.weights[r] * best;
  }
  const coverage = covSum / P.wSum;
  let cohesion = 0;
  let pairs = 0;
  for (let a = 0; a < all.length; a++) {
    for (let b = a + 1; b < all.length; b++) {
      cohesion += P.pair[all[a]][all[b]];
      pairs++;
    }
  }
  cohesion = pairs ? cohesion / pairs : 0;
  const recip = members.length ? members.reduce((s, i) => s + P.recip[i], 0) / members.length : 0;
  const f = coverage + TEAM_LAMBDA * cohesion + TEAM_MU * recip - TEAM_KAPPA * members.length;
  return { f, coverage, cohesion };
}

function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

function* combinations(items: number[], k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

export function solveExact(P: Prepared, maxSize: number, locked: number[]): { members: number[]; evaluated: number } {
  const free = P.people.map((_, i) => i).filter((i) => i !== 0 && !locked.includes(i));
  let best: number[] = locked.slice();
  let bestF = objective(P, best).f;
  let evaluated = 1;
  for (let k = 1; k <= maxSize - locked.length; k++) {
    for (const combo of combinations(free, k)) {
      const members = [...locked, ...combo];
      const { f } = objective(P, members);
      evaluated++;
      if (f > bestF + 1e-12) {
        bestF = f;
        best = members;
      }
    }
  }
  return { members: best, evaluated };
}

export const MULTI_START = 6;

/**
 * Multi-start greedy + local search. Each start seeds the team with one of the strongest
 * individual candidates, then runs greedy additions followed by swap/drop/add local search.
 */
export function solveGreedy(P: Prepared, maxSize: number, locked: number[]): { members: number[]; evaluated: number } {
  let evaluated = 0;
  const singles = P.people
    .map((_, i) => i)
    .filter((i) => i !== 0 && !locked.includes(i))
    .map((i) => ({ i, f: objective(P, [...locked, i]).f }))
    .sort((a, b) => b.f - a.f);
  evaluated += singles.length;
  const seeds: number[][] = [locked.slice(), ...singles.slice(0, MULTI_START).map((s) => [...locked, s.i])];
  let best: number[] = locked.slice();
  let bestF = -Infinity;
  for (const seed of seeds) {
    if (seed.length > maxSize) continue;
    const run = greedyFrom(P, maxSize, locked, seed);
    evaluated += run.evaluated;
    const f = objective(P, run.members).f;
    if (f > bestF + 1e-12) {
      bestF = f;
      best = run.members;
    }
  }
  return { members: best, evaluated };
}

function greedyFrom(P: Prepared, maxSize: number, locked: number[], seed: number[]): { members: number[]; evaluated: number } {
  const members = seed.slice();
  let evaluated = 0;
  let current = objective(P, members).f;
  const candidates = () => P.people.map((_, i) => i).filter((i) => i !== 0 && !members.includes(i));

  // Greedy: add the person with the best marginal gain; stop when nobody adds value.
  while (members.length < maxSize) {
    let bestI = -1;
    let bestF = current;
    for (const i of candidates()) {
      const { f } = objective(P, [...members, i]);
      evaluated++;
      if (f > bestF + 1e-9) {
        bestF = f;
        bestI = i;
      }
    }
    if (bestI < 0) break;
    members.push(bestI);
    current = bestF;
  }

  // Local search: 1-swap, drop, and add moves until no move improves the objective.
  let improved = true;
  let rounds = 0;
  while (improved && rounds < 25) {
    improved = false;
    rounds++;
    if (members.length < maxSize) {
      for (const c of candidates()) {
        const { f } = objective(P, [...members, c]);
        evaluated++;
        if (f > current + 1e-9) {
          members.push(c);
          current = f;
          improved = true;
          break;
        }
      }
    }
    for (let mi = 0; mi < members.length; mi++) {
      if (locked.includes(members[mi])) continue;
      const without = members.filter((_, j) => j !== mi);
      const dropF = objective(P, without).f;
      evaluated++;
      if (dropF > current + 1e-9) {
        members.splice(mi, 1);
        current = dropF;
        improved = true;
        break;
      }
      for (const c of candidates()) {
        const trial = [...without, c];
        const { f } = objective(P, trial);
        evaluated++;
        if (f > current + 1e-9) {
          members[mi] = c;
          current = f;
          improved = true;
        }
      }
    }
  }
  return { members, evaluated };
}

/**
 * Give each invited member one distinct primary role via an exact maximum-weight assignment
 * (brute force over role permutations — at most P(16,5) but in practice P(7,4) = 840).
 * Roles the owner already covers well are worth less, so invitees fill the gaps.
 */
function assignRoles(P: Prepared, members: number[], roles: RoleNeedInput[]) {
  const value = (i: number, r: number) => {
    const ownerCov = P.cov[0][r];
    const discount = ownerCov >= 0.7 ? 0.35 : 1;
    return P.cov[i][r] >= 0.2 ? P.cov[i][r] * P.weights[r] * discount : -1;
  };
  let best: number[] = [];
  let bestV = -Infinity;
  const used = new Set<number>();
  const pick: number[] = [];
  const recurse = (k: number, acc: number) => {
    if (k === members.length) {
      if (acc > bestV) {
        bestV = acc;
        best = pick.slice();
      }
      return;
    }
    for (let r = 0; r < roles.length; r++) {
      if (used.has(r)) continue;
      used.add(r);
      pick.push(r);
      recurse(k + 1, acc + value(members[k], r));
      pick.pop();
      used.delete(r);
    }
    if (members.length > roles.length) {
      pick.push(-1);
      recurse(k + 1, acc);
      pick.pop();
    }
  };
  recurse(0, 0);
  const primary = new Map<number, number>();
  members.forEach((i, k) => {
    if (best[k] !== undefined && best[k] >= 0 && P.cov[i][best[k]] >= 0.2) primary.set(i, best[k]);
  });
  return primary;
}

export function formTeam(input: TeamInput): TeamResult {
  const t0 = performance.now();
  const roles = input.roles.filter((r) => ROLE_BY_ID[r.roleId]);
  const P = prepare({ ...input, roles });
  const maxSize = Math.max(1, Math.min(5, input.maxSize));
  const locked = (input.locked ?? []).map((id) => P.people.findIndex((p) => p.id === id)).filter((i) => i > 0);

  const freeCount = P.people.length - 1 - locked.length;
  let space = 0;
  for (let k = 1; k <= maxSize - locked.length; k++) space += nCk(freeCount, k);

  const useExact = input.forceMethod ? input.forceMethod === "exact" : space <= EXACT_LIMIT;
  const solved = useExact ? solveExact(P, maxSize, locked) : solveGreedy(P, maxSize, locked);
  const members = solved.members;
  const obj = objective(P, members);
  const primary = assignRoles(P, members, roles);

  const slots: TeamSlotResult[] = roles.map((r, ri) => {
    let best = 0;
    let by: number | undefined;
    for (const i of [0, ...members]) {
      if (P.cov[i][ri] > best) {
        best = P.cov[i][ri];
        by = i;
      }
    }
    const alternatives = P.people
      .map((p, i) => ({ i, c: P.cov[i][ri] }))
      .filter((x) => x.i !== 0 && !members.includes(x.i) && x.c >= 0.4)
      .sort((a, b) => b.c - a.c)
      .slice(0, 3)
      .map((x) => ({ userId: P.people[x.i].id, coverage: round2(x.c) }));
    return {
      roleId: r.roleId,
      label: roleLabel(r.roleId),
      why: r.why,
      weight: r.weight,
      coverage: round2(best),
      coveredBy: by !== undefined ? P.people[by].id : undefined,
      alternatives,
      gap: best < GAP_THRESHOLD,
    };
  });

  const memberOut = members.map((i) => {
    const p = P.people[i];
    const ri = primary.get(i);
    const roleId = ri !== undefined ? roles[ri].roleId : bestRoleFor(P, i, roles);
    const rIdx = roles.findIndex((r) => r.roleId === roleId);
    const cov = rIdx >= 0 ? P.cov[i][rIdx] : 0;
    const ev = roleCoverage(p, roleId).evidence.map(skillLabel);
    const reasons: string[] = [];
    if (ev.length) reasons.push(`${ev.slice(0, 2).join(" + ")} → ${roleLabel(roleId)}`);
    const shared = interestSimilarity(input.owner.interests, p.interests).shared;
    if (shared.length) reasons.push(`Shares your interest in ${shared.slice(0, 2).map(interestLabel).join(" & ")}`);
    if (p.openTo.includes("hackathon-team") || p.openTo.includes("cofounder")) reasons.push("Wants to join a team");
    return { userId: p.id, roleId, coverage: round2(cov), reasons };
  });

  const missing = slots
    .filter((s) => s.gap)
    .map((s) => ({
      roleId: s.roleId,
      label: s.label,
      suggestion: s.alternatives.length
        ? `Nobody on the team covers this well yet — consider swapping in an alternative.`
        : `No one in this pool covers ${s.label.toLowerCase()} — post it as an open role so new participants see it.`,
    }));

  const ms = performance.now() - t0;
  return {
    members: memberOut,
    slots,
    coverage: round2(obj.coverage),
    cohesion: round2(obj.cohesion),
    objective: Math.round(obj.f * 1000) / 1000,
    method: useExact ? "exact" : "greedy+local-search",
    combinationsEvaluated: solved.evaluated,
    poolSize: P.people.length - 1,
    ms: Math.round(ms * 10) / 10,
    summary: summarize(input.owner, memberOut, slots, obj.coverage),
    missing,
  };
}

function bestRoleFor(P: Prepared, i: number, roles: RoleNeedInput[]): string {
  let best = 0;
  let id = roles[0]?.roleId ?? "frontend-engineer";
  roles.forEach((r, ri) => {
    if (P.cov[i][ri] > best) {
      best = P.cov[i][ri];
      id = r.roleId;
    }
  });
  return id;
}

function summarize(owner: Profile, members: TeamResult["members"], slots: TeamSlotResult[], coverage: number): string {
  const covered = slots.filter((s) => !s.gap).map((s) => ROLE_BY_ID[s.roleId]?.short ?? s.label);
  const ownerRoles = slots.filter((s) => s.coveredBy === owner.id && !s.gap).map((s) => ROLE_BY_ID[s.roleId]?.short ?? s.label);
  const gaps = slots.filter((s) => s.gap).map((s) => s.label.toLowerCase());
  const n = members.length;
  let text = `A team of ${n + 1} covering ${covered.join(", ") || "the core roles"} (${Math.round(coverage * 100)}% weighted role coverage).`;
  if (ownerRoles.length) text += ` You cover ${ownerRoles.join(" & ")} yourself.`;
  if (gaps.length) text += ` Still missing: ${gaps.join(", ")}.`;
  return text;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Exposed for tests/benchmarks: compute both methods on the same input. */
export function compareMethods(input: TeamInput) {
  const exact = formTeam({ ...input, forceMethod: "exact" });
  const greedy = formTeam({ ...input, forceMethod: "greedy" });
  return { exact, greedy, gap: exact.objective - greedy.objective };
}

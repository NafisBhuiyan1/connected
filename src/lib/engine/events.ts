// Event recommendations ("which event moves my mission forward?") and organizer insights.

import { interestLabel, ROLE_BY_ID, ROLES, roleLabel } from "../ontology";
import type { ConnectedEvent, Profile, Team } from "../types";
import { interestSimilarity, roleCoverage, scoreCandidate, type MatchContext, type Need } from "./match";

export interface EventRecommendation {
  event: ConnectedEvent;
  score: number; // 0-100
  reasons: string[];
  topPeople: { userId: string; score: number }[];
  attendeeCount: number;
  optedInCount: number;
  joined: boolean;
  optedIn: boolean;
  live: boolean;
}

export function recommendEvents(
  user: Profile,
  need: Need,
  events: ConnectedEvent[],
  profiles: Profile[],
  ctx: MatchContext,
): EventRecommendation[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return events
    .filter((e) => new Date(e.end) >= ctx.now)
    .map((event) => {
      const ms = ctx.memberships.filter((m) => m.eventId === event.id);
      const opted = ms.filter((m) => m.optIn && m.userId !== user.id);
      const mine = ms.find((m) => m.userId === user.id);

      const topic = interestSimilarity(need.interests, event.tags);
      const people = opted
        .map((m) => byId.get(m.userId))
        .filter((p): p is Profile => Boolean(p) && p!.visibility !== "hidden")
        .map((p) => ({ userId: p.id, score: scoreCandidate(user, p, { ...need, eventId: event.id }, ctx).score }))
        .sort((a, b) => b.score - a.score);
      const strong = people.filter((p) => p.score >= 60);
      const top3 = people.slice(0, 3);
      const peopleValue = top3.length ? top3.reduce((a, p) => a + p.score, 0) / (3 * 100) : 0;

      const start = new Date(event.start).getTime();
      const days = (start - ctx.now.getTime()) / 86_400_000;
      const live = new Date(event.start) <= ctx.now && new Date(event.end) >= ctx.now;
      const timing = live ? 1 : days <= 7 ? 0.9 : days <= 21 ? 0.6 : 0.3;

      const score = Math.round(100 * (0.35 * topic.score + 0.5 * peopleValue + 0.15 * timing));

      const reasons: string[] = [];
      if (strong.length) reasons.push(`${strong.length} ${strong.length === 1 ? "person" : "people"} who fit your goal ${strong.length === 1 ? "is" : "are"} opted in to networking here.`);
      if (topic.shared.length) reasons.push(`Focuses on ${topic.shared.slice(0, 3).map(interestLabel).join(", ")} — matches your interests.`);
      const neededRoles = need.roles.slice(0, 4).map((r) => r.roleId);
      if (neededRoles.length) {
        const covered = neededRoles.filter((r) =>
          opted.some((m) => {
            const p = byId.get(m.userId);
            return p ? roleCoverage(p, r).coverage >= 0.6 : false;
          }),
        );
        if (covered.length) reasons.push(`Attendees cover roles you need: ${covered.map((r) => ROLE_BY_ID[r]?.short ?? r).join(", ")}.`);
      }
      if (live) reasons.push("Happening right now.");

      return {
        event,
        score,
        reasons,
        topPeople: top3,
        attendeeCount: ms.length,
        optedInCount: ms.filter((m) => m.optIn).length,
        joined: Boolean(mine),
        optedIn: Boolean(mine?.optIn),
        live,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- Organizer insights: skills supply vs. demand at an event ----------

export interface RoleSupplyDemand {
  roleId: string;
  label: string;
  supply: number; // opted-in people who cover the role ≥ 0.6
  demand: number; // teams/people asking for it
  gap: number; // demand - supply
}

export interface EventInsights {
  optedIn: number;
  attendees: number;
  teamsForming: number;
  teamsFormed: number;
  peopleOnTeams: number;
  unteamed: number;
  acceptedIntros: number;
  usefulRate: number | null; // share of rated meetings marked useful
  roles: RoleSupplyDemand[];
  topInterests: { id: string; label: string; count: number }[];
  suggestions: string[];
}

export function eventInsights(
  event: ConnectedEvent,
  profiles: Profile[],
  teams: Team[],
  ctx: MatchContext,
  requestStats: { accepted: number; ratings: string[] },
): EventInsights {
  const ms = ctx.memberships.filter((m) => m.eventId === event.id);
  const opted = ms.filter((m) => m.optIn);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const people = opted.map((m) => byId.get(m.userId)).filter((p): p is Profile => Boolean(p));
  const eventTeams = teams.filter((t) => t.eventId === event.id);

  const onTeams = new Set<string>();
  for (const t of eventTeams) for (const m of t.members) if (m.status === "owner" || m.status === "accepted") onTeams.add(m.userId);

  const demand = new Map<string, number>();
  for (const t of eventTeams) {
    for (const r of t.openRoles) demand.set(r, (demand.get(r) ?? 0) + 1);
    for (const slot of t.roles) if (!slot.assignedUserId) demand.set(slot.roleId, (demand.get(slot.roleId) ?? 0) + 1);
  }
  for (const p of people) for (const r of p.lookingFor) demand.set(r, (demand.get(r) ?? 0) + 0.5);

  const roles: RoleSupplyDemand[] = ROLES.map((r) => {
    const supply = people.filter((p) => roleCoverage(p, r.id).coverage >= 0.6).length;
    const d = Math.round(demand.get(r.id) ?? 0);
    return { roleId: r.id, label: r.short, supply, demand: d, gap: d - supply };
  })
    .filter((r) => r.supply > 0 || r.demand > 0)
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand);

  const interestCounts = new Map<string, number>();
  for (const p of people) for (const i of p.interests) interestCounts.set(i, (interestCounts.get(i) ?? 0) + 1);
  const topInterests = [...interestCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ id, label: interestLabel(id), count }));

  const rated = requestStats.ratings.filter((r) => r !== "didnt-meet");
  const usefulRate = rated.length ? rated.filter((r) => r === "useful").length / rated.length : null;

  const suggestions: string[] = [];
  const worst = roles.find((r) => r.gap > 0);
  if (worst) suggestions.push(`${worst.demand} requests for ${roleLabel(worst.roleId)} but only ${worst.supply} available — announce it, or invite ${worst.label.toLowerCase()} mentors.`);
  const unteamed = people.filter((p) => !onTeams.has(p.id) && p.openTo.includes("hackathon-team")).length;
  if (unteamed) suggestions.push(`${unteamed} opted-in people still want a team — run a 10-minute team-formation round.`);
  if (opted.length < ms.length) suggestions.push(`${ms.length - opted.length} attendees joined but haven't opted in to discovery.`);

  return {
    optedIn: opted.length,
    attendees: ms.length,
    teamsForming: eventTeams.filter((t) => t.status === "forming").length,
    teamsFormed: eventTeams.filter((t) => t.status === "formed").length,
    peopleOnTeams: onTeams.size,
    unteamed,
    acceptedIntros: requestStats.accepted,
    usefulRate,
    roles,
    topInterests,
    suggestions,
  };
}

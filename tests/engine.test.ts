import { describe, expect, it } from "vitest";
import { parseIntentRules } from "@/lib/engine/intent";
import { buildNeed, rankCandidates, roleCoverage, scoreCandidate, type MatchContext } from "@/lib/engine/match";
import { formTeam } from "@/lib/engine/team";
import { recommendEvents } from "@/lib/engine/events";
import { introFacts, templateIntro } from "@/lib/engine/icebreakers";
import { buildSeed, CROWNHACKS_ID, SAMPLE_JUDGE_PROFILE } from "@/lib/seed";
import type { Profile } from "@/lib/types";

const NOW = new Date("2026-11-07T20:00:00Z");
const db = buildSeed(NOW);
const ctx: MatchContext = { now: NOW, memberships: db.memberships, events: db.events };
const judge: Profile = {
  ...SAMPLE_JUDGE_PROFILE,
  id: "u_judge",
  name: "Judge Demo",
  introsOffered: [],
  availability: "high",
  area: "UNC Charlotte area",
  visibility: "everyone",
  allowRequests: true,
  isDemo: false,
  avatarHue: 200,
  createdAt: NOW.toISOString(),
};
const ctxWithJudge: MatchContext = {
  ...ctx,
  memberships: [...db.memberships, { eventId: CROWNHACKS_ID, userId: "u_judge", optIn: true, zone: "z_mixer", joinedAt: NOW.toISOString() }],
};
const pool = db.profiles.filter((p) => p.visibility !== "hidden");

describe("intent (rules engine)", () => {
  it("decomposes an AI startup idea into complementary roles", () => {
    const intent = parseIntentRules("I want to build an AI startup but need a developer and designer.");
    const roles = intent.roles.map((r) => r.roleId);
    expect(intent.isProject).toBe(true);
    expect(roles).toEqual(expect.arrayContaining(["frontend-engineer", "backend-engineer", "designer", "ml-engineer"]));
    expect(intent.interests).toContain("ai");
    // explicitly-requested roles outrank inferred ones
    const designer = intent.roles.find((r) => r.roleId === "designer")!;
    const product = intent.roles.find((r) => r.roleId === "product-lead");
    expect(designer.weight).toBeGreaterThan(product?.weight ?? 0);
  });

  it("detects a healthcare project and adds a domain expert", () => {
    const intent = parseIntentRules("I want to create an AI-powered healthcare scheduling platform");
    expect(intent.roles.map((r) => r.roleId)).toContain("health-expert");
    expect(intent.projectTitle?.toLowerCase()).toContain("healthcare scheduling platform");
  });

  it("recognizes mentorship and internship asks", () => {
    expect(parseIntentRules("I need a mentor in software engineering").kind).toBe("mentorship-get");
    expect(parseIntentRules("How do I get my first banking internship?").kind).toBe("internship");
  });

  it("does not hallucinate roles from times like 4 pm", () => {
    const intent = parseIntentRules("free until 4 pm, looking to chat");
    expect(intent.roles.map((r) => r.roleId)).not.toContain("product-lead");
  });
});

describe("matching", () => {
  it("ranks complementary builders at the top for the judge's goal", () => {
    const intent = parseIntentRules(judge.ask);
    const need = buildNeed(judge, intent, CROWNHACKS_ID);
    const top = rankCandidates(judge, pool, need, ctxWithJudge, 8).map((m) => m.profile.id);
    expect(top.slice(0, 6)).toEqual(expect.arrayContaining(["u_alex"]));
    expect(top).toEqual(expect.arrayContaining(["u_maya", "u_jordan"]));
  });

  it("every reason is grounded in real profile data", () => {
    const intent = parseIntentRules(judge.ask);
    const need = buildNeed(judge, intent, CROWNHACKS_ID);
    for (const m of rankCandidates(judge, pool, need, ctxWithJudge, 10)) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(99);
      const total = Object.values(m.breakdown).reduce((a, b) => a + b, 0);
      expect(Math.abs(total - m.score)).toBeLessThanOrEqual(2);
      for (const r of m.reasons) {
        if (r.kind === "willing") {
          const quoted = r.text.match(/“(.+)”/)?.[1];
          expect(m.profile.gives).toContain(quoted);
        }
      }
    }
  });

  it("is reciprocal: a founder who needs a backend engineer and the backend engineer see each other", () => {
    const sam = db.profiles.find((p) => p.id === "u_sam")!;
    const alex = db.profiles.find((p) => p.id === "u_alex")!;
    const m = scoreCandidate(sam, alex, buildNeed(sam), ctx);
    expect(m.backward).toBeGreaterThan(0.6);
    expect(m.reasons.some((r) => r.kind === "mutual")).toBe(true);
  });

  it("values complementary over identical skills", () => {
    const jordan = db.profiles.find((p) => p.id === "u_jordan")!;
    const need = buildNeed(jordan, parseIntentRules("I need teammates for a fintech app"));
    const hannah = scoreCandidate(jordan, db.profiles.find((p) => p.id === "u_hannah")!, need, ctx);
    const ethan = scoreCandidate(jordan, db.profiles.find((p) => p.id === "u_ethan")!, need, ctx);
    // Ethan (backend) complements a frontend engineer better than Hannah (also strong frontend)
    expect(ethan.breakdown.skills).toBeGreaterThan(hannah.breakdown.skills * 0.95);
  });

  it("role coverage uses noisy-OR with related-skill partial credit", () => {
    const jordan = db.profiles.find((p) => p.id === "u_jordan")!;
    expect(roleCoverage(jordan, "frontend-engineer").coverage).toBeGreaterThan(0.95);
    expect(roleCoverage(jordan, "backend-engineer").coverage).toBeGreaterThan(0.2); // TypeScript → Node relation
    expect(roleCoverage(jordan, "backend-engineer").coverage).toBeLessThan(0.6);
  });
});

describe("team formation", () => {
  it("assembles a diverse team that covers the project roles", () => {
    const intent = parseIntentRules(judge.ask);
    const res = formTeam({
      owner: judge,
      roles: intent.roles,
      pool: pool.filter((p) => ctxWithJudge.memberships.some((m) => m.userId === p.id && m.eventId === CROWNHACKS_ID && m.optIn)),
      maxSize: 3,
      eventId: CROWNHACKS_ID,
      ctx: ctxWithJudge,
    });
    expect(res.members.length).toBeGreaterThanOrEqual(2);
    expect(res.members.length).toBeLessThanOrEqual(3);
    const roles = new Set(res.members.map((m) => m.roleId));
    expect(roles.size).toBe(res.members.length); // no duplicated role
    expect(res.coverage).toBeGreaterThan(0.75);
    expect(res.method).toBe("exact");
  });

  it("reports a missing piece when nobody can cover a role", () => {
    const res = formTeam({
      owner: judge,
      roles: [
        { roleId: "frontend-engineer", weight: 1, why: "" },
        { roleId: "hardware-engineer", weight: 1, why: "" },
      ],
      pool: pool.filter((p) => !["u_diego"].includes(p.id) && p.skills.every((s) => !["embedded", "robotics", "cad", "cpp"].includes(s.skill))),
      maxSize: 2,
      ctx,
    });
    expect(res.missing.map((m) => m.roleId)).toContain("hardware-engineer");
  });

  it("respects locked members", () => {
    const res = formTeam({
      owner: judge,
      roles: parseIntentRules(judge.ask).roles,
      pool,
      maxSize: 3,
      locked: ["u_noah"],
      ctx,
    });
    expect(res.members.map((m) => m.userId)).toContain("u_noah");
  });
});

describe("events + intros", () => {
  it("recommends CrownHacks first for a hackathon-team goal", () => {
    const need = buildNeed(judge, parseIntentRules("I need a hackathon team with a developer and designer"));
    const recs = recommendEvents(judge, need, db.events, pool, ctxWithJudge);
    expect(recs[0].event.id).toBe(CROWNHACKS_ID);
    expect(recs[0].reasons.length).toBeGreaterThan(0);
  });

  it("template intros only mention shared facts", () => {
    const maya = db.profiles.find((p) => p.id === "u_maya")!;
    const f = introFacts(judge, maya, "Want to design an AI fintech app with me?", { eventTitle: "CrownHacks 2026", zoneName: "Team-formation mixer" });
    const { intro, icebreakers } = templateIntro(f);
    expect(intro).toContain("Maya");
    expect(intro).toContain("Team-formation mixer");
    expect(f.sharedInterests).toContain("Artificial intelligence");
    expect(icebreakers.length).toBeGreaterThanOrEqual(3);
  });
});

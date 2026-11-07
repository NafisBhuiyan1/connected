// Benchmark: how close is greedy + local search to the exact optimum on realistic pools?
// This is the evidence behind the pitch line "we verify our heuristic against brute force".

import { describe, expect, it } from "vitest";
import { parseIntentRules } from "@/lib/engine/intent";
import { compareMethods } from "@/lib/engine/team";
import type { MatchContext } from "@/lib/engine/match";
import { buildSeed } from "@/lib/seed";

const NOW = new Date("2026-11-07T20:00:00Z");
const db = buildSeed(NOW);
const ctx: MatchContext = { now: NOW, memberships: db.memberships, events: db.events };
const pool = db.profiles.filter((p) => p.visibility !== "hidden");

const PROJECTS = [
  "I want to build an AI startup but need a developer and designer",
  "I want to create an AI-powered healthcare scheduling platform",
  "Building a fintech mobile app for students to split rent",
  "Make an educational game for elementary classrooms",
  "Build a robot that sorts recycling using computer vision",
  "Launch a climate data dashboard for NC counties",
  "Create a secure blockchain voting app for student government",
  "Build a marketplace app for campus tutoring",
];

describe("team optimizer: greedy + local search vs exact", () => {
  it("matches the exact optimum (or comes within 2%) across owners and projects", () => {
    let trials = 0;
    let exactHits = 0;
    let worstRatio = 1;
    const owners = pool.filter((_, i) => i % 3 === 0);
    for (const owner of owners) {
      for (const text of PROJECTS) {
        const intent = parseIntentRules(text);
        const others = pool.filter((p) => p.id !== owner.id);
        const { exact, greedy } = compareMethods({ owner, roles: intent.roles, pool: others, maxSize: 3, ctx });
        trials++;
        const ratio = greedy.objective / exact.objective;
        if (Math.abs(exact.objective - greedy.objective) < 1e-6) exactHits++;
        worstRatio = Math.min(worstRatio, ratio);
        expect(greedy.objective).toBeLessThanOrEqual(exact.objective + 1e-6);
      }
    }
    const hitRate = exactHits / trials;
    console.log(`[team-bench] trials=${trials} exact-optimum-hit-rate=${(hitRate * 100).toFixed(1)}% worst-ratio=${worstRatio.toFixed(4)}`);
    expect(worstRatio).toBeGreaterThan(0.99);
    expect(hitRate).toBeGreaterThan(0.95);
  });
});

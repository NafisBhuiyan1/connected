import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSeed } from "@/lib/seed";
import type { Database } from "@/lib/types";
const state = vi.hoisted(() => ({ db: null as unknown as Database }));
vi.mock("@/lib/server/store", () => ({
  getDb: () => state.db,
  mutate: (fn: (db: Database) => unknown) => fn(state.db),
  newId: () => "unused",
}));
import { canSubscribe, postMessage, teamDetail, threadMessages } from "@/lib/server/services";
beforeEach(() => { state.db = buildSeed(new Date("2026-11-07T21:00:00Z")); });
describe("realtime topic access follows current consent", () => {
  it("allows only one's own notification channel and actual event membership", () => {
    const me = state.db.profiles[0];
    expect(canSubscribe(me, "user:" + me.id)).toBe(true);
    expect(canSubscribe(me, "user:someone-else")).toBe(false);
    const membership = state.db.memberships.find((m) => m.userId === me.id)!;
    expect(canSubscribe(me, "lounge:" + membership.eventId)).toBe(true);
    state.db.memberships = state.db.memberships.filter((m) => m !== membership);
    expect(canSubscribe(me, "lounge:" + membership.eventId)).toBe(false);
  });
  it("revokes declined team invite access", () => {
    const owner = state.db.profiles[0]; const member = state.db.profiles[1];
    const team = { id: "rt-team", ownerId: owner.id, members: [{ userId: member.id, status: "invited" }] } as Database["teams"][number];
    state.db.teams.push(team);
    expect(canSubscribe(member, "thread:rt-team")).toBe(true);
    expect(() => teamDetail(member, team.id)).not.toThrow();
    expect(() => postMessage(member, team.id, "Invited members can discuss the project.")).not.toThrow();
    expect(threadMessages(member, team.id)).toHaveLength(1);
    team.members[0].status = "declined";
    expect(canSubscribe(member, "thread:rt-team")).toBe(false);
    expect(canSubscribe(owner, "thread:rt-team")).toBe(true);
    expect(() => teamDetail(member, team.id)).toThrow();
    expect(() => threadMessages(member, team.id)).toThrow();
    expect(() => postMessage(member, team.id, "Should not be stored.")).toThrow();
    expect(() => teamDetail(owner, team.id)).not.toThrow();
  });
  it("requires an accepted, unblocked request for conversation pings", () => {
    const me = state.db.profiles[0]; const other = state.db.profiles[1];
    const request = { id: "rt-request", fromId: me.id, toId: other.id, status: "pending" } as Database["requests"][number];
    state.db.requests.push(request);
    expect(canSubscribe(me, "thread:rt-request")).toBe(false);
    expect(() => threadMessages(me, request.id)).toThrow();
    expect(() => postMessage(me, request.id, "Not accepted yet.")).toThrow();
    request.status = "accepted";
    expect(canSubscribe(me, "thread:rt-request")).toBe(true);
    expect(() => postMessage(me, request.id, "An accepted conversation.")).not.toThrow();
    expect(threadMessages(other, request.id)).toHaveLength(1);
    state.db.blocks.push({ userId: other.id, blockedId: me.id, createdAt: new Date().toISOString() });
    expect(canSubscribe(me, "thread:rt-request")).toBe(false);
    expect(() => threadMessages(me, request.id)).toThrow();
    expect(() => threadMessages(other, request.id)).toThrow();
    expect(() => postMessage(me, request.id, "Blocked message.")).toThrow();
    expect(() => postMessage(other, request.id, "Blocked reply.")).toThrow();
    expect(state.db.messages.filter((m) => m.threadId === request.id)).toHaveLength(1);
  });
});


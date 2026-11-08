import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { buildSeed } from "@/lib/seed";
import type { Database, LoungeMessage } from "@/lib/types";
import { LOUNGE_CHANNEL_IDS, type LoungeChannel } from "@/lib/lounge-channels";
const state = vi.hoisted(() => ({ db: null as unknown as Database, seq: 0 }));
vi.mock("@/lib/server/store", () => ({ getDb: () => state.db, mutate: (fn: (db: Database) => unknown) => fn(state.db), newId: () => "channel-" + ++state.seq }));
import { lounge, postLounge, reportLounge } from "@/lib/server/services";
import { publish, subscribe } from "@/lib/server/bus";
const me = () => state.db.profiles.find((p) => p.id === "u_riley")!;
const eventId = "ev_crownhacks";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-07T23:00:00Z"));
  state.db = buildSeed(new Date()); state.db.lounge = []; state.seq = 0;
});
afterEach(() => vi.useRealTimers());
describe("event lounge channels", () => {
  it("keeps legacy records in General and isolates all four channels", () => {
    state.db.lounge.push({ id: "legacy", eventId, userId: me().id, body: "Old message", createdAt: new Date().toISOString(), reports: [] });
    for (const channel of LOUNGE_CHANNEL_IDS) {
      vi.setSystemTime(new Date(Date.now() + 3000));
      postLounge(me(), eventId, "Message in " + channel, channel);
    }
    expect(lounge(me(), eventId).messages.map((m) => m.body)).toEqual(["Old message", "Message in general"]);
    for (const channel of LOUNGE_CHANNEL_IDS.slice(1)) {
      const result = lounge(me(), eventId, channel);
      expect(result.channel).toBe(channel);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].body).toBe("Message in " + channel);
    }
    expect(lounge(me(), eventId).channels.map((c) => c.count)).toEqual([2, 1, 1, 1]);
  });
  it("filters counts and messages using the same block/report/event privacy rules", () => {
    const owner = me(); const blocked = state.db.profiles.find((p) => p.id === "u_jordan")!;
    const message = (id: string, overrides: Partial<LoungeMessage> = {}): LoungeMessage => ({ id, eventId, userId: owner.id, body: id, createdAt: new Date().toISOString(), reports: [], channel: "help", ...overrides });
    state.db.blocks.push({ userId: owner.id, blockedId: blocked.id, createdAt: new Date().toISOString() });
    state.db.lounge.push(message("visible"), message("blocked", { userId: blocked.id }), message("reported", { reports: ["one", "two", "three"] }), message("other-event", { eventId: "elsewhere" }));
    const result = lounge(owner, eventId, "help");
    expect(result.messages.map((m) => m.id)).toEqual(["visible"]);
    expect(result.channels.find((c) => c.id === "help")?.count).toBe(1);
    expect(result.authors).not.toHaveProperty(blocked.id);
  });
  it("requires event membership for reading, posting, and reporting in every channel", () => {
    const owner = me();
    state.db.lounge.push({ id: "someone-message", eventId, userId: "u_jordan", body: "Hello", createdAt: new Date().toISOString(), reports: [] });
    state.db.memberships = state.db.memberships.filter((m) => m.userId !== owner.id);
    expect(() => lounge(owner, eventId, "showcase")).toThrow("Join the event");
    expect(() => postLounge(owner, eventId, "Must not store", "help")).toThrow("Join the event");
    expect(() => reportLounge(owner, "someone-message")).toThrow("Join the event");
    expect(state.db.lounge[0].reports).toEqual([]);
  });
  it("rejects invented channels without storing data and preserves event-level realtime", async () => {
    expect(() => postLounge(me(), eventId, "No secret rooms", "private" as LoungeChannel)).toThrow("Unknown lounge channel");
    expect(() => lounge(me(), eventId, "private" as LoungeChannel)).toThrow("Unknown lounge channel");
    expect(state.db.lounge).toHaveLength(0);
    const changed: string[] = []; const off = subscribe("lounge:" + eventId, (topic) => changed.push(topic));
    postLounge(me(), eventId, "Seeking a designer", "find-team");
    await tick(); off();
    expect(changed).toEqual(["lounge:" + eventId]);
  });
});


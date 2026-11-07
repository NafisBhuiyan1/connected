// Anti-stalking and privacy guarantees, tested against the real service layer.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "connected-test-"));
process.env.CONNECTED_DATA_DIR = dir;

type Services = typeof import("@/lib/server/services");
type Store = typeof import("@/lib/server/store");
let svc: Services;
let store: Store;

const NOW = new Date("2026-11-07T21:00:00Z"); // during CrownHacks
const me = () => store.getDb().profiles.find((p) => p.id === "u_riley")!;
const person = (id: string) => store.getDb().profiles.find((p) => p.id === id)!;
const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  store = await import("@/lib/server/store");
  svc = await import("@/lib/server/services");
  store.resetDemo();
});

afterAll(() => {
  vi.useRealTimers();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("live map privacy", () => {
  it("shows people only at fuzzed, per-viewer positions that never match exactly", () => {
    const a = svc.liveMap(me());
    const b = svc.liveMap(person("u_kevin"));
    expect(a.people.length).toBeGreaterThan(5);
    const alexA = a.people.find((p) => p.profile.id === "u_alex")!;
    const alexB = b.people.find((p) => p.profile.id === "u_alex")!;
    expect(alexA && alexB).toBeTruthy();
    expect(metersBetween(alexA, alexB)).toBeGreaterThan(0.5); // different viewers see different offsets
    expect(metersBetween(alexA, alexB)).toBeLessThan(2 * 28 + 1); // but both stay within the jitter radius
  });

  it("re-randomizes positions every 15 minutes", () => {
    const first = svc.liveMap(me()).people.find((p) => p.profile.id === "u_alex")!;
    vi.setSystemTime(new Date(NOW.getTime() + 16 * 60_000));
    const later = svc.liveMap(me()).people.find((p) => p.profile.id === "u_alex")!;
    vi.setSystemTime(NOW);
    expect(metersBetween(first, later)).toBeGreaterThan(0.5);
  });

  it("turns small groups into an anonymous crowd (no faces, no names)", () => {
    const map = svc.liveMap(me());
    // The quiet room has only two opted-in, visible people.
    expect(map.people.some((p) => ["u_ben", "u_omar"].includes(p.profile.id))).toBe(false);
    const quiet = map.crowds.find((c) => c.zoneName === "Quiet room");
    expect(quiet?.count).toBe(2);
    expect(Object.keys(quiet!)).not.toContain("profile");
  });

  it("ghost mode removes you from the map and the event's people list instantly", () => {
    svc.updatePreferences(person("u_maya"), { ghostMode: true });
    expect(svc.liveMap(me()).people.some((p) => p.profile.id === "u_maya")).toBe(false);
    expect(svc.discoveryPool(store.getDb(), me(), "ev_crownhacks").some((p) => p.id === "u_maya")).toBe(false);
    svc.updatePreferences(person("u_maya"), { ghostMode: false });
    expect(svc.liveMap(me()).people.some((p) => p.profile.id === "u_maya")).toBe(true);
  });

  it("requires you to opt in yourself before you can see anyone (reciprocity)", () => {
    const tyler = person("u_tyler"); // attending, but not opted in
    const map = svc.liveMap(tyler, "ev_crownhacks");
    expect(map.people).toHaveLength(0);
    expect(map.me.visible).toBe(false);
  });

  it("hidden and blocked people never appear", () => {
    svc.block(me(), "u_jordan");
    const map = svc.liveMap(me());
    expect(map.people.some((p) => p.profile.id === "u_jordan")).toBe(false);
    expect(map.people.some((p) => p.profile.id === "u_rosa")).toBe(false);
    svc.unblock(me(), "u_jordan");
  });

  it("people who chose 'only good matches' are hidden from poor matches", () => {
    svc.updatePreferences(person("u_alex"), { mapAudience: "compatible" });
    const goodFit = svc.liveMap(me()).people.some((p) => p.profile.id === "u_alex"); // Riley is the business partner Alex wants
    const poorFit = svc.liveMap(person("u_noah")).people.some((p) => p.profile.id === "u_alex");
    svc.updatePreferences(person("u_alex"), { mapAudience: "event" });
    expect(goodFit).toBe(true);
    expect(poorFit).toBe(false);
  });

  it("never sends the venue check-in code to clients", () => {
    const blob = JSON.stringify([svc.liveMap(me()), svc.listEvents(me()), svc.eventDetail(me(), "ev_crownhacks")]);
    expect(blob).not.toContain("CROWN26");
  });
});

describe("profile view limits", () => {
  it("blocks stalking-like repeated viewing of the same profile", () => {
    const viewer = person("u_noah");
    let blockedAt = -1;
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(new Date(NOW.getTime() + i * 3 * 60_000)); // a view every 3 minutes
      try {
        svc.personDetail(viewer, "u_maya");
      } catch (e) {
        expect((e as { status?: number }).status).toBe(429);
        blockedAt = i;
        break;
      }
    }
    vi.setSystemTime(NOW);
    expect(blockedAt).toBe(8);
  });

  it("rapid refreshes count as one view", () => {
    const viewer = person("u_zoe");
    for (let i = 0; i < 30; i++) svc.personDetail(viewer, "u_kevin");
    const views = store.getDb().views.filter((v) => v.viewerId === "u_zoe" && v.targetId === "u_kevin");
    expect(views).toHaveLength(1);
  });
});

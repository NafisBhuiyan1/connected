import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { toPublic } from "@/lib/engine/match";
import { buildSeed } from "@/lib/seed";

const auth = vi.hoisted(() => ({ currentUser: vi.fn(), originalUserId: vi.fn(), setSession: vi.fn(), setOriginal: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ ...auth, demoModeEnabled: () => true }));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "connected-submission-"));
process.env.CONNECTED_DATA_DIR = dir;
let route: typeof import("@/app/api/demo/route");
beforeAll(async () => { route = await import("@/app/api/demo/route"); });
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe("public judging surface", () => {
  it("never projects private preferences or newly added private fields into public profiles", () => {
    const p = { ...buildSeed(new Date()).profiles[0], prefs: { ghostMode: true }, privateFutureField: "secret" };
    const result = toPublic(p, false);
    expect(result.name).toBe(p.name);
    expect(result.canRequest).toBe(false);
    for (const key of ["prefs", "visibility", "allowRequests", "createdAt", "privateFutureField"]) expect(result).not.toHaveProperty(key);
  });
  it("refuses anonymous reads and demo mutations", async () => {
    auth.currentUser.mockResolvedValue(null);
    expect((await route.GET()).status).toBe(401);
    expect((await route.POST(new Request("http://localhost/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) }))).status).toBe(401);
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("shows a signed-in presenter fictional personas without listing real accounts", async () => {
    auth.currentUser.mockResolvedValue(buildSeed(new Date()).profiles[0]);
    auth.originalUserId.mockResolvedValue(null);
    const response = await route.GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.personas.length).toBeGreaterThan(0);
    expect(data.realUsers).toEqual([]);
    expect(data.original).toBe(null);
  });
});

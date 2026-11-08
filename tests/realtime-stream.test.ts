import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/types";
const state = vi.hoisted(() => ({ user: { id: "rt-user" } as Profile | null, allowed: new Set<string>() }));
vi.mock("@/lib/server/session", () => ({ currentUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/server/services", () => ({ canSubscribe: (_me: Profile, topic: string) => state.allowed.has(topic) }));
import { GET } from "@/app/api/stream/route";
import { listenerCount, publish } from "@/lib/server/bus";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const controllers: AbortController[] = [];
const open = async (topics = "user:rt-user,thread:rt-room") => {
  const abort = new AbortController(); controllers.push(abort);
  const response = await GET(new Request("http://localhost/api/stream?topics=" + encodeURIComponent(topics), { signal: abort.signal }));
  return { response, abort, reader: response.body!.getReader() };
};
beforeEach(() => { state.user = { id: "rt-user" } as Profile; state.allowed = new Set(["user:rt-user", "thread:rt-room"]); });
afterEach(() => { controllers.splice(0).forEach((c) => c.abort()); vi.useRealTimers(); });
describe("SSE authorization and lifecycle", () => {
  it("requires identity and at least one authorized topic", async () => {
    state.user = null;
    expect((await GET(new Request("http://localhost/api/stream?topics=user:rt-user"))).status).toBe(401);
    state.user = { id: "rt-user" } as Profile;
    expect((await GET(new Request("http://localhost/api/stream?topics=user:other"))).status).toBe(403);
  });
  it("deduplicates topics before limiting and releases listeners on cancel", async () => {
    const { response, reader } = await open(Array(20).fill("user:rt-user").join(","));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('"topics":["user:rt-user"]');
    expect(listenerCount("user:rt-user")).toBe(1);
    await reader.cancel();
    expect(listenerCount("user:rt-user")).toBe(0);
  });
  it("handles requests aborted before subscription setup", async () => {
    const controller = new AbortController(); controller.abort();
    const response = await GET(new Request("http://localhost/api/stream?topics=user:rt-user", { signal: controller.signal }));
    expect((await response.body!.getReader().read()).done).toBe(true);
    expect(listenerCount("user:rt-user")).toBe(0);
  });
  it("rechecks revoked membership before sending another topic ping", async () => {
    const { reader } = await open(); await reader.read();
    state.allowed.delete("thread:rt-room");
    publish("thread:rt-room"); await tick();
    expect((await reader.read()).done).toBe(true);
    expect(listenerCount("thread:rt-room")).toBe(0);
  });
  it("stops an expired or changed session before forwarding an update", async () => {
    const { reader } = await open(); await reader.read();
    state.user = null; publish("user:rt-user"); await tick();
    expect((await reader.read()).done).toBe(true);
  });
  it("rechecks idle sessions on heartbeat and bounds connection lifetime", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
    const { reader } = await open(); await reader.read();
    state.user = null;
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await reader.read()).done).toBe(true);
    state.user = { id: "rt-user" } as Profile;
    const second = await open(); await second.reader.read();
    await vi.advanceTimersByTimeAsync(120_000);
    // Heartbeats may already be queued; all are bounded and eventually drain.
    while (!(await second.reader.read()).done) {}
    expect(listenerCount("thread:rt-room")).toBe(0);
  });
  it("disconnects slow readers rather than retaining an unbounded queue", async () => {
    const { reader } = await open("user:rt-user");
    for (let i = 0; i < 20; i++) { publish("user:rt-user"); await tick(); }
    expect(listenerCount("user:rt-user")).toBe(0);
    let chunks = 0;
    while (!(await reader.read()).done) chunks++;
    expect(chunks).toBeLessThanOrEqual(16);
  });
});


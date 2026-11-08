import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
class FakeSource {
  static all: FakeSource[] = [];
  handlers = new Map<string, () => void>();
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) { FakeSource.all.push(this); }
  addEventListener(type: string, fn: () => void) { this.handlers.set(type, fn); }
  close() { this.closed = true; }
  ready() { this.handlers.get("ready")?.(); }
  message(topic: string) { this.onmessage?.({ data: JSON.stringify({ topic }) }); }
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubGlobal("EventSource", FakeSource); FakeSource.all = []; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("shared realtime client", () => {
  it("shares one connection, refreshes every ready, and ignores stale sources", async () => {
    const { subscribeLiveTopics } = await import("@/lib/live");
    const first = vi.fn(); const second = vi.fn();
    const offFirst = subscribeLiveTopics(["user:one"], first);
    const offSecond = subscribeLiveTopics(["user:one"], second);
    await vi.advanceTimersByTimeAsync(60);
    expect(FakeSource.all).toHaveLength(1);
    const old = FakeSource.all[0]; old.ready();
    expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenCalledTimes(1);
    const offExtra = subscribeLiveTopics(["thread:two"], vi.fn());
    await vi.advanceTimersByTimeAsync(60);
    const current = FakeSource.all[1];
    expect(old.closed).toBe(true);
    old.message("user:one"); old.ready();
    expect(first).toHaveBeenCalledTimes(1);
    current.ready();
    expect(first).toHaveBeenCalledTimes(2);
    current.onerror?.(); current.ready();
    expect(first).toHaveBeenCalledTimes(3);
    offFirst(); offSecond(); offExtra();
    await vi.advanceTimersByTimeAsync(60);
    expect(current.closed).toBe(true);
  });
  it("refreshes a multi-topic consumer once per ready", async () => {
    const { subscribeLiveTopics } = await import("@/lib/live");
    const change = vi.fn();
    const off = subscribeLiveTopics(["user:one", "thread:two"], change);
    await vi.advanceTimersByTimeAsync(60);
    FakeSource.all[0].ready();
    expect(change).toHaveBeenCalledTimes(1); off(); await vi.advanceTimersByTimeAsync(60);
  });
  it("retains a trailing refresh when a later write arrives during a refetch burst", async () => {
    const { coalesceLiveChanges } = await import("@/lib/live");
    const change = vi.fn(); const updates = coalesceLiveChanges(change);
    updates.notify();
    await vi.advanceTimersByTimeAsync(80); updates.notify();
    expect(change).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(70);
    expect(change).toHaveBeenCalledTimes(2);
    updates.notify(); updates.dispose(); await vi.advanceTimersByTimeAsync(150);
    expect(change).toHaveBeenCalledTimes(2);
  });
});


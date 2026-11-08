import { describe, expect, it } from "vitest";
import { listenerCount, publish, subscribe } from "../src/lib/server/bus";
import { AsyncLocalStorage } from "node:async_hooks";

const tick = () => new Promise((r) => setImmediate(r));

describe("realtime bus", () => {
  it("keeps the subscriber's request context when another user publishes", async () => {
    const context = new AsyncLocalStorage<string>();
    let received: string | undefined;
    const off = context.run("recipient-session", () => subscribe("user:context-test", () => { received = context.getStore(); }));
    context.run("sender-session", () => publish("user:context-test"));
    await tick();
    expect(received).toBe("recipient-session");
    off();
  });
  it("keeps other subscribers running if one consumer throws", async () => {
    const offBad = subscribe("thread:broken-consumer", () => { throw new Error("consumer failed"); });
    let delivered = false;
    const offGood = subscribe("thread:broken-consumer", () => { delivered = true; });
    publish("thread:broken-consumer");
    await tick();
    expect(delivered).toBe(true);
    offBad(); offGood();
  });
  it("delivers to subscribers of a topic only", async () => {
    const got: string[] = [];
    const off = subscribe("lounge:a", (t) => got.push(t));
    publish("lounge:b");
    publish("lounge:a");
    await tick();
    expect(got).toEqual(["lounge:a"]);
    off();
    expect(listenerCount("lounge:a")).toBe(0);
  });

  it("coalesces a burst of writes into one ping per topic", async () => {
    let n = 0;
    const off = subscribe("thread:t1", () => n++);
    publish("thread:t1");
    publish("thread:t1", "thread:t1");
    await tick();
    expect(n).toBe(1);
    publish("thread:t1");
    await tick();
    expect(n).toBe(2);
    off();
  });
});

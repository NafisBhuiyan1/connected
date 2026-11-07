import { describe, expect, it } from "vitest";
import { listenerCount, publish, subscribe } from "../src/lib/server/bus";

const tick = () => new Promise((r) => setImmediate(r));

describe("realtime bus", () => {
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

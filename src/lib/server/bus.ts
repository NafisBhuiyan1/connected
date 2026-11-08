import "server-only";
import { EventEmitter } from "node:events";
import { AsyncLocalStorage } from "node:async_hooks";

// In-process pub/sub for realtime updates over server-sent events.
// Topics carry no content — just "something changed here" — so clients refetch through the normal,
// privacy-filtered APIs. Topics: user:<id> (alerts, requests), lounge:<eventId>, thread:<teamOrRequestId>.
// A multi-instance deployment would swap this for Redis/Postgres LISTEN behind the same two functions.

const g = globalThis as unknown as { __connectedBus?: EventEmitter };
const bus = (g.__connectedBus ??= (() => {
  const e = new EventEmitter();
  e.setMaxListeners(0);
  return e;
})());

const pending = new Set<string>();
let scheduled = false;

/** Announce a change. Coalesced per tick, so a burst of writes sends one ping per topic. */
export function publish(...topics: string[]) {
  for (const t of topics) pending.add(t);
  if (scheduled) return;
  scheduled = true;
  setImmediate(() => {
    scheduled = false;
    const list = [...pending];
    pending.clear();
    for (const t of list) bus.emit(t, t);
  });
}

export function subscribe(topic: string, fn: (topic: string) => void): () => void {
  // A publisher's request has a different cookie context from the subscriber.
  // Preserve the receiving request when later checking its session in callbacks.
  const runInSubscriberContext = AsyncLocalStorage.snapshot();
  const listener = (changed: string) => {
    runInSubscriberContext(() => {
      try { fn(changed); } catch { /* One disconnected consumer must not stop others. */ }
    });
  };
  bus.on(topic, listener);
  return () => { bus.off(topic, listener); };
}

export function listenerCount(topic: string): number {
  return bus.listenerCount(topic);
}

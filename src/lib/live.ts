"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// One EventSource per tab, shared by every component. Components register topics; the connection is
// re-opened (debounced) with the union of topics whenever that set changes. Polling stays on as a slow
// safety net, so a dropped connection degrades gracefully instead of freezing the UI.

type Fn = (topic: string) => void;

const listeners = new Map<string, Set<Fn>>();
let es: EventSource | null = null;
let currentKey = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let connected = false;
const statusSubs = new Set<() => void>();

function setConnected(v: boolean) {
  if (connected === v) return;
  connected = v;
  statusSubs.forEach((f) => f());
}

function fireAll() {
  const notified = new Set<Fn>();
  for (const [topic, fns] of listeners) for (const fn of fns) {
    if (notified.has(fn)) continue;
    notified.add(fn);
    try { fn(topic); } catch { /* Keep independent consumers running. */ }
  }
}

function reconnect() {
  timer = null;
  const topics = [...listeners.keys()].filter((t) => listeners.get(t)?.size).sort();
  const key = topics.join(",");
  if (key === currentKey && es) return;
  es?.close();
  es = null;
  currentKey = key;
  setConnected(false);
  if (!topics.length || typeof EventSource === "undefined") return;
  const source = new EventSource(`/api/stream?topics=${encodeURIComponent(key)}`);
  es = source;
  source.addEventListener("ready", () => {
    if (es !== source) return;
    setConnected(true);
    // Every establishment (including topic changes) can have missed writes.
    fireAll();
  });
  source.onmessage = (e) => {
    if (es !== source) return;
    try {
      const { topic } = JSON.parse(e.data) as { topic: string };
      listeners.get(topic)?.forEach((fn) => { try { fn(topic); } catch { /* independent consumer */ } });
    } catch {
      // ignore malformed
    }
  };
  source.onerror = () => {
    if (es !== source) return;
    setConnected(false); // the browser retries on its own (server sends retry: 3000)
  };
}

/** Shared registration used by hooks; exported for transport lifecycle tests. */
export function subscribeLiveTopics(topics: string[], fn: Fn): () => void {
  const list = [...new Set(topics.filter((t) => /^(user|lounge|thread):[A-Za-z0-9_-]{1,80}$/.test(t)))];
  for (const t of list) {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t)!.add(fn);
  }
  schedule();
  return () => {
    for (const t of list) {
      const set = listeners.get(t);
      set?.delete(fn);
      if (set && !set.size) listeners.delete(t);
    }
    schedule();
  };
}

export function coalesceLiveChanges(callback: () => void) {
  let last = -Infinity;
  let trailing: ReturnType<typeof setTimeout> | null = null;
  return {
    notify() {
      const elapsed = Date.now() - last;
      if (elapsed >= 150) {
        if (trailing) clearTimeout(trailing);
        trailing = null;
        last = Date.now();
        callback();
      }
      else if (!trailing) trailing = setTimeout(() => {
        trailing = null;
        last = Date.now();
        callback();
      }, 150 - elapsed);
    },
    dispose() { if (trailing) clearTimeout(trailing); trailing = null; },
  };
}

function schedule() {
  if (!timer) timer = setTimeout(reconnect, 60);
}

/** Call `onChange` whenever the server says one of `topics` changed. Falsy topics are ignored. */
export function useLive(topics: (string | null | undefined | false)[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = [...new Set(topics.filter(Boolean))].sort().join(",");
  useEffect(() => {
    if (!key) return;
    const changes = coalesceLiveChanges(() => cb.current());
    const off = subscribeLiveTopics(key.split(","), changes.notify);
    return () => {
      changes.dispose();
      off();
    };
  }, [key]);
}

/** True while the realtime connection is up (for a small "Live" indicator). */
export function useLiveStatus(): boolean {
  return useSyncExternalStore(
    (f) => {
      statusSubs.add(f);
      return () => statusSubs.delete(f);
    },
    () => connected,
    () => false,
  );
}

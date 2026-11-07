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
let hadError = false;
const statusSubs = new Set<() => void>();

function setConnected(v: boolean) {
  if (connected === v) return;
  connected = v;
  statusSubs.forEach((f) => f());
}

function fireAll() {
  for (const [topic, fns] of listeners) fns.forEach((fn) => fn(topic));
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
    setConnected(true);
    // After a drop we may have missed pings — refresh everything once.
    if (hadError) fireAll();
    hadError = false;
  });
  source.onmessage = (e) => {
    try {
      const { topic } = JSON.parse(e.data) as { topic: string };
      listeners.get(topic)?.forEach((fn) => fn(topic));
    } catch {
      // ignore malformed
    }
  };
  source.onerror = () => {
    hadError = true;
    setConnected(false); // the browser retries on its own (server sends retry: 3000)
  };
}

function schedule() {
  if (!timer) timer = setTimeout(reconnect, 60);
}

/** Call `onChange` whenever the server says one of `topics` changed. Falsy topics are ignored. */
export function useLive(topics: (string | null | undefined | false)[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = topics.filter(Boolean).join(",");
  useEffect(() => {
    if (!key) return;
    const list = key.split(",");
    let last = 0;
    const fn: Fn = () => {
      // Coalesce bursts (e.g. message + notification) into one refetch.
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      cb.current();
    };
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

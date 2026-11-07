"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init?.signal,
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty body
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/session")) {
      window.location.href = "/onboarding";
    }
    throw new ClientError(res.status, msg);
  }
  return data as T;
}

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/** Fetch JSON on mount (and optionally poll). Keeps previous data while refreshing. */
export function useApi<T>(path: string | null, opts: { poll?: number } = {}): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(path));
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async (quiet = false) => {
    const p = pathRef.current;
    if (!p) return;
    if (!quiet) setLoading(true);
    try {
      const d = await api<T>(p);
      if (pathRef.current === p) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (!quiet) setError((e as Error).message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [path, load]);

  useEffect(() => {
    if (!opts.poll || !path) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, opts.poll);
    return () => clearInterval(t);
  }, [opts.poll, path, load]);

  return { data, error, loading, reload: () => load(true), setData };
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function firstName(name: string): string {
  return name.replace(/^Dr\.\s+/, "").split(" ")[0] ?? name;
}

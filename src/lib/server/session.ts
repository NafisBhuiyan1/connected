import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./store";
import type { Profile } from "../types";

// Signed-cookie identity. Demo-grade on purpose (no passwords to leak); production would use
// Supabase Auth / OAuth with the same `currentUser()` boundary.

const COOKIE = "cx_session";
const ORIGINAL = "cx_original"; // remembers your real account while acting as a demo persona

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && !process.env.CONNECTED_ALLOW_DEV_SECRET) {
    console.warn("[connected] SESSION_SECRET is not set — using an insecure development secret.");
  }
  return "connected-dev-secret-change-me-please";
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verify(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = token.slice(0, idx);
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function currentUserId(): Promise<string | null> {
  const jar = await cookies();
  return verify(jar.get(COOKIE)?.value);
}

export async function currentUser(): Promise<Profile | null> {
  const id = await currentUserId();
  if (!id) return null;
  return getDb().profiles.find((p) => p.id === id) ?? null;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, sign(userId), cookieOpts);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(ORIGINAL);
}

export async function originalUserId(): Promise<string | null> {
  const jar = await cookies();
  return verify(jar.get(ORIGINAL)?.value);
}

export async function setOriginal(userId: string | null) {
  const jar = await cookies();
  if (userId) jar.set(ORIGINAL, sign(userId), cookieOpts);
  else jar.delete(ORIGINAL);
}

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE !== "off";
}

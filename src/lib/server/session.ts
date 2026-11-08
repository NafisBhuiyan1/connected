import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./store";
import { ApiError } from "./services";
import { createSessionToken, verifySessionToken, sessionSecret, SESSION_MAX_AGE } from "./session-codec";
import type { Profile } from "../types";

// Signed, expiring cookies. Existing unversioned demo cookies require a new login.

const COOKIE = "cx_session";
const ORIGINAL = "cx_original"; // remembers your real account while acting as a demo persona

export function assertSessionConfigured() {
  if (!sessionSecret(process.env)) throw new ApiError(503, "Sign-in is not configured. Set SESSION_SECRET on the server.");
}

function sign(value: string): string {
  const key = sessionSecret(process.env);
  if (!key) throw new ApiError(503, "Sign-in is not configured. Set SESSION_SECRET on the server.");
  return createSessionToken(value, key);
}

function verify(token: string | undefined): string | null {
  return verifySessionToken(token, sessionSecret(process.env));
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
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

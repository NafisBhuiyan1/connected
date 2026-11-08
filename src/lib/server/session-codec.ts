import crypto from "node:crypto";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionSecret(env: { SESSION_SECRET?: string; NODE_ENV?: string; CONNECTED_ALLOW_DEV_SECRET?: string }): string | null {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) return env.SESSION_SECRET;
  if (env.NODE_ENV === "production" && env.CONNECTED_ALLOW_DEV_SECRET !== "1") return null;
  return "connected-dev-secret-change-me-please";
}

export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  if (!userId || userId.length > 200) throw new Error("Invalid session identity");
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })).toString("base64url");
  const value = `v1.${payload}`;
  return `${value}.${crypto.createHmac("sha256", secret).update(value).digest("base64url")}`;
}

export function verifySessionToken(token: string | undefined, secret: string | null, now = Date.now()): string | null {
  if (!token || !secret || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.id !== "string" || !payload.id || payload.id.length > 200 || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(now / 1000)) return null;
    return payload.id;
  } catch { return null; }
}

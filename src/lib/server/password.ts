import "server-only";
import crypto from "node:crypto";

// scrypt with a per-account random salt; constant-time comparison.
const KEYLEN = 64;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): { salt: string; hash: string } {
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = crypto.scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

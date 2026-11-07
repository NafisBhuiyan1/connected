import { z } from "zod";
import { body, handle } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/password";
import { ApiError } from "@/lib/server/services";
import { setOriginal, setSession } from "@/lib/server/session";
import { getDb } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const Input = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), password: z.string().min(1).max(200) });

// Naive in-memory throttle: 8 failed attempts per email per 10 minutes.
const g = globalThis as unknown as { __loginFails?: Map<string, number[]> };
const fails = (g.__loginFails ??= new Map());

export const POST = handle(async (req: Request) => {
  const { email, password } = await body(req, Input);
  const now = Date.now();
  const recent = (fails.get(email) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 8) throw new ApiError(429, "Too many attempts. Try again in a few minutes.");

  const db = getDb();
  const account = db.accounts.find((a) => a.email === email);
  const ok = account ? verifyPassword(password, account.salt, account.hash) : verifyPassword(password, "x", "00");
  const me = ok && account ? db.profiles.find((p) => p.id === account.userId) : undefined;
  if (!me) {
    fails.set(email, [...recent, now]);
    throw new ApiError(401, "Wrong email or password.");
  }
  fails.delete(email);
  await setOriginal(null);
  await setSession(me.id);
  return { me };
});

import { z } from "zod";
import { body, handle } from "@/lib/server/http";
import { ApiError } from "@/lib/server/services";
import { currentUser, demoModeEnabled, originalUserId, setOriginal, setSession } from "@/lib/server/session";
import { getDb, resetDemo } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// Demo control room: lets a presenter act as a clearly-labeled fictional persona (e.g. to accept
// the judge's request live). Disabled with DEMO_MODE=off. Never available for real accounts.

export const GET = handle(async () => {
  if (!demoModeEnabled()) throw new ApiError(404, "Demo mode is off");
  const db = getDb();
  const me = await currentUser();
  const original = await originalUserId();
  const pendingFor = (id: string) =>
    db.requests.filter((r) => r.toId === id && r.status === "pending").length +
    db.teams.filter((t) => t.members.some((m) => m.userId === id && m.status === "invited")).length;
  return {
    me: me ? { id: me.id, name: me.name, isDemo: me.isDemo } : null,
    original: original ? db.profiles.find((p) => p.id === original) ?? null : null,
    personas: db.profiles
      .filter((p) => p.isDemo && p.visibility !== "hidden")
      .map((p) => ({ id: p.id, name: p.name, headline: p.headline, hue: p.avatarHue, pending: pendingFor(p.id) }))
      .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name)),
    realUsers: db.profiles.filter((p) => !p.isDemo).map((p) => ({ id: p.id, name: p.name })),
    seededAt: db.seededAt,
  };
});

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("act-as"), userId: z.string() }),
  z.object({ action: z.literal("return") }),
  z.object({ action: z.literal("reset") }),
]);

export const POST = handle(async (req: Request) => {
  if (!demoModeEnabled()) throw new ApiError(404, "Demo mode is off");
  const input = await body(req, Input);
  const db = getDb();
  const me = await currentUser();
  if (input.action === "act-as") {
    const target = db.profiles.find((p) => p.id === input.userId);
    if (!target || !target.isDemo) throw new ApiError(403, "You can only act as fictional demo personas.");
    const original = await originalUserId();
    if (!original && me && !me.isDemo) await setOriginal(me.id);
    await setSession(target.id);
    return { ok: true, actingAs: target.name };
  }
  if (input.action === "return") {
    const original = await originalUserId();
    if (!original) throw new ApiError(400, "No original account to return to.");
    await setSession(original);
    await setOriginal(null);
    return { ok: true };
  }
  resetDemo(true);
  return { ok: true };
});

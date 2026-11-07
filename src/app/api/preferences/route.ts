import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { preferences, unblock, updatePreferences } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => preferences(await requireUser()));

const Patch = z.object({
  ghostMode: z.boolean().optional(),
  mapAudience: z.enum(["event", "compatible"]).optional(),
  showZone: z.boolean().optional(),
  minScore: z.number().int().min(0).max(95).optional(),
  openNowOnly: z.boolean().optional(),
  radiusMiles: z.number().min(1).max(100).optional(),
  sounds: z.boolean().optional(),
  viewTransparency: z.boolean().optional(),
  visibility: z.enum(["everyone", "events", "hidden"]).optional(),
  allowRequests: z.boolean().optional(),
  unblock: z.string().optional(),
});

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const { unblock: unblockId, ...patch } = await body(req, Patch);
  if (unblockId) unblock(me, unblockId);
  updatePreferences(me, patch);
  return preferences((await requireUser()));
});

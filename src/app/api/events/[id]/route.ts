import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { eventDetail, joinEvent } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return eventDetail(me, id);
});

const Input = z.object({
  optIn: z.boolean(),
  zone: z.string().nullable().optional(),
  leave: z.boolean().optional(),
  // Result of an on-device geofence check. Coordinates are never sent — only "inside the venue: yes".
  checkIn: z.boolean().optional(),
  // Fallback when GPS is unavailable: the code shown on screens at the venue.
  checkInCode: z.string().max(20).optional(),
  status: z
    .object({
      mode: z.enum(["quick-chat", "team-up", "mentoring", "heads-down"]),
      topics: z.array(z.string().max(60)).max(4),
      maxRequests: z.number().int().min(0).max(20),
      minutes: z.number().int().min(15).max(720),
    })
    .nullable()
    .optional(),
});

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return { membership: joinEvent(me, id, await body(req, Input)) };
});

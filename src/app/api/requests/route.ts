import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { createRequest, listRequests } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => listRequests(await requireUser()));

const Input = z.object({
  toId: z.string(),
  ask: z.string().max(400),
  message: z.string().max(1200).optional(),
  eventId: z.string().optional(),
  missionId: z.string().optional(),
  kind: z.enum(["connect", "chat"]).optional(),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  return { request: createRequest(me, await body(req, Input)) };
});

import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { intro } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.object({ toId: z.string(), ask: z.string().max(400).default(""), eventId: z.string().optional() });

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const { toId, ask, eventId } = await body(req, Input);
  return intro(me, toId, ask, eventId);
});

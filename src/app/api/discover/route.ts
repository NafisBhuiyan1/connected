import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { discover } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.object({ query: z.string().max(1200).default(""), eventId: z.string().optional() });

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const { query, eventId } = await body(req, Input);
  return discover(me, query, eventId);
});

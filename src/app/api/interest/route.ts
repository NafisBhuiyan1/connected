import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { block, quietInterest } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.object({ toId: z.string(), action: z.enum(["interest", "block"]).default("interest") });

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const { toId, action } = await body(req, Input);
  return action === "block" ? block(me, toId) : quietInterest(me, toId);
});

import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { lounge, postLounge, reportLounge } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return lounge(me, id);
});

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), body: z.string().min(1).max(500) }),
  z.object({ action: z.literal("report"), messageId: z.string() }),
]);

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const input = await body(req, Input);
  return input.action === "post" ? { message: postLounge(me, id, input.body) } : reportLounge(me, input.messageId);
});

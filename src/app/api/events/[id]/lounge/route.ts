import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { lounge, postLounge, reportLounge } from "@/lib/server/services";
import { LOUNGE_CHANNEL_IDS } from "@/lib/lounge-channels";

export const dynamic = "force-dynamic";
const Channel = z.enum(LOUNGE_CHANNEL_IDS);

export const GET = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const channel = Channel.parse(new URL(req.url).searchParams.get("channel") ?? "general");
  return lounge(me, id, channel);
});

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), body: z.string().min(1).max(500), channel: Channel.default("general") }),
  z.object({ action: z.literal("report"), messageId: z.string() }),
]);

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const input = await body(req, Input);
  return input.action === "post" ? { message: postLounge(me, id, input.body, input.channel) } : reportLounge(me, input.messageId);
});

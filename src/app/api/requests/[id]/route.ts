import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { postMessage, rateOutcome, respondRequest, threadMessages, withdrawRequest } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), meetingSpot: z.string().max(120).optional() }),
  z.object({ action: z.literal("decline") }),
  z.object({ action: z.literal("withdraw") }),
  z.object({ action: z.literal("rate"), rating: z.enum(["useful", "okay", "not-useful", "didnt-meet"]) }),
  z.object({ action: z.literal("message"), body: z.string().min(1).max(2000) }),
]);

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return { messages: threadMessages(me, id) };
});

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const input = await body(req, Input);
  switch (input.action) {
    case "accept":
      return { request: respondRequest(me, id, true, input.meetingSpot) };
    case "decline":
      return { request: respondRequest(me, id, false) };
    case "withdraw":
      return { request: withdrawRequest(me, id) };
    case "rate":
      return { request: rateOutcome(me, id, input.rating) };
    case "message":
      return { message: postMessage(me, id, input.body) };
  }
});

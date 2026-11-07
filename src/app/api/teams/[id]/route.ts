import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { postMessage, respondTeam, setOpenRoles, teamDetail, toggleStep } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
  z.object({ action: z.literal("step"), stepId: z.string() }),
  z.object({ action: z.literal("open-roles"), roles: z.array(z.string()).max(6) }),
  z.object({ action: z.literal("message"), body: z.string().min(1).max(2000) }),
]);

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return teamDetail(me, id);
});

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const input = await body(req, Input);
  switch (input.action) {
    case "accept":
      return { team: respondTeam(me, id, true) };
    case "decline":
      return { team: respondTeam(me, id, false) };
    case "step":
      return { team: toggleStep(me, id, input.stepId) };
    case "open-roles":
      return { team: setOpenRoles(me, id, input.roles) };
    case "message":
      return { message: postMessage(me, id, input.body) };
  }
});

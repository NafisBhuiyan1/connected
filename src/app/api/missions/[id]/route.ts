import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { updateMission } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.object({ status: z.enum(["active", "completed", "archived"]) });

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const { status } = await body(req, Input);
  return { mission: updateMission(me, id, status) };
});

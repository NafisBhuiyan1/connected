import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { createMission, listMissions } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ({ missions: listMissions(await requireUser()) }));

const Input = z.object({
  goal: z.string().min(6).max(400),
  title: z.string().max(80).optional(),
  kind: z.enum(["cofounder", "hackathon-team", "mentor", "internship", "meet-professionals", "collaborators", "custom"]).optional(),
  eventId: z.string().optional(),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  return createMission(me, await body(req, Input));
});

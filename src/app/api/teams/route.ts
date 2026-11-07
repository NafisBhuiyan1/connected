import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { createTeam, myTeams } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ({ teams: myTeams(await requireUser()) }));

const Input = z.object({
  title: z.string().max(120),
  pitch: z.string().max(1200),
  eventId: z.string().optional(),
  missionId: z.string().optional(),
  roles: z.array(z.object({ roleId: z.string(), why: z.string().max(300), weight: z.number() })).max(10),
  members: z.array(z.object({ userId: z.string(), roleId: z.string() })).max(4),
  coverage: z.number().min(0).max(1),
  openRoles: z.array(z.string()).max(6).optional(),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  return { team: createTeam(me, await body(req, Input)) };
});

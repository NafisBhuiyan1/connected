import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { planTeam } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Intent = z.object({
  summary: z.string(),
  kind: z.string().optional(),
  roles: z.array(z.object({ roleId: z.string(), why: z.string(), weight: z.number() })),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  helpTopics: z.array(z.string()),
  isProject: z.boolean(),
  projectTitle: z.string().optional(),
});

const Input = z.object({
  pitch: z.string().min(8, "Describe your idea in a sentence").max(1200),
  eventId: z.string().optional(),
  size: z.number().int().min(1).max(4).optional(),
  locked: z.array(z.string()).max(4).optional(),
  excluded: z.array(z.string()).max(40).optional(),
  intent: Intent.optional(), // reuse the previous interpretation when the user edits roles or swaps people
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const input = await body(req, Input);
  return planTeam(me, input as Parameters<typeof planTeam>[1]);
});

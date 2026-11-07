import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { createPost, feed } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => feed(await requireUser()));

const Input = z.object({
  body: z.string().max(600),
  kind: z.enum(["update", "looking", "offering"]).default("update"),
  eventId: z.string().optional(),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  return { post: createPost(me, await body(req, Input)) };
});

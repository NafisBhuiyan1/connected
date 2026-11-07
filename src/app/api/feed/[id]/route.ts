import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { deletePost, toggleLike } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const Input = z.object({ action: z.enum(["like", "delete"]) });

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const { action } = await body(req, Input);
  return action === "like" ? toggleLike(me, id) : deletePost(me, id);
});

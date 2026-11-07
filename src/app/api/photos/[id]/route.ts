import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { body, handle, requireUser, type IdParams } from "@/lib/server/http";
import { ApiError, photoAction, photoFile } from "@/lib/server/services";
import { currentUser } from "@/lib/server/session";
import { photosDir } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// Serve a photo only to members of its event (private by default, never a public URL).
export async function GET(_req: Request, { params }: IdParams) {
  const me = await currentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  try {
    const p = photoFile(me, id);
    const data = fs.readFileSync(path.join(photosDir(), path.basename(p.file)));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 404;
    return new Response("Not found", { status });
  }
}

const Input = z.object({ action: z.enum(["like", "report", "delete"]) });

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const { action } = await body(req, Input);
  return photoAction(me, id, action);
});

import { z } from "zod";
import { importCalendar } from "@/lib/server/event-import";
import { body, handle, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const Input = z.union([
  z.object({ url: z.string().min(8).max(2000) }),
  z.object({ ics: z.string().min(20).max(2_000_000) }),
]);

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const input = await body(req, Input);
  return importCalendar(me, input);
});

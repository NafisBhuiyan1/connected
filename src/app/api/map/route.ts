import { handle, requireUser } from "@/lib/server/http";
import { liveMap } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const eventId = new URL(req.url).searchParams.get("event") ?? undefined;
  return liveMap(me, eventId);
});

import { feedStatus, kickFeedSync } from "@/lib/server/event-import";
import { handle, requireUser } from "@/lib/server/http";
import { listEvents } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const me = await requireUser();
  kickFeedSync();
  return { ...listEvents(me), feeds: feedStatus().map(({ name, ok, syncedAt, count }) => ({ name, ok, syncedAt, count })) };
});

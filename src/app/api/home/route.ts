import { kickFeedSync } from "@/lib/server/event-import";
import { handle, requireUser } from "@/lib/server/http";
import { home } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const me = await requireUser();
  kickFeedSync();
  return home(me);
});

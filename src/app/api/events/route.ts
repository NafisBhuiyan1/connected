import { handle, requireUser } from "@/lib/server/http";
import { listEvents } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => listEvents(await requireUser()));

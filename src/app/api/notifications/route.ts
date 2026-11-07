import { handle, requireUser } from "@/lib/server/http";
import { markAllRead, notifications } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => notifications(await requireUser()));
export const POST = handle(async () => markAllRead(await requireUser()));

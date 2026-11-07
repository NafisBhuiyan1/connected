import { handle, requireUser } from "@/lib/server/http";
import { home } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => home(await requireUser()));

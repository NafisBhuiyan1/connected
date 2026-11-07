import { handle, requireUser } from "@/lib/server/http";
import { graph } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async () => graph(await requireUser()));

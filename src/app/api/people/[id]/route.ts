import { handle, requireUser, type IdParams } from "@/lib/server/http";
import { personDetail } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  return personDetail(me, id);
});

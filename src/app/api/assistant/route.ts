import { handle, requireUser } from "@/lib/server/http";
import { assistantRateLimit, personalAssistant, readAssistantInput } from "@/lib/server/assistant";

export const dynamic = "force-dynamic";

const respond = handle(async (req: Request) => {
  const me = await requireUser();
  const input = await readAssistantInput(req);
  assistantRateLimit(me.id);
  return personalAssistant(me, input);
});

export async function POST(req: Request) {
  const response = await respond(req);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

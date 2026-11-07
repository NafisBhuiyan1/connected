import { z } from "zod";
import { body, handle, requireUser } from "@/lib/server/http";
import { importGithub, importText } from "@/lib/server/importers";

export const dynamic = "force-dynamic";

const Input = z.discriminatedUnion("source", [
  z.object({ source: z.literal("github"), username: z.string().min(1).max(100) }),
  z.object({ source: z.literal("text"), text: z.string().min(1).max(20_000) }),
]);

export const POST = handle(async (req: Request) => {
  await requireUser();
  const input = await body(req, Input);
  return input.source === "github" ? importGithub(input.username) : importText(input.text);
});

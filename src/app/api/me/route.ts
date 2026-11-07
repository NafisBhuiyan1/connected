import { body, handle, requireUser } from "@/lib/server/http";
import { updateProfile } from "@/lib/server/services";
import { ProfilePatch } from "@/lib/validation";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const patch = await body(req, ProfilePatch);
  return { me: updateProfile(me, patch as Partial<Profile>) };
});

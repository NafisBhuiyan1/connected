import { body, handle } from "@/lib/server/http";
import { aiEnabled } from "@/lib/server/ai";
import { clearSession, currentUser, demoModeEnabled, originalUserId, setSession } from "@/lib/server/session";
import { hashPassword } from "@/lib/server/password";
import { mutate, newId } from "@/lib/server/store";
import { ApiError } from "@/lib/server/services";
import { ProfileInput } from "@/lib/validation";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const me = await currentUser();
  const original = await originalUserId();
  return { me, actingAsDemo: Boolean(me?.isDemo && original), demoMode: demoModeEnabled(), ai: aiEnabled() };
});

export const POST = handle(async (req: Request) => {
  const input = await body(req, ProfileInput);
  const { joinEventId, zone, email, password, ...fields } = input;
  const creds = hashPassword(password);
  const profile = mutate((db) => {
    if (db.accounts.some((a) => a.email === email)) throw new ApiError(409, "An account with that email already exists");
    const p: Profile = {
      ...fields,
      id: newId("u"),
      introsOffered: fields.introsOffered ?? [],
      area: fields.area || (fields.university ? `${fields.university} area` : ""),
      isDemo: false,
      avatarHue: Math.floor(Math.random() * 360),
      createdAt: new Date().toISOString(),
    };
    db.profiles.push(p);
    db.accounts.push({ userId: p.id, email, salt: creds.salt, hash: creds.hash, createdAt: new Date().toISOString() });
    if (joinEventId) {
      const ev = db.events.find((e) => e.id === joinEventId);
      if (!ev) throw new ApiError(400, "Unknown event");
      db.memberships.push({
        eventId: ev.id,
        userId: p.id,
        optIn: true,
        zone: zone && ev.zones.some((z) => z.id === zone) ? zone : ev.zones.find((z) => z.meetingSpot)?.id,
        joinedAt: new Date().toISOString(),
      });
    }
    db.notifications.push({
      id: newId("n"),
      userId: p.id,
      kind: "system",
      title: "Welcome to Connected",
      body: "Tell Connected what you want to build — it will find the people to build it with.",
      href: "/build",
      read: false,
      createdAt: new Date().toISOString(),
    });
    return p;
  });
  await setSession(profile.id);
  return { me: profile };
});

export const DELETE = handle(async () => {
  await clearSession();
  return { ok: true };
});

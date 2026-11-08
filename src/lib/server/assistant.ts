import "server-only";
import { AssistantInputSchema, type AssistantContext, type AssistantInput, type AssistantResponse } from "../assistant-contract";
import { resolveAssistantGoal } from "../assistant-coach";
import { parseIntentRules } from "../engine/intent";
import { activeStatus, buildNeed, rankCandidates } from "../engine/match";
import { recommendEvents } from "../engine/events";
import { interestLabel, skillLabel } from "../ontology";
import type { Database, Profile } from "../types";
import { assistantReply } from "./ai";
import { ApiError, discoveryPool, matchCtx } from "./services";
import { getDb } from "./store";

export function assistantContext(me: Profile, input: AssistantInput, db: Database): AssistantContext {
  const selected = input.eventId ? db.events.find((event) => event.id === input.eventId) : undefined;
  if (input.eventId && !selected) throw new ApiError(404, "Event not found.");
  const eventNeedsOptIn = Boolean(selected && !db.memberships.some((m) => m.eventId === selected.id && m.userId === me.id && m.optIn));
  const goal = resolveAssistantGoal(input, me.ask);
  const intent = parseIntentRules(goal || input.message);
  const ctx = matchCtx(db);
  const need = buildNeed(me, intent, input.eventId);
  const pool = eventNeedsOptIn ? [] : discoveryPool(db, me, input.eventId).filter((person) =>
    !person.prefs?.ghostMode && person.allowRequests && person.availability !== "low" && activeStatus(person.id, ctx, input.eventId)?.status?.mode !== "heads-down",
  );
  const people = rankCandidates(me, pool, need, ctx, 3).map((match) => ({
    id: match.profile.id, name: match.profile.name, headline: match.profile.headline,
    skills: match.profile.skills.slice(0, 5).map((skill) => skillLabel(skill.skill)),
    why: match.reasons.slice(0, 2).map((reason) => reason.text).join(" ") || "Visible profile with declared collaboration interests.",
    isDemo: match.profile.isDemo,
  }));
  const eligibleEvents = db.events.filter((event) => new Date(event.end).getTime() >= ctx.now.getTime());
  const events = recommendEvents(me, need, eligibleEvents, pool, ctx).slice(0, 3).map(({ event }) => ({
    id: event.id, title: event.title, venue: event.venue, start: event.start, isSample: event.isSample,
  }));
  return {
    profile: { name: me.name, headline: me.headline, skills: me.skills.map((skill) => skillLabel(skill.skill)), interests: me.interests.map(interestLabel), ask: me.ask, gives: me.gives },
    goal, intent, people, events, eventNeedsOptIn,
  };
}

export async function personalAssistant(me: Profile, input: AssistantInput): Promise<AssistantResponse> {
  const context = assistantContext(me, input, getDb());
  const result = await assistantReply(input, context);
  return {
    ...result, modeLabel: result.source === "claude" ? "Claude · personal AI" : "Personal coach · rules-based fallback",
    goal: context.goal, people: context.people, events: context.events,
    buildPlan: !context.eventNeedsOptIn && context.goal.length >= 8 && context.intent.isProject
      ? { pitch: context.goal, eventId: input.eventId, size: 3, intent: context.intent, href: "/build" } : null,
  };
}

// Each message can be a paid model call, so cap it per user (in-process, like the other limiters here).
const ASK_WINDOW_MS = 5 * 60_000;
const ASK_LIMIT = 30;
const g = globalThis as unknown as { __assistantAsks?: Map<string, number[]> };
const asks = (g.__assistantAsks ??= new Map<string, number[]>());

export function assistantRateLimit(userId: string, now = Date.now()): void {
  const recent = (asks.get(userId) ?? []).filter((t) => now - t < ASK_WINDOW_MS);
  if (recent.length >= ASK_LIMIT) throw new ApiError(429, "You've sent a lot of messages. Give the coach a few minutes.");
  recent.push(now);
  asks.set(userId, recent);
}

/**
 * Browser writes must come from a page on the host they were sent to. Compare against the host the request
 * actually arrived on: `req.url` can say "localhost" in dev even when the app is opened via 127.0.0.1, a LAN IP
 * or an HTTPS tunnel, which would wrongly reject the real app. Forwarded hosts are safe to accept here: a cross-site
 * page can't set that header without a CORS preflight, which this route never approves.
 */
export function isSameOriginWrite(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client; the JSON content-type requirement still blocks form CSRF
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const allowed = [req.headers.get("x-forwarded-host"), req.headers.get("host"), new URL(req.url).host]
    .flatMap((h) => (h ? h.split(",") : []))
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(host);
}

export async function readAssistantInput(req: Request): Promise<AssistantInput> {
  if (!isSameOriginWrite(req)) throw new ApiError(403, "Use the assistant from Connected.");
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Send a JSON message.");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "A message is required.");
  const decoder = new TextDecoder();
  let bytes = 0; let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 32_768) { await reader.cancel(); throw new ApiError(413, "The conversation is too large. Start a shorter chat."); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new ApiError(400, "Invalid JSON message."); }
  return AssistantInputSchema.parse(parsed);
}

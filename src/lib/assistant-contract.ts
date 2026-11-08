import { z } from "zod";
import type { Intent } from "./types";

export const AssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
}).strict();

export const AssistantInputSchema = z.object({
  message: z.string().trim().min(1, "Tell your assistant what you need help with.").max(1200),
  history: z.array(AssistantMessageSchema).max(10).default([]),
  goal: z.string().trim().max(1200).optional(),
  eventId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).optional(),
}).strict().refine((input) => input.history.reduce((sum, turn) => sum + turn.content.length, 0) <= 12_000, "Keep the conversation history under 12,000 characters.");

export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export interface AssistantPerson {
  id: string;
  name: string;
  headline: string;
  skills: string[];
  why: string;
  isDemo: boolean;
}
export interface AssistantEvent {
  id: string;
  title: string;
  venue: string;
  start: string;
  isSample: boolean;
}
export interface AssistantResponse {
  reply: string;
  source: "claude" | "rules";
  modeLabel: string;
  goal: string;
  suggestions: { label: string; prompt: string }[];
  people: AssistantPerson[];
  events: AssistantEvent[];
  buildPlan: { pitch: string; eventId?: string; size: 3; intent: Intent; href: "/build" } | null;
}

/** Only approved, minimal facts are sent to an optional remote model. */
export interface AssistantContext {
  profile: { name: string; headline: string; skills: string[]; interests: string[]; ask: string; gives: string[] };
  goal: string;
  intent: Intent;
  people: AssistantPerson[];
  events: AssistantEvent[];
  eventNeedsOptIn: boolean;
}

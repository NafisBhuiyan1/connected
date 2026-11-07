import { z } from "zod";
import { INTERESTS, ROLES, SKILLS } from "./ontology";

const skillIds = new Set(SKILLS.map((s) => s.id));
const interestIds = new Set(INTERESTS.map((i) => i.id));
const roleIds = new Set(ROLES.map((r) => r.id));

const collab = z.enum(["cofounder", "hackathon-team", "project", "mentorship-get", "mentorship-give", "internship", "hiring", "research", "quick-chat"]);

export const ProfileInput = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  pronouns: z.string().trim().max(20).optional(),
  headline: z.string().trim().min(3, "Add a short headline").max(90),
  role: z.enum(["student", "professional", "founder", "mentor", "researcher", "organizer"]),
  university: z.string().trim().max(80).optional(),
  major: z.string().trim().max(80).optional(),
  gradYear: z.number().int().min(1950).max(2040).optional(),
  bio: z.string().trim().max(600).default(""),
  skills: z
    .array(z.object({ skill: z.string().refine((s) => skillIds.has(s), "Unknown skill"), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }))
    .max(15),
  interests: z.array(z.string().refine((s) => interestIds.has(s), "Unknown interest")).max(10),
  gives: z.array(z.string().trim().min(3).max(100)).max(5).default([]),
  ask: z.string().trim().max(300).default(""),
  lookingFor: z.array(z.string().refine((s) => roleIds.has(s), "Unknown role")).max(6).default([]),
  openTo: z.array(collab).max(9).default([]),
  introsOffered: z.array(z.string().refine((s) => interestIds.has(s))).max(5).default([]),
  availability: z.enum(["high", "medium", "low"]).default("medium"),
  area: z.string().trim().max(80).default(""),
  visibility: z.enum(["everyone", "events", "hidden"]).default("everyone"),
  allowRequests: z.boolean().default(true),
  links: z
    .object({
      github: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      portfolio: z.string().url().optional().or(z.literal("")),
      instagram: z.string().url().optional().or(z.literal("")),
      x: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  joinEventId: z.string().optional(),
  zone: z.string().optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export type ProfileInputT = z.infer<typeof ProfileInput>;

export const ProfilePatch = ProfileInput.partial().omit({ joinEventId: true, zone: true, email: true, password: true });

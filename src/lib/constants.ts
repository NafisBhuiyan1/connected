// Small constants safe to import from client components (no seed data).

import type { Prefs } from "./types";

export const CROWNHACKS_ID = "ev_crownhacks";

export const DEFAULT_PREFS: Prefs = {
  ghostMode: false,
  mapAudience: "event",
  showZone: true,
  minScore: 0,
  openNowOnly: false,
  radiusMiles: 15,
  sounds: true,
  viewTransparency: true,
};

/** Anti-stalking parameters for the live map (also shown to users on the preferences page). */
/** Real, public iCalendar feeds near CrownHacks (verified Nov 2026). */
export const SUGGESTED_FEEDS = [
  { name: "UNC Charlotte Events", sub: "Talks, career & campus events", url: "https://campusevents.charlotte.edu/calendar.ics" },
  { name: "NinerEngage", sub: "Student org & club events", url: "https://ninerengage.charlotte.edu/events.ics" },
] as const;

export const PRIVACY = {
  /** Every pin is offset by up to this many meters, differently for every viewer. */
  jitterMeters: 28,
  /** Offsets re-randomize on this cadence, so pins can't be averaged over time to find someone. */
  refreshMinutes: 15,
  /** Zones with fewer visible people than this are shown as an anonymous crowd, not faces. */
  minCrowd: 3,
  /** Opening the same profile more than this many times an hour is blocked as stalking-like behaviour. */
  maxViewsPerHour: 8,
};

export const CROWNHACKS_ZONE_OPTIONS = [
  { id: "z_mixer", name: "Team-formation mixer" },
  { id: "z_main", name: "Main hacking area" },
  { id: "z_food", name: "Food & coffee" },
  { id: "z_mentor", name: "Mentor corner" },
  { id: "z_quiet", name: "Quiet room" },
  { id: "z_expo", name: "Expo tables" },
];

export const SAMPLE_PROFILE = {
  headline: "Finance student exploring AI startups",
  role: "student" as const,
  university: "UNC Charlotte",
  major: "Finance",
  bio: "Interested in where AI and finance meet. I have a startup idea and want to find people to build it with.",
  skills: [
    { skill: "finance", level: 3 as const },
    { skill: "business-strategy", level: 2 as const },
    { skill: "public-speaking", level: 2 as const },
  ],
  interests: ["ai", "fintech", "startups"],
  gives: ["Financial modeling basics", "Practicing your pitch"],
  ask: "I want to build an AI startup but need a developer and a designer.",
  lookingFor: ["backend-engineer", "designer", "ml-engineer"],
  openTo: ["cofounder", "hackathon-team"] as ("cofounder" | "hackathon-team")[],
};

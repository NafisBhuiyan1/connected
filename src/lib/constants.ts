// Small constants safe to import from client components (no seed data).

export const CROWNHACKS_ID = "ev_crownhacks";

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

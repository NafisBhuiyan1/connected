# Connected — Find your people. Build what's next.

**Built at CrownHacks 2026 (UNC Charlotte).** Connected is an AI collaboration engine for events. You describe what you want to build. Connected works out the roles the project needs, runs a team optimizer over the people at the event who opted in, explains every match from real profile data, and then turns the match into a conversation: a specific ask, an intro you approve, a meeting spot, and a "was it useful?" check afterward.

> LinkedIn tells you who people are. Connected tells you who to build with.

## What works (end to end)

| Flow | What happens |
|---|---|
| **Onboarding** (`/onboarding`) | A 4-step profile: skills with levels, interests, "what I can help with in 15 minutes", goal, who you want to meet. Then join CrownHacks, pick a zone and set privacy. A Quick-start sample profile makes the judge demo take about 60 seconds. |
| **AI Team Builder** (`/build`) | Pitch → roles (Claude, or the rules engine) → optimized team with per-role coverage, cohesion and solver stats. You can swap, lock or remove people, add or remove roles, and post missing roles as *open roles*. Sending invites creates a team room. |
| **Team room** (`/teams/[id]`) | Invite status, accept/decline, chat, next-step checklist, meeting-spot suggestions, role coverage. A team becomes "formed" once the invites are answered. |
| **Discover** (`/discover`) | Natural-language search → interpretation panel → explainable, role-diverse, reciprocal matches. |
| **Events + zone map** (`/events`, `/events/[id]`) | Opt-in networking space, an approximate **zone map** (no GPS pins), time-boxed live status ("open to chat until 4 PM", with a request cap), **location check-in**, open roles on forming teams, and **organizer insights** (skill supply vs. demand, unteamed people, rate of useful conversations). |
| **Connections** (`/connections`) | Requests that require a specific ask, accept with a meeting spot, decline, withdraw, message threads, outcome rating, team invites. |
| **Quiet interest** | Double opt-in: the other person only finds out if they also want to meet you. |
| **Missions** (`/missions`) | Goal → target roles → measurable progress: discovered → reached out → accepted → useful conversation or team formed. |
| **Opportunity Radar** (Home) | Open roles that fit your skills, high-fit people who are free right now, events with strong matches, and warm intro paths (only through people who opted in to making intros). |
| **Graph** (`/graph`) | Why each person is recommended: the roles they fill, shared interests, events and teams. |
| **QR profile** (`/profile` → `/p/[id]`) | Show the QR code at the event. Scanning it opens your card, or sends a new user to signup and then back to your profile. |
| **Demo control room** (`/demo`) | Act as a clearly labeled fictional persona (e.g., to accept the judge's invite live), reset demo data. Disable with `DEMO_MODE=off`. |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine tests + optimizer benchmark
npm run build      # production build
```

Optional `.env.local` (see `.env.example`):

- `ANTHROPIC_API_KEY`: turns on Claude for goal understanding and intro drafting. Without a key, the deterministic rules engine runs and the UI says which one ran.
- `SESSION_SECRET`: required in production (signs the session cookie).
- `DEMO_MODE=off`: hides persona switching.

## How it works

### Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind v4 + Motion.** Client pages talk to typed route handlers under `src/app/api`.
- **Service layer** (`src/lib/server/services.ts`). Every rule lives here: privacy filters, anti-spam limits, team and mission logic.
- **Engine** (`src/lib/engine/*`). Pure, deterministic and unit-tested: intent parsing, matching, team optimization, event ranking, intros.
- **AI** (`src/lib/server/ai.ts`). Claude (`claude-opus-5-5`, low effort, structured outputs constrained to our ontology, server-side refusal fallbacks enabled) for (1) goal → roles/skills/interests and (2) intros and icebreakers drawn from a fact sheet. Hard 15s timeout, with automatic fallback to the rules engine.
- **Storage** (`src/lib/server/store.ts`). A JSON-file datastore behind `getDb()`/`mutate()`. `supabase/schema.sql` is the production schema (Postgres + row-level security) for swapping it out.

### Matching (explainable and reciprocal)

`score = 80% forward fit + 20% reciprocity`. Forward fit is made up of:

| Factor | Weight | Signal |
|---|---|---|
| Complementary skills | 30% | Noisy-OR role coverage over a 54-skill ontology with related-skill partial credit. Roles you already cover count for less. |
| Shared interests | 20% | Exact plus related-interest overlap |
| Compatible goals | 20% | Collaboration-type compatibility (cofounder ↔ cofounder, mentee ↔ mentor, …) |
| Offered help | 10% | Their "I can help with…" items match what you need |
| Same event | 15% | Both opted in to the event's networking space |
| Availability | 5% | Time-boxed live status beats a static setting |

Reciprocity asks whether you cover what *they* are looking for (reciprocal recommenders, Pizzato et al. 2010). Multi-role searches are re-ranked with an MMR-style diversity penalty (Carbonell & Goldstein 1998), so you see a designer *and* a developer. Every reason string is built from profile fields, and a test asserts that quoted "offered help" text exists verbatim on the profile.

The score is an **algorithmic compatibility estimate**, not a prediction of success.

### Team formation (the core)

```
f(T) = Σ_r w_r · max_{p∈T∪owner} cov(p,r) / Σ w_r      weighted role coverage (facility location, submodular)
     + 0.25 · cohesion(T)                             shared interests, compatible goals, same event (symmetric)
     + 0.10 · mean reciprocity                        does each person want this kind of team?
     − 0.02 · |T|                                     no padding
```

- **Exact search** when there are ≤ 60k possible teams. A ~30-person team-seeking pool with teams of 4 is a few thousand combinations, solved in well under a second.
- **Multi-start greedy + swap/add/drop local search** above that. Greedy alone has a (1 − 1/e) guarantee on the coverage term (Nemhauser, Wolsey & Fisher 1978). Team formation with team-fit costs is NP-hard (Lappas, Liu & Terzi, KDD 2009).
- **Benchmark** (`npm run bench:teams`): across 96 owner × project scenarios, the heuristic matched the exact optimum in **95/96** and was always within **0.5%** of it.
- Roles are assigned to members by an exact maximum-weight assignment. Gaps are reported as "missing pieces" and can be posted as open roles, which then appear on matching people's Opportunity Radar.

### Location: useful and private

- **Zones, not GPS:** you pick an approximate zone (mixer, main hall…), and others see the zone only.
- **Check-in:** the browser reads GPS, *your device* computes the distance to the venue geofence, and the server receives only `checkIn: true`. Coordinates are never sent, stored or shown. Checked-in people get a "Here now" badge and filter.
- **Near me:** events can be sorted by distance, also computed on the device.
- Geolocation requires HTTPS (or localhost). Over plain-HTTP LAN addresses, browsers block it and the UI says so.

## Privacy and trust

- Discovery is opt-in per event, and you only see an event's networking space after opting in yourself.
- Visibility can be everyone, events-only or hidden. Hidden profiles return 404 to strangers and are never ranked.
- Every request needs a specific ask (≥ 12 characters). There's a cap of 15 pending outgoing requests, and recipients set a request cap and a "heads-down" mode on their live status.
- Declines are silent. You can block anyone.
- AI drafts are never sent automatically.
- Demo personas are fictional and labeled **Demo** everywhere. Persona switching only works for demo profiles.

## Honest limitations

- Identity is a signed cookie (demo-grade, no passwords). Production should use Supabase Auth or OAuth behind the same `currentUser()` boundary.
- The JSON store persists on one machine. On Vercel it lives in `/tmp` and resets on cold starts, so use `supabase/schema.sql` for a real deployment.
- "Live" updates come from polling every 3–5 seconds, not websockets.
- Location check-in is self-attested by the client: a determined user could fake it. It's a convenience signal, not a security boundary.
- Seeded people are fictional. CrownHacks facts come from the public event page, and the zone layout is illustrative.

## Project map

```
src/lib/ontology.ts          skills, interests, roles, collaboration compatibility
src/lib/engine/intent.ts     rules-based goal understanding (LLM fallback)
src/lib/engine/match.ts      reciprocal, explainable scoring + diversity re-ranking
src/lib/engine/team.ts       team optimizer (exact / greedy + local search) + role assignment
src/lib/engine/events.ts     event ranking + organizer insights
src/lib/server/ai.ts         Claude integration with structured outputs + fallback
src/lib/server/services.ts   privacy, anti-spam, teams, missions, radar, graph
tests/                       engine tests + optimality benchmark
supabase/schema.sql          production schema with row-level security
```

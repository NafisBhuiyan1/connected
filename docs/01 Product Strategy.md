---
tags: [connected, strategy]
updated: 2026-11-07
---
# Connected: product strategy

Back to [[00 Start Here]] · Evidence: [[04 Research - Competitors & Papers]] · Pitch: [[02 Demo, Pitch & Video]]

## A. Honest critique of the original idea

| Weakness | Why it matters | What we did about it |
|---|---|---|
| "LinkedIn but nearby" is derivative | Judges have seen 100 networking apps | Reframed around **outcomes**: *idea → team → real meeting* |
| AI matchmaking already exists | Grip, Brella, Whova and Swapcard all do 1:1 matching | Our core is **multi-person team optimization** with explanations, which none of those event platforms do |
| Cold start / empty map | No users means no value | Launch **inside one event** (CrownHacks) with an opt-in space. Seeded demo personas are labeled. |
| Live GPS is creepy and legally sensitive (FTC treats precise location as sensitive) | Kills trust | **Zones, not pins.** Location check-in computes distance **on the device** and only sends "yes, I'm here". |
| Helpers get spammed | The people everyone wants stop showing up | **Required specific ask**, time-boxed status with a **request cap**, heads-down mode, silent declines, blocking |
| "AI" as a gimmick | Judges ask "isn't this just GPT?" | Claude only interprets goals and drafts intros. **Matching and optimization are deterministic, tested, benchmarked**, and work with no API key. |
| Match % sounds fake | Overclaiming hurts credibility | Every score is labeled an *algorithmic compatibility estimate* with a factor breakdown and reasons drawn from the profile |

## B. Competitive differentiation (see [[04 Research - Competitors & Papers]])
- **Event platforms** (Grip, Brella, Whova, Bizzabo, Swapcard) do 1:1 recommendations and meeting scheduling.
- **Hackathon tools** (Devpost, HackerEarth, TAIKAI) offer "looking for team" flags. **Team-formation tools** (CATME, gruepr, hackathon.camp) are run by an organizer or instructor.
- **A.Team "Team Formation AI" (2024)** goes goal → roles → team, but for paid B2B staffing from a vetted network, and it no longer appears on their homepage.
- **Lunchclub** pivoted, **Bumble Bizz** was discontinued, **Shapr** closed.
- **What we can say:** "In our review, no event platform lets a *participant* describe a project and has AI assemble a complementary team from the people *at that event* who opted in, explaining every pick."
- **What we can't say:** "first ever AI team builder."

## C. Final concept
- **Target user:** students and early-career builders at hackathons, career fairs and pitch nights. About half of CrownHacks attendees are first-timers, and many arrive without a team.
- **Second customer:** event organizers. They get supply/demand insights (e.g., "9 teams need designers, 3 designers here"), which is the B2B revenue path.
- **Value proposition:** *Tell Connected what you want to build. It finds the people to build it with, and gets you into a real conversation.*
- **Tagline:** **Find your people. Build what's next.**

## D. Killer feature: the AI Team Builder
A pitch goes in. Out comes the set of roles the project needs (with reasons), an optimized team, coverage per role, swap/lock/remove controls, "missing piece" detection with one-tap open-role posting, and invites into a team room.
- **Why this one:** it is the clearest *wow* in 60 seconds, it's technically deep (a real optimization problem, benchmarked against brute force), it directly fixes CrownHacks' own pain (the team-formation mixer), and it's the feature competitors don't have at events.

## E. Feature architecture

| Tier | Features |
|---|---|
| **MVP (built)** | Profiles with skills, levels and "gives" · goal understanding · reciprocal matching with explanations · **Team Builder** · team rooms · requests with required ask · events and opt-in space · demo control room |
| **High-value (built)** | Zone map · time-boxed live status · **location check-in** · quiet interest (double opt-in) · AI intros and icebreakers · missions with measurable progress · Opportunity Radar · organizer insights · graph · QR profile · mobile-first UI |
| **Future** | Supabase Auth + Postgres (schema written) · websockets · calendar holds · organizer admin console · post-event outcome surveys → learning the weights from data · multi-event communities · Slack/Discord bots |

## F. Technical architecture
Next.js 16 + TypeScript + Tailwind + Motion. Route handlers call a service layer (privacy, anti-spam, teams, missions). The engine is pure TypeScript: intent, match, team, events, intros. The AI layer is Claude with structured outputs constrained to our ontology, a 15-second timeout and a rules fallback. Storage is a JSON store behind `getDb/mutate`, with a Postgres + row-level-security schema in `supabase/schema.sql`. Details: repo `README.md`.

## G. Matching and team formation
- **Match score:** 80% forward fit (skills 30, interests 20, goals 20, offered help 10, same event 15, availability 5) plus 20% reciprocity, i.e. do *you* fit what *they* want (Pizzato et al., RecSys 2010).
- **Role coverage:** noisy-OR over a role's skills, with partial credit for related skills. Domain roles (health, finance…) require the domain skill itself.
- **Diversity re-ranking:** an MMR-style penalty (Carbonell & Goldstein 1998), so a "developer + designer" search shows both.
- **Team objective:** weighted role coverage (facility location, submodular) + 0.25 × symmetric cohesion + 0.10 × reciprocity − 0.02 × size.
- **Solver:** exact enumeration up to 60k teams. Above that, multi-start greedy plus swap/add/drop local search. **Benchmark: optimal in 95/96 scenarios, always within 0.5%.**
- Greedy has a (1 − 1/e) guarantee for the coverage term (Nemhauser et al. 1978). The full problem is NP-hard (Lappas et al. 2009).
- **Bug the benchmark caught:** cohesion wasn't symmetric, so the score depended on member order. Fixing it moved the heuristic from 96.9% to 99% optimal. That's a good judge story: *we test our AI against ground truth.*

## Creative features evaluated
Scored 1–5 for originality (Orig), usefulness (Use), complexity (Cmplx), hackathon feasibility (Feas), demo value (Demo) and differentiation (Diff).

| Idea | Orig | Use | Cmplx | Feas | Demo | Diff | Verdict |
|---|---|---|---|---|---|---|---|
| **Missing-piece broadcast**: gaps become open roles on other people's radar | 4 | 5 | 2 | 5 | 4 | 4 | ✅ Built |
| **Quiet interest** (double opt-in, for introverts) | 3 | 4 | 1 | 5 | 3 | 3 | ✅ Built |
| **Organizer supply/demand dashboard** | 4 | 5 | 2 | 5 | 4 | 4 | ✅ Built (business model) |
| **Outcome ledger**: "was it useful?" drives success metrics | 3 | 5 | 1 | 5 | 3 | 4 | ✅ Built |
| **On-device location check-in** | 3 | 4 | 2 | 5 | 4 | 3 | ✅ Built |
| **Warm intro paths** through people who opted in to making intros | 4 | 4 | 3 | 4 | 3 | 4 | ✅ Built (radar + profile) |
| Learned weights from outcome ratings | 5 | 5 | 4 | 2 | 2 | 5 | Future (needs data) |
| Live round-robin "team speed-dating" scheduler for organizers | 4 | 4 | 3 | 3 | 4 | 4 | Next, if time |
| Skill-swap marketplace ("I teach React, you teach pitching") | 3 | 3 | 2 | 4 | 2 | 2 | Skip |

## M. Realistic ratings (subjective, not a prediction)

| Dimension | /10 | Why |
|---|---|---|
| Innovation | **7.5** | Team optimization *at events for peers*, with explanations, is genuinely uncommon. Networking itself isn't new. |
| Technical difficulty | **8** | A real optimizer plus brute-force benchmark, reciprocal scoring, structured LLM output with fallback, privacy model. |
| Feasibility | **9** | It's built and runs end to end today. |
| UX potential | **8.5** | Mobile-first, animated and clear. Needs real users to tune. |
| Business potential | **6.5** | The organizer side is the paying customer, and the cold start is real outside events. |
| Hackathon competitiveness | **8–8.5** | Strong on Technical (the tiebreaker) and Presentation if the demo runs smoothly. Risk: judges seeing "another networking app". Lead with the team optimizer. |

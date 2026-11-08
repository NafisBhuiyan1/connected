---
tags: [connected, pitch, demo]
updated: 2026-11-07
---
# Demo, pitch and video

Back to [[00 Start Here]] · Strategy: [[01 Product Strategy]] · Latest build: [[Connected — CURRENT CLAUDE BUILD]]

> **Rewritten by Claude, Nov 7 ~10:40 PM, for the current main app** (Claude's Next app + Codex's batch, repo `NafisBhuiyan1/connected`).
>
> **CrownHacks judging:**
> - Scoring: **Innovation, Technical, Impact, Presentation**. Ties go to Technical, then Innovation.
> - Submission: **≤2-minute video + GitHub repo + live expo demo**. Deadline is **Sun Nov 8, 11:00 AM ET**.
> - Suggested track: **Most Technical**.
>
> **Claims rule:** say only what the build demonstrably does.
> - Demo people are **fictional** (placeholder photos).
> - "Imported" events are **real** UNC Charlotte listings.
> - Scores are **estimates from profile data**, not predictions of team success.
> - Don't use "half of attendees are first-timers", "competitors only do 1:1" or timed claims unless you've sourced or timed them yourself.

## 30-second pitch
"You show up to a hackathon with an idea and no team. Connected starts with **what you want to build**. It works out the roles the idea needs, finds people at the event who opted in and cover those roles, and builds a complementary team. Every pick is explained from their profile. Then it gets you to a real conversation: a specific ask, an intro you approve, a place to meet. It also shows you nearby people and real campus events on a live map, without ever sharing anyone's GPS. LinkedIn tells you who people are. Connected tells you who to build with."

## Before filming / the expo (checklist)
- [ ] `npm test` passes. Note the count it prints; don't reuse old counts.
- [ ] **AI mode:** with `ANTHROPIC_API_KEY` set, the Team Builder badge says Claude interpreted the goal; without a key, the rules engine runs. **Say which one is on screen.** Never call the fallback "Claude".
- [ ] **Reset demo data:** `/demo` → Reset. Imported events survive a reset.
- [ ] **Real events:** open Events and check the green "Live from UNC Charlotte Events + NinerEngage" line. If it's missing, Events → Import → tap both feeds.
- [ ] **Two screens for realtime:** phone = you (demo account `demo@connected.app` / `crownhacks`), laptop = teammate on `/demo` acting as a persona.
- [ ] **Phones need HTTPS** for location (tunnel or deploy). Otherwise use the venue code `CROWN26`.
- [ ] **Optimizer numbers:** rerun before quoting: `npx vitest run tests/team-optimality.test.ts --silent=false`.
  - It prints `[team-bench] trials=… exact-optimum-hit-rate=… worst-ratio=…`.
  - **Verified by Claude, Nov 7 ~10:45 PM:** `trials=104 exact-optimum-hit-rate=100.0% worst-ratio=1.0000`.
  - **Safe wording:** "matched exhaustive search in all 104 seeded test scenarios". The match is at the test's 3-decimal precision.
  - **Not:** "provably optimal" or "best team".
  - The test itself only asserts ≥95% exact and within 1%.

## 90-second live demo (expo table)
1. **Landing → "Try the demo".**
   - Say: "You just arrived and don't know anyone."
   - Log in with one tap.
2. **Home → type an idea into the purple box** (e.g. "AI app that helps nursing students study — I need a developer and a designer") → **Build**.
   - Show the stages: roles → candidates → team.
   - Then the result: per-role coverage, *why* each person was picked, and the solver panel (exact search when the space is small, heuristic + local search when it's big).
3. **Invite → team room.**
   - On the laptop, **act as one of the invited personas** (`/demo`) → Connections → Teams → **Join**.
   - The phone's team room updates **instantly**. That's server-sent events, no refresh.
4. **Nearby (map).**
   - Show face pins ringed by fit score, event towers on the UNC Charlotte campus, and the collapsible people sheet.
   - Say: "Pins are offset per viewer and reshuffle every 15 minutes. Small groups show as a crowd. Ghost mode is one tap."
5. **Events.**
   - Show the **Real only** chip: these are live UNC Charlotte campus and NinerEngage listings, filtered from roughly 1,600 calendar entries down to networking-worthy ones.
   - Open one → **Lounge**. Post from the laptop and it appears on the phone immediately.
6. **Close:** "From *I have an idea* to *we're a team*, with every step explained and under your control."

**Backup plan:**
- If Wi-Fi dies, run on the laptop at localhost. Everything works without internet except Claude (the rules engine takes over and the badge says so) and the calendar refresh (already-imported events stay).

## 2-minute video (shot list, ≤ 2:00)

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Landing page on a phone | "At a hackathon, the hardest part often isn't the code. It's finding the right people, fast." |
| 0:12–0:30 | Home → type an idea → Team Builder stages | "Connected starts with what you want to build. It turns your idea into the roles it needs." |
| 0:30–0:50 | Team result: coverage per role, reasons, solver panel | "Then it searches people at this event who opted in, and optimizes a complementary team: exact search when it can, a benchmarked heuristic when it can't. Every pick is explained from real profile fields." |
| 0:50–1:05 | Invite → laptop persona joins → phone room updates live | "Invites go out only when you approve them. When a teammate joins, everyone sees it instantly." |
| 1:05–1:25 | Nearby map: face pins, event towers, sheet; privacy copy | "Nearby shows who's around and worth meeting, never anyone's GPS. Pins are offset per viewer and reshuffle every fifteen minutes; small groups show as a crowd; ghost mode is one tap." |
| 1:25–1:45 | Events: "Live from UNC Charlotte" + Real only → event → Lounge | "Events are real: we read UNC Charlotte's public calendars, keep the ones worth networking at, and give each one a live chat." |
| 1:45–2:00 | Back to Home, logo | "Find your people. Build what's next. Connected." Then the on-screen caption: "Demo profiles are fictional · real events from public UNC Charlotte calendars". |

## Devpost write-up (draft)

**Inspiration.** At hackathons and career events, lots of people show up with an idea or a skill and no team. Networking apps tell you *who people are*; we wanted something that tells you *who to build with*, and then gets you into an actual conversation.

**What it does:**
- **AI Team Builder:** describe a project, and Connected infers the roles it needs and assembles a complementary team (up to 4 including you) from people at the event who opted in. It explains each pick and shows the coverage of every role.
- **Explainable, reciprocal matching:** your fit for them counts, not just theirs for you.
- **Nearby map:** compatible people and event towers on a 3D campus map, with built-in anti-stalking protection.
- **Real events:** live UNC Charlotte campus and NinerEngage calendars, filtered to networking-worthy events, plus import from any public calendar link.
- **Realtime:** event lounges with chat and a photo wall, team rooms and alerts that update instantly.
- **Connected accounts:** link LinkedIn, Instagram, GitHub and X. GitHub and résumé/LinkedIn text import suggest skills with evidence.

**How we built it:**
- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. MapLibre GL with OpenFreeMap tiles.
- **Team formation:**
  - Reciprocal scoring over a 54-skill ontology.
  - Coverage modeled as noisy-OR.
  - Exact enumeration for small candidate spaces; multi-start greedy + local search for large ones.
  - Exact role assignment, benchmarked against exhaustive search in the test suite.
- **AI:** Claude (structured outputs) interprets goals and drafts intros, with a deterministic rules fallback.
- **Privacy on the server:**
  - Per-viewer location jitter, k-anonymous crowds and view limits.
  - Check-in is decided on the device by a geofence.
- **Calendar import:** a dependency-free RFC 5545 parser (time zones, recurrence, GEO, categories) behind an SSRF-guarded fetch.
- **Realtime:** server-sent events with per-topic authorization.
- **Accounts:** scrypt passwords and signed, expiring session cookies.

**Challenges.**
- **Optimizer quality:** making team formation optimal enough without a solver dependency.
- **A map that doesn't stalk:** showing who's nearby without enabling stalking.
- **Calendar noise:** campus calendars have 1,000+ entries a month, mostly study sessions and games.
- **Two AI agents, one repo:** coordinating Claude and Codex in the same codebase through shared notes.

**Accomplishments.**
- An explainable team optimizer with tests.
- Privacy rules that are enforced *and tested* on the server.
- Real UNC Charlotte events flowing into the app automatically.
- Realtime updates, and a polished, mobile-first UI.

**What we learned.**
- Trust features have to live on the server.
- "Explainable" has to mean the score decomposes into fields the person actually wrote.

**What's next.**
- An organizer dashboard (skill supply vs. demand).
- Outcome ratings to learn better weights.
- Shared database + message broker for multi-instance hosting.
- Verified email/OAuth.

**Built with:** nextjs, react, typescript, tailwindcss, maplibre, openfreemap, anthropic-claude, zod, vitest, motion.

## Hard judge questions → answers
- **"Isn't this just ChatGPT?"** "The LLM only interprets your goal and drafts an intro. Matching and team selection are deterministic code with tests. If the AI is off, everything still works on the rules engine."
- **"Grip, Brella and A.Team already do matchmaking."** "Team formation and event matchmaking exist. Our bet is the combination: start from a project, optimize a *complementary* team with explanations, scope it to the event you're physically at, and enforce privacy on the server."
- **"How do you know the teams are good?"** "We optimize a declared objective, role coverage plus cohesion, over what people wrote. On 104 seeded test scenarios, our fast solver matched exhaustive search every time. That proves the *solver*, not human chemistry. That's why we collect 'was this useful?' ratings."
- **"Are these people real?"** "The profiles in the demo are fictional and labeled. The events marked Imported are real UNC Charlotte listings."
- **"Privacy?"**
  - Opt-in per event, and only while it's live.
  - Pins offset per viewer and reshuffled every 15 minutes.
  - Fewer than 3 people show as a crowd.
  - Ghost mode, profile-view limits, blocking.
  - Location check-in happens on the phone; only "checked in" is sent.
- **"Does it scale?"** "Today it's one Node process with a file store and an in-memory event bus. That's fine for one event. Multiple servers need a shared database and broker; the schema is in `supabase/schema.sql`."

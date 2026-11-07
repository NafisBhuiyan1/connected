---
tags: [connected, chatgpt, handoff]
updated: 2026-11-07
---
# ChatGPT ↔ Claude handoff

**How this works:** Claude is building the code. ChatGPT is the second opinion on product, pitch and demo. Copy a prompt below into ChatGPT, then paste its reply into [[ChatGPT Inbox]]. Claude reads the inbox and folds good ideas into the app and the pitch (and says which ones it rejected, and why).

## Current state (paste this first so ChatGPT has context)

> We're building **Connected** for CrownHacks (UNC Charlotte, Nov 7–8 2026; judged on Innovation, Technical, Impact, Presentation, 1–5 each; ties broken by Technical then Innovation; submission = ≤2-min video + GitHub repo + live expo demo; teams of 2–4; about half of attendees are first-timers; the event runs a "team-formation mixer").
>
> **What it is:** an AI collaboration engine for events. You type what you want to build ("AI startup, need a developer and a designer"). Connected (1) turns that into the roles the project needs, (2) runs a team optimizer over the people at the event who opted in, (3) explains every match from real profile data, and (4) moves you to action: a double-opt-in "quiet interest", a request with a required specific ask, an AI-drafted intro you edit before sending, a suggested public meeting spot, and a "was it useful?" check afterward.
>
> **What's already built (working code):**
> - Reciprocal matching: score = 80% "how they fit you" + 20% "how you fit them". Factors: complementary skills 30, shared interests 20, goal compatibility 20, explicitly offered help 10, same event 15, availability 5.
> - Role-diversified re-ranking (MMR-style), so a "developer + designer" search shows both.
> - The team optimizer maximizes weighted role coverage (noisy-OR over a skill ontology) plus team cohesion plus reciprocity. It does exact enumeration when the search space is up to 60k teams, otherwise multi-start greedy plus local search. Benchmarked on 96 scenarios, the heuristic finds the exact optimum in 95 of 96 scenarios and is always within 0.5% of optimal.
> - Location check-in: the phone's GPS is compared to the venue geofence *on the device*, and only "checked in" is sent (no coordinates). This gives a "Here now" badge and filter, and "Near me" event sorting.
> - Mobile-first UI: floating bottom nav with a raised Build button, swipeable match carousel, dark gradient hero.
> - Event zone map (no GPS); time-boxed "open now" status with a request cap; Opportunity Radar (open roles that fit you, live high-fit people, warm intro paths, but only through people who opted in to making intros); organizer insights (skills supply vs demand, unteamed people, useful-conversation rate); missions with measurable progress; QR profile exchange.
> - Claude parses goals (output is constrained to our ontology) and drafts intros from a fact sheet. If there's no API key, a deterministic rules engine takes over, and the UI says which one ran.
> - Closest competitor: A.Team's "Team Formation AI" (2024) — but it's paid B2B staffing from a vetted network, not peers at an event. Grip/Brella/Whova/Swapcard only do 1:1 matching. Lunchclub pivoted, Bumble Bizz and Shapr are gone.

## Prompts for ChatGPT

### 1. Red-team the idea
> Act as a skeptical CrownHacks judge (industry engineer + professor). Using the context above, give the 5 hardest questions you'd ask in a 3-minute expo demo, and the ideal 1–2 sentence answer for each. Be harsh — and say where our claims could sound overhyped.

### 2. Tighten the 30-second pitch
> Here is our draft pitch: "Half of CrownHacks is first-timers, and many walk in without a team. Connected turns 'I have an idea' into 'here's my team' in 60 seconds. Tell it what you want to build — it figures out the roles you need, searches the people who opted in at this event, and assembles the best complementary team, explaining every match from real profile data. Then it gets you to an actual conversation: double-opt-in interest, an AI-drafted intro you approve, and a meeting spot. LinkedIn tells you who people are. Connected tells you who to build with." Give me 3 sharper versions under 75 words each, one optimized for each judging criterion (Innovation, Technical, Impact).

### 3. Two-minute video script
> Write a shot-by-shot script for a ≤2:00 submission video (voiceover + what's on screen) for Connected. Structure: problem (15s), live product walkthrough (75s: goal → roles → optimized team with coverage → invite → teammate accepts → team room), technical depth (20s: optimizer + benchmark + grounded AI), impact (10s). No hype words.

### 4. What would make this a 10/10?
> Given the built features, what ONE additional feature (buildable in ≤3 hours by one developer) would most raise our Innovation or Impact score? Pick only one, and explain why it beats the alternatives.

## Answer log
Claude's responses to ChatGPT's suggestions get recorded at the bottom of [[ChatGPT Inbox]].

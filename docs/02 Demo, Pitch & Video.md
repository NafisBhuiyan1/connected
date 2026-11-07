---
tags: [connected, pitch, demo]
updated: 2026-11-07
---
# Demo, pitch and video

Back to [[00 Start Here]] · Strategy: [[01 Product Strategy]]

> CrownHacks judging: **Innovation, Technical, Impact, Presentation** (1–5 each). **Ties go to Technical, then Innovation.** Submission is a **≤2-minute video, the GitHub repo and a live expo demo**. Suggested track: **Most Technical** (the prize is an NVIDIA Jetson for each member).

## 30-second elevator pitch
"Half of CrownHacks is first-timers, and a lot of people walk in without a team. Connected turns *I have an idea* into *here's my team* in about a minute. Tell it what you want to build. It works out the roles you need, searches the people here who opted in, and optimizes the best complementary team, with every pick explained from real profile data. Then it gets you to an actual conversation: a specific ask, an intro you approve, a place to meet. LinkedIn tells you who people are. Connected tells you who to build with."

## 60–90 second live demo (expo table)
*Setup:* phone A (judge) at `/onboarding`. Laptop B is a teammate on `/demo`. Use the demo data (reset it in the morning).
1. **(0:00)** "You just arrived at CrownHacks and don't know anyone." Judge taps **Quick start**, types their name, and taps through to **Create profile & build my team**.
2. **(0:15)** The Team Builder auto-runs on *"I want to build an AI startup but need a developer and a designer."* Point at the four stages animating.
3. **(0:25)** The result card shows **4 people · 6/6 roles · 99% coverage**. "It didn't hand you eight developers. It picked a backend + AI engineer, a designer and a frontend engineer, and you cover business."
4. **(0:35)** Open **Under the hood**: *Exact search · 3,683 teams evaluated*. "When the space is small we check every possible team. When it's big we use a heuristic we benchmarked against brute force: optimal 95 times out of 96."
5. **(0:45)** Tap **Swap** on one person to show alternatives, then tap **Invite 3 people**. The team room opens: *Forming, 1/4 joined.*
6. **(0:55)** On laptop B, **act as Maya** (demo persona) → Connections → Teams → **Join**. On the judge's phone, the room updates: Maya joined, plus a system message. Once everyone accepts: **🎉 Team formed** and a meeting spot.
7. **(1:15)** Optional: on the event page, tap **Check in**. "Your phone checks you're on campus; only *yes, I'm here* leaves the device." Show the zone map and **Organizer insights** (supply vs. demand).
8. **(1:25)** Close: "From *I have an idea* to *we're a team*, in under 90 seconds."

**Backup plan:** if wifi dies, run it on localhost on the laptop. Everything works offline except Claude, and the rules engine takes over automatically (the badge says which one ran).

## 2-minute video script (shot list)

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:15 | The CrownHacks mixer, then the app's landing page | "Half the people at a hackathon arrive without a team. Finding the right people is luck." |
| 0:15–0:30 | Onboarding Quick start, "build my team" | "Connected starts with what you want to build, not your résumé." |
| 0:30–0:55 | Team Builder stages, then the result with coverage | "It works out the roles, then optimizes a complementary team from people at this event who opted in, and explains every pick." |
| 0:55–1:10 | Under the hood: exact search, benchmark | "Not an LLM wrapper. A real optimizer: exact when it can be, near-optimal when it can't, tested against brute force." |
| 1:10–1:30 | Invite → teammate accepts → Team formed | "Then it gets you to a real conversation. Each person decides; nothing is sent without approval." |
| 1:30–1:45 | Zone map, check-in, privacy copy | "Zones, not GPS. Location is checked on your phone and never leaves it." |
| 1:45–2:00 | Organizer insights, then the logo | "Organizers see which skills are missing. Connected: find your people, build what's next." |

## Longer presentation (3 minutes)
1. **Problem (30s):** first-timers, random team formation, networking that doesn't lead anywhere. Cite the research only from the "safe claims" list in [[04 Research - Competitors & Papers]].
2. **Demo (90s):** the flow above.
3. **How it works (40s):** reciprocal matching → team objective → exact or heuristic solver → benchmark. Claude only interprets goals and drafts intros.
4. **Trust (15s):** opt-in, zones, on-device location, required asks, request caps.
5. **What's next (15s):** organizer dashboard as the business, outcome ratings to learn better weights, Supabase deployment.

## Hard judge questions → answers
- **"Isn't this just ChatGPT?"** "Claude only turns your sentence into roles and drafts an intro. Ranking and team selection are deterministic code you can test. Here's the benchmark."
- **"Grip and Brella already match attendees."** "One-to-one. We form multi-person teams around a goal, and explain the gaps."
- **"What about cold start?"** "We launch inside one event where everyone already is. The organizer pushes the opt-in. Value shows up with about 20 people."
- **"How do you know the match is good?"** "Every score breaks down into factors from the profile. And we measure outcomes: was the conversation useful, did a team form."
- **"Privacy?"** "Opt-in per event, zones not pins, location checked on the device, every request needs a specific ask, request caps, block."
- **"Is 99% optimal real?"** "On 96 seeded scenarios: 95 matched brute force exactly, and the worst was within 0.5%. It's in the repo as a test."

---
tags: [connected, status, roadmap]
updated: 2026-11-07
---
# Build status and roadmap

Back to [[00 Start Here]]

## Working and verified (Saturday afternoon)
- **Full flow:** onboarding → Team Builder (auto-run) → invites → teammate accepts as a demo persona → team room. Tested end to end in the browser.
- **All pages render** at 375 px phone width with no sideways scrolling: Home, Build, Discover, Events, event space, Missions, Connections, Graph, Profile, Demo, person pages.
- **Location check-in:** a simulated on-campus phone checks in, and a simulated phone 8.3 miles away is refused with the distance. "Here now" badges and the filter work.
- **Production build** passes. **15/15 tests pass**, including the optimizer benchmark (optimal in 95/96, within 0.5%).
- **Code** is committed locally (git repo in the project folder) and ready to push.

## Not done or not verified
- **Claude path:** not exercised. No `ANTHROPIC_API_KEY` is set, so everything ran on the rules engine. Add a key to `.env.local` and try one goal before the expo. The UI shows "Understood by Claude" when it's active.
- **Not pushed to GitHub yet:** need the repo URL (see [[00 Start Here]]).
- **Hosting:**
  - Phones need to reach the server. The JSON store resets on Vercel cold starts.
  - **Simplest for the expo:** run it on one laptop and expose HTTPS with a quick tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`). Geolocation needs HTTPS.
- **Not wired:** Supabase / real auth. The schema is in `supabase/schema.sql`.

## Remaining roadmap (hacking ends Sunday 11:00 AM)

| When | Do | Cut if short on time |
|---|---|---|
| Sat evening | Add an Anthropic key and test the Claude path · push to GitHub · set up a tunnel and test from two phones | — |
| Sat night | Record the **≤2-minute video** (script in [[02 Demo, Pitch & Video]]) · rehearse the 90-second demo three times | Polishing secondary pages |
| Sat late | Optional: organizer "team speed-dating" round · real profiles from teammates and willing friends | Graph polish, missions |
| Sun 8–10 AM | Reset demo data (`/demo` → Reset) · final Devpost write-up · pick the **Most Technical** track | Anything new |
| Sun 11 AM | Submit (video, repo, Devpost) | — |

## Risks and mitigations (L)

| Risk | Mitigation |
|---|---|
| Wifi or API failure during the demo | The rules engine fallback is automatic. Run locally from the laptop. |
| Judges think "another LinkedIn" | Open with the Team Builder and the solver stats, not profiles |
| Overclaiming | Use only the safe claims in [[04 Research - Competitors & Papers]]. Scores are labeled estimates. |
| Privacy questions | Zones not pins, on-device location, opt-in per event, required asks, request caps, block |
| Fake-looking data | Every seeded person is labeled **Demo**. Invite real teammates to make profiles. |
| Phones can't use location over plain HTTP | Use the HTTPS tunnel or deploy |
| Data store resets on serverless hosting | Run on one machine for the expo. Supabase schema is ready for later. |

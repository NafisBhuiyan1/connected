---
tags: [connected, status, roadmap]
updated: 2026-11-07
---
# Build status and roadmap

Back to [[00 Start Here]]

Repo: https://github.com/NafisBhuiyan1/connected (everything below is pushed to `main`).

## Working and verified (Saturday evening)
- **Full flow:** onboarding → Team Builder (auto-run) → invites → teammate accepts as a demo persona → team room. Tested end to end in the browser.
- **New look:** white + purple everywhere. The landing page has a phone mockup of the live map with real-photo faces. The login page has a face collage and a one-tap **Try the demo account** button (`demo@connected.app` / `crownhacks`). Onboarding and profile covers match.
- **Nearby map** (`/map`): a 3D map of campus with face pins, event towers, crowd bubbles and a collapsible people sheet. Anti-stalking rules are enforced on the server and covered by tests (see README).
- **Real events, not just samples:** Events → **Import** pulls public calendars (.ics).
  - One tap imports the real **UNC Charlotte Events** and **NinerEngage** feeds. That's 1,600+ raw events, filtered to about 75 networking-worthy ones (career, hackathon, pitch, talks, tech) in ~4 s.
  - Duplicates are caught. The NinerEngage "CrownHacks" listing merges into ours.
  - Venues get real coordinates, so the events show up as towers on the map.
- **Events tab:** filter chips by type (Hackathons, Career fairs, Pitch nights, Meetups, Workshops, Conferences, Seminars), plus "Near me" distance sort.
- **Event lounge:** public chat and an attendee photo wall per event.
- **Connected accounts:** LinkedIn, Instagram, GitHub, X and portfolio links. **GitHub import** turns public repos into skill suggestions; **LinkedIn/résumé paste** works the same way.
- **Location check-in:** done on the device with a geofence; the venue code `CROWN26` is the fallback.
- **Quality:** production build passes and **34/34 tests pass**. That includes the optimizer benchmark (optimal in 95/96 cases, always within 0.5%), 10 privacy tests and 9 calendar-parser tests.

## Not done or not verified
- **Claude path:** not exercised. No `ANTHROPIC_API_KEY` is set, so everything ran on the rules engine. Add a key to `.env.local` and try one goal before the expo. The UI shows "Understood by Claude" when it's active.
- **Hosting:**
  - Phones need to reach the server. The JSON store resets on Vercel cold starts.
  - **Simplest for the expo:** run it on one laptop and expose HTTPS with a quick tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`). Geolocation needs HTTPS.
- **Imported events start empty:** they have no Connected attendees until real people join. Only the seeded sample events show "N going".
- **Not wired:** Supabase. The schema is in `supabase/schema.sql`.

## Remaining roadmap (hacking ends Sunday 11:00 AM)

| When | Do | Cut if short on time |
|---|---|---|
| Sat evening | Add an Anthropic key and test the Claude path · set up a tunnel and test from two phones · import the two UNC Charlotte feeds on the demo machine | — |
| Sat night | Record the **≤2-minute video** (script in [[02 Demo, Pitch & Video]]). Show: landing → demo login → Build → Nearby map → Events → Import → real UNC Charlotte events appear | Polishing secondary pages |
| Sat late | Real profiles from teammates and willing friends | Graph polish, missions |
| Sun 8–10 AM | Reset demo data (`/demo` → Reset; imported events survive) · final Devpost write-up · pick the **Most Technical** track | Anything new |
| Sun 11 AM | Submit (video, repo, Devpost) | — |

## Risks and mitigations (L)

| Risk | Mitigation |
|---|---|
| Wifi or API failure during the demo | The rules engine fallback is automatic. Import calendars before the demo: they persist locally. |
| Judges think "another LinkedIn" | Open with the Team Builder and the solver stats, then the live map. Don't lead with profiles. |
| Overclaiming | Use only the safe claims in [[04 Research - Competitors & Papers]]. Scores are labeled estimates; sample events are labeled "Sample", imported ones "Imported". |
| Privacy questions | Jittered pins that reshuffle every 15 min, crowds under 3 people, ghost mode, view limits, opt-in per event, block |
| Fake-looking data | Every seeded person is labeled **Demo** and the photos are placeholder portraits. Invite real teammates to make profiles. |
| Phones can't use location over plain HTTP | Use the HTTPS tunnel or deploy. The venue code works without GPS. |
| Data store resets on serverless hosting | Run on one machine for the expo. The Supabase schema is ready for later. |

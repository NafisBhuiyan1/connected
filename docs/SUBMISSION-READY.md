# Connected — CrownHacks submission packet

Prepared November 8, 2026. **The Devpost draft has not been submitted by Codex.**

**Upload-ready backup video:** [connected-walkthrough.mp4](media/connected-walkthrough.mp4), approximately **1:48**. It uses captured app screens and synthetic narration, clearly identifies fictional profiles and the rules fallback, and passed a full video/audio decode check. Upload it to YouTube or Vimeo, then paste that platform's URL into Devpost. [Devpost supports YouTube, Vimeo, and Youku links](https://help.devpost.com/article/85-uploading-a-demo-video); a local file or raw GitHub MP4 URL does not complete that field.

**Thumbnail and gallery:** [thumbnail](media/submission-thumbnail.png), [mobile home](media/submission-mobile-home.jpg), [mobile map](media/submission-mobile-map.jpg), [team result](media/submission-desktop-team.jpg), [desktop map](media/submission-desktop-map.jpg), [real events](media/submission-real-events.jpg).

## Required final actions

1. Add every real team member in Manage team. CrownHacks requires **2–4 members**. Do not list AI assistants as teammates.
2. Save the project overview and story below. Add the public GitHub repository under Try it out.
3. Select **Most Technical** (recommended; confirm the team's selection).
4. Upload a real demo video of **2 minutes or less** to a supported video host, then paste its link. A script or local video file alone does not complete this field.
5. Add the screenshots from the submission packet as the thumbnail/gallery (JPG/PNG, each under 5 MB).
6. Preview, inspect the finalization checklist, and submit **before 11 AM Eastern, November 8, 2026**. Be ready for the live expo **11 AM–1 PM**.

Verified official requirements: https://crownhacks.devpost.com/ and https://crownhacks.devpost.com/rules . Scores are Innovation, Technical, Impact, and Presentation; Technical breaks ties first.

## Project overview

**Name:** Connected

**Elevator pitch (under 200 characters):**

Turn an idea into a team. Connected finds complementary people and events nearby, explains each match, and helps you start a real conversation.

**Repository:** https://github.com/NafisBhuiyan1/connected

**ZIP:** https://github.com/NafisBhuiyan1/connected/archive/refs/heads/main.zip

Use the currently verified HTTPS demo link from the local handoff. Temporary tunnel addresses can change; the public repository is the durable code link. The computer, app process, and tunnel must stay running during judging.

## About the project — paste this section into Devpost

### Inspiration

You can arrive at a hackathon surrounded by talented people and still have no idea whom to approach. A list of profiles does not tell you who can help build your particular idea. We wanted the first step to be a useful conversation, starting with a concrete goal.

### What it does

Connected helps students and event attendees find their missing piece. Describe a project, inspect the roles it needs, and build a team of up to four people including yourself. Each recommendation explains the skills and interests behind it, and shows what the team covers and what is still missing.

A campus map brings compatible, opted-in attendees and events into the same view. Person pins represent approximate event zones, not a live GPS feed. Attendees control their visibility, can use ghost mode, and can block others. Small visible groups appear as anonymous crowds.

The personal coach helps narrow an idea, plan a first version, practice a pitch, and find people or events. Suggested actions stay under the user's control. Team invitations require approval; team rooms and event lounges carry the conversation forward. Lounges have General, Find a team, Help, and Showcase channels so unrelated discussions stay organized.

Connected also imports real public UNC Charlotte campus and NinerEngage calendars. Real imported listings are distinguished from sample events, and decorative event covers are labeled as topic artwork. The mobile interface can be installed as a home-screen web app over HTTPS.

### How we built it

We used Next.js, React, TypeScript, Tailwind CSS, Motion, MapLibre GL, and OpenFreeMap. A shared TypeScript service layer enforces visibility and conversation access. Accounts use scrypt password hashing and signed, expiring session cookies.

Optional Claude structured outputs interpret project goals and draft grounded replies. A deterministic rules engine takes over when a model is unavailable, and the interface identifies which mode answered. The model does not choose who is allowed to appear: the server filters eligible people first.

Team selection is a separate optimizer over declared skills, reciprocal compatibility, and role coverage. It uses exact search for smaller candidate spaces and multi-start greedy selection with local improvement for larger ones. We compare the fast solver with exhaustive search in seeded tests. This evaluates the algorithm's stated objective, not whether people will get along.

Real-time updates use an authorized server-sent-events channel. A dependency-free iCalendar parser handles public calendar imports with size, time, and network restrictions. For this hackathon, persistence is a JSON file and the event bus runs in one Node process.

Claude Code and ChatGPT/Codex assisted with implementation, research, tests, and review. We coordinated through shared notes in an Obsidian vault and one GitHub repository.

### Challenges we ran into

Team matching had to account for complementary skills instead of collecting the highest individual scores. Calendar feeds brought time zones, recurrence, duplicate listings, and large amounts of unrelated content. Real-time messaging needed the same privacy checks as ordinary requests. We also worked to make the map useful on a phone without overwhelming it with faces and panels.

### Accomplishments we're proud of

The prototype connects the full workflow: a project idea, an explained team proposal, approved invitations, and a shared conversation. We combined real calendar data with a polished mobile interface and tested privacy, input validation, calendar edge cases, sessions, and real-time access. Our final verification passed 87 automated tests, TypeScript, a production build, and 29 live HTTP checks, including rejected malformed and unauthorized requests.

### What we learned

An explanation is useful when it points to fields people actually supplied. Privacy rules belong on the server. Clear labels also matter: a sample person, a real imported event, a rules-based reply, and an AI-generated reply should never be presented as the same thing.

### What's next

Pilot Connected with consenting event attendees and measure useful conversations. Add verified accounts, improve organizer tools, and replace the single-process store and bus with a shared database and message broker for durable hosting across multiple instances.

### Demo disclosure

Demo profiles are fictional and use placeholder portraits. Imported calendar events are real public listings. Compatibility is an estimate from declared profile data, not a prediction of human chemistry. The installable version is a web app, not an App Store release. Public tunnel hosting is temporary.

## Built with — tags

nextjs, react, typescript, tailwindcss, nodejs, maplibre, openfreemap, anthropic, claude, zod, vitest, motion, icalendar, pwa, github, obsidian

## 100-second demo script

Record the actual interface. Keep the completed video below two minutes, including the title and closing.

| Time | Screen | Say |
| --- | --- | --- |
| 0–12 s | Home on phone | “You arrive at a hackathon with an idea and no team. Connected helps you find people who can move that idea forward.” |
| 12–35 s | Enter an AI finance project; show Team Builder result | “Describe the goal. Connected identifies roles, searches opted-in people, and assembles a complementary team. Each choice has a reason, and you can inspect the gaps.” |
| 35–55 s | Map; open one person | “Nearby turns the room into a map of possible conversations. These are fictional demo profiles. Pins show approximate event zones, with visibility controls and ghost mode.” |
| 55–70 s | Events; real imported listing; lounge channels | “Public UNC Charlotte calendars bring in real events. Each event has focused channels for finding teammates, getting help, and sharing work.” |
| 70–85 s | Coach response and team handoff | “Your personal coach helps shape the next step. The reply labels its AI or rules mode; sending an invitation always stays your choice.” |
| 85–100 s | Team proposal; GitHub; logo | “Matching and team selection are tested code, separate from the language model. Connected: find your people, build what's next.” |

## Judge answers

- **Is it just an LLM wrapper?** The model interprets goals and drafts replies. Eligibility, reciprocal scoring, role coverage, team optimization, permissions, and event import are application code.
- **Are the people real?** Demo people are fictional; imported calendar events are real. Real users can create their own profiles and opt in.
- **Does it scale?** This demo uses one Node process with file storage. Multiple instances need a shared database and broker. No permanent cloud deployment is claimed.
- **Is a high score a guarantee?** No. It summarizes declared skills and collaboration preferences; useful conversations with real participants are the next validation.
- **What was tested?** 87 tests across 15 files, TypeScript, a production build, and 29 live positive/negative HTTP checks. The optimizer additionally matched exhaustive search in 104 seeded scenarios at the test's precision. That is not a universal optimality or team-success claim.

## Presenter recovery

Keep the laptop plugged in and awake. Use the already running local production preview at http://127.0.0.1:3001 if a public tunnel fails. Use demo@connected.app / crownhacks, or the Try the demo button. The venue fallback code is CROWN26. Use /demo to act as a fictional invite recipient after signing in. Avoid resetting during a judge's active session.

One non-fatal build warning remains: Next traces the dynamic photo-storage path broadly. The production build succeeds; it is a packaging concern for deployment, not evidence that all possible runtime errors are absent.

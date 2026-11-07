---
tags: [connected, index]
updated: 2026-11-07
---
# Connected: start here

**Find your people. Build what's next.** An AI collaboration engine for CrownHacks 2026 (UNC Charlotte, Nov 7–8). You describe what you want to build; Connected works out the roles, optimizes a complementary team from people at the event who opted in, explains every pick, and gets you to a real conversation.

## Notes
1. [[01 Product Strategy]]: critique, competitors, final concept, killer feature, architecture, algorithms, ratings
2. [[02 Demo, Pitch & Video]]: 30-second pitch, 90-second live demo, 2-minute video script, judge Q&A
3. [[03 Build Status & Roadmap]]: what works, what's left, risks, timeline to Sunday 11 AM
4. [[04 Research - Competitors & Papers]]: CrownHacks facts, competitor table, 17 papers, safe vs. unsafe claims
5. [[ChatGPT Handoff]] / [[ChatGPT Inbox]]: paste ChatGPT's feedback into the inbox and Claude folds it in

## Run it
In the project folder:

```
npm install
npm run dev     # http://localhost:3000
npm test
```

Optional: put `ANTHROPIC_API_KEY=...` in `.env.local` to turn on Claude.

## Push to GitHub
The code is committed locally. Send Claude your repo URL (e.g. `https://github.com/<you>/connected`), or run:

```
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Git will open a GitHub sign-in window the first time.

## Teammate idea: what we kept
- "Gives & Asks" (what I can help with in 15 minutes)
- Time-boxed availability with request limits
- Event zones instead of GPS pins
- A required specific ask
- Meeting-spot suggestions
- A "was it useful?" outcome rating
- Warm intro paths only through people who opted in

We dropped live GPS maps and "LinkedIn with GPS" framing.

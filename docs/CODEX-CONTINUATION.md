# Codex continuation — November 7, 2026, evening Eastern

Continued the user's pasted Claude queue from clean `3064ed6` in this Next application. GitHub origin is `https://github.com/NafisBhuiyan1/connected.git`; it already existed and its remote main matched that baseline before these edits.

## Changes

- Richer white/purple landing page: a fine-star violet product scene, idea/skill callouts, scroll-linked connection trail, staggered features, and reduced-motion alternatives. Mock profiles/metrics are labeled as illustrations. Fixed overlapping mobile face/text layout.
- Event discovery offers eleven subject filters across computing, engineering, business, health/nursing, science, arts, humanities, social sciences, education, law, and communications. Classification uses actual event text; empty subjects do not invent events. Fixed the clipped phone home-page idea form.
- Session tokens include a signed server-checked expiration. Production sign-in rejects missing/short secrets instead of using the published development key. Old unversioned cookies require a new login. This does not add a session-revocation database or verified email/OAuth.
- Invalid-event signup now validates the event before creating an account, preventing half-created accounts after a 400 response.
- SSE retains subscriber request context, rechecks authorization, bounds lifetime/buffering, and cleans abort/cancel races. Shared client reconnects refresh snapshots and trailing writes are retained. HTTP room/thread reads and writes now also reject declined/blocked/unaccepted access as appropriate. Invited active team members retain their intended room access.
- Calendar imports validate dates, preserve local recurrence time through DST, honor simple exclusions/counts, skip invalid monthly dates, reject unsupported recurrence semantics, bound UTF-8 bytes and total download time, and coalesce concurrent imports of the same source. Unknown topics no longer receive fabricated startup/developer tags. Both official feeds returned HTTP200 with current calendar contents.

## Verification

The full Vitest suite passed 65 tests across 11 files, including new session, subject, stream/client/access, and importer regression checks. TypeScript passed. Ten isolated live API checks passed, including invalid-event signup then reusing the same email, unauthorized stream rejection, and cross-user lounge notification delivery. One synthetic account remains only in the isolated review dataset.

Browser QA used a separate in-app tab and `CONNECTED_DATA_DIR` outside the repo; it did not overwrite the user's saved dataset. Checked the landing at desktop and 390px, demo login, phone home and event subject selection. See the shared vault for final production build/push status and screenshots; a check or push listed as pending must not be described as complete until verified.

## Remaining practical limits

The JSON file store and in-memory event bus target one Node process with persistent disk. Multiple replicas need shared storage/broker. Calendar background refresh runs while the application process is active; it is not a durable independent cloud scheduler. Full recurrence overrides/RDATE, cancellation handling for already-joined imported events, and DNS resolution binding need additional work. Preserve imported/source labels and demo persona labels. The old separate Sites app is still a different prototype; do not confuse its hosted URL with this Next app.

Use a fresh random `SESSION_SECRET` for production and a Node host with persistent storage, or complete the supplied Supabase adapter before a serverless deployment. Never commit actual environment files or local data. The next user-facing work should follow verified mobile flows and the latest shared notes, preserving this batch of fixes.
# November 8 final submission pass

Continued from Claude's clean, pushed `4371a89`. Preserved the finished mobile UI, coach, event artwork, feed filters, and lounge channels. Added Apple home-screen metadata, corrected the assistant install shortcut to `/coach`, and changed public profile projection to an explicit allowlist so private preferences cannot leak through nested matches. Demo controls now require sign-in, do not enumerate real accounts, and return only id/name for the original presenter. Three regression tests cover the release fixes.

Verification: **87 tests across 15 files passed**, standalone full TypeScript passed, production build passed. The existing dynamic photo-path tracing warning remains non-fatal. **29 live HTTP checks passed** on an isolated public judging server: secure demo login, install assets, rejected anonymous access, malformed/system/identity/oversized assistant input, cross-origin/type rejection, profile privacy, invalid channels/team size, channel isolation, and removal of the test post. The optimizer benchmark additionally reported 104/104 seeded scenarios matching exhaustive search at test precision (not a guarantee of human compatibility).

`docs/SUBMISSION-READY.md` contains the current paste-ready Devpost story, recommended Most Technical track, <=2-minute script, exact official requirements, and explicit missing human inputs. Codex has **not submitted Devpost**. The team's identities, video URL, and finalization declarations must be completed accurately. Chrome's extension failed when claiming/navigating the signed-in draft; no draft fields were changed through a hidden API.

The judging preview is a production Node process on `127.0.0.1:3001`, with a random runtime-only session secret and a separate `work/judging-data` store. Do not overwrite or reset the user's database. Temporary HTTPS tunnel URLs are recorded only in the local handoff; they depend on this computer staying awake. Cloudflare Quick Tunnel buffers SSE; the existing lounge polling remains a fallback, while local/SSH transport supports SSE. No native Expo or App Store release is claimed; the phone version is an installable PWA.

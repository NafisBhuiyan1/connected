# Connected.

Find the right people around you, and make the first connection easier.

An Expo (SDK 58) + React Native + TypeScript app. The main screen is a real street map of Charlotte, NC showing people who opted in to nearby discovery.

## Run it

**You need:**
- [Node.js LTS](https://nodejs.org) on the computer.
- The **Expo Go** app on your phone (App Store / Google Play).
- A free [Expo account](https://expo.dev/signup). iPhone's Expo Go requires you to be signed in to the same account on the phone and the computer.

**Steps** (in a terminal, inside this folder):

```bash
npm install
npx expo login
npx expo start
```

1. `npm install` downloads dependencies (a few minutes the first time).
2. `npx expo login` signs you in. If the browser doesn't open, use `npx expo login --no-browser`.
3. `npx expo start` shows a QR code. Scan it with the iPhone Camera, or from inside Expo Go on Android. Keep the phone on the same Wi-Fi as the computer. If it can't connect, use `npx expo start --tunnel`.

You can also press `a` for an Android emulator or `i` for the iOS simulator (Mac only).

Checks: `npm run typecheck`, `npx expo lint`, `npx expo-doctor`.

## Demo path

1. Tap **Get started** (or **Try it with a sample profile** to skip ahead as Alex, a first-gen finance student).
2. Set preferences: field, interests, skills → goals → travel distance and role → visibility. Then a short profile.
3. The **Map** opens on Charlotte (or on you, if you allow location). Use the quick chips or **Filters**.
4. Tap a pin → compact card → **View profile** for match reasons and a suggested opener.
5. Pick a style, edit the message, **Send connection request**. A demo reply arrives in about 6 seconds (or use "Accept now").
6. **Inbox** shows requested / accepted / declined / cancelled; accepted requests open a conversation.
7. **Events** lists networking events, career events and hackathons. **Profile → Open Door → Offer one** lets you post a short public-place conversation.

## Map and location

- Map: the phone's built-in map (Apple Maps on iOS, Google Maps on Android) via `react-native-maps`, styled as a "network map": a lavender wash (full custom palette on Android), people as match-strength nodes, and connection lines to your best matches. No API key is needed in Expo Go. Android store builds need a free Google Maps key in the `react-native-maps` config plugin.
- Location (`src/lib/useLiveLocation.ts`): after you allow it, your position updates live **only while the Map tab is open and the app is in the foreground**, and you can pause it. Background location is disabled in `app.json`. Your location is never shown to anyone else.

## Where to meet

On a profile or in a chat, **Where you two could meet** (`src/lib/places.ts`) suggests real places near the midpoint between you and the other person that serve food you both picked in onboarding, ranked so neither of you travels much farther. Places come from OpenStreetMap's Nominatim search (free, no key): the app sends only a rounded area (~1 km), makes at most one request per second, caches results, and falls back to the app's list of public venues when offline.

## Search and hotspots

- **Search** (magnifying glass on the map): searches people by name, role, company, field, skills, interests, languages, neighborhood, food and bio, and shows why each result matched. Implemented as `searchPeople` on the data source, so a backend can replace it.
- **Hotspots** (flame button): color-coded zones for Charlotte's professional hubs (purple = major hub, pink = active hub, teal = emerging spot) with a key on the map. Tap a hotspot's name for details. Hub levels are demo estimates in `src/data/hotspots.ts`; the "people here" count is computed live from opted-in profiles.

## Assistant

The sparkle button on the map opens the **Connected assistant**. It recommends people, drafts first messages, points you to meeting spots, and explains the app.

- **Built-in mode (default):** runs on the phone with no AI service or key (`src/lib/assistant.ts`).
- **Claude mode (optional):** an API key must never ship inside a phone app, so a small proxy in `server/` holds the key and calls Claude (`claude-opus-5-5`, low effort, refusal fallback on, cached system prompt). To use it:

  ```bash
  cd server
  npm install
  cp .env.example .env    # then put your ANTHROPIC_API_KEY and an APP_TOKEN in it
  node --env-file=.env --import tsx src/index.ts
  ```

  Then copy `.env.example` to `.env` in the app folder, set `EXPO_PUBLIC_ASSISTANT_URL` to the proxy's address (for a phone on your Wi-Fi: `http://<your-PC-IP>:8787/assistant`) and the same token, and restart `npx expo start`. For a published preview, deploy the proxy somewhere public (any Node host) and use that URL. If the proxy is unreachable, the app falls back to the built-in assistant.

## Data

All people and events are **demo data** (`src/data/demo.ts`), clearly labeled in the app. Demo pins sit at rounded neighborhood points, never anyone's live location. To connect a backend, implement the `DataSource` interface in `src/data/source.ts`. Screens only talk to `dataSource`.

App state (preferences, profile, requests, Open Doors, saved events) is stored on the device with AsyncStorage (`src/state/AppState.tsx`).

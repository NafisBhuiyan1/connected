# Web build (the computer version at `/app`)

This folder is the Connected. phone app from [kartik215/connected](https://github.com/kartik215/connected), plus a few web-only changes. The Connected site in the repo root serves its web build at `/app`, and the front page's buttons open it.

## What differs from kartik215/connected

- **Computer layout.** Set in `src/app/_layout.tsx` and `src/app/(tabs)/_layout.tsx`.
  - At 900 px wide and up, the tabs move to a top bar and screens sit in a centered column.
  - Phones are unchanged.
- **Map on the web.** `react-native-maps` only runs on iOS and Android.
  - `metro.config.js` swaps it for `web-stubs/react-native-maps.js` on the web.
  - The replacement is a 3D MapLibre map with the same style and buildings as the site.
  - The app's Network, 3D City and Satellite 3D views work through `mapType` and the camera tilt.
  - Markers show as purple dots.
- **Web setup.**
  - `app.json`: `web.output: "single"` and `experiments.baseUrl: "/app"`.
  - `package.json`: adds `react-native-web`, `react-dom` and `@expo/metro-runtime`.

## Rebuild `/app`

From this folder:

```bash
npm install
```

```bash
npx expo export --platform web --output-dir dist
```

```bash
node ../scripts/flatten-expo-assets.js dist
```

Then replace the repo's `public/app` with the contents of `dist`:

- Windows: `robocopy dist ..\public\app /MIR`
- macOS or Linux: `rm -rf ../public/app && cp -R dist ../public/app`

**Why the flatten step:** it moves the exported fonts and images out of `node_modules` folders, which git and Vercel uploads skip.

**MapLibre dependency:** MapLibre loads at runtime from the site's `/vendor/maplibre-gl.mjs` and `/maplibre-gl-worker.mjs`. So the web build only works when the Connected site serves it.

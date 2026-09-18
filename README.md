# Sift

A local-first iOS file manager that makes files easier to find, organize, preview, and act on.

## Run it on your phone

```bash
npm install
npx expo start
```

Expo prints a QR code in the terminal. Scan it with the Camera app on iOS (or the
Expo Go app on Android) and Sift opens in [Expo Go](https://expo.dev/go).

The phone and the computer running `npx expo start` must be on the same Wi-Fi
network. If they are not, or the network blocks device-to-device traffic, use a
tunnel instead:

```bash
npx expo start --tunnel
```

## Other commands

- `npm run ios` / `npm run android` — open directly in a simulator or emulator
- `npm run web` — run in a browser via react-native-web
- `npm run typecheck` — TypeScript, no emit
- `npm run preview:web` — build a static web bundle into `web-preview/` that can be
  hosted from any directory, including under a sub-path (see
  `scripts/prepare-web-preview.js`)

## Where things live

- `app/(tabs)/` — Home, Files, Recent, Tools and Settings screens
- `app/preview/[id].tsx` — the file preview screen
- `components/` — shared UI (action sheets, modals, previews, selection bar)
- `context/` — `FileManagerContext` (files, folders, trash) and `AppSettingsContext`
- `lib/` — device storage, file presentation helpers, and the share-extension inbox
- `constants/colors.ts` — light/dark visual tokens

## Architecture notes

- Local-first: files are copied into Sift-managed storage and classified by
  extension/MIME type; device preferences live in AsyncStorage.
- iOS does not permit third-party apps to become the universal system save
  default, so Sift imports files rather than intercepting saves.
- Files defaults to a visual grid and persists the grid/list preference locally.
- Inter is loaded from the splash screen through every screen.
- The web build is preview-only: `Platform.OS === 'web'` branches stand in for the
  iOS file system, so it exercises navigation and layout, not native file handling.

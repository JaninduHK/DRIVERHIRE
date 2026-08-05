# Car With Driver — Driver App

Android app (Expo + TypeScript) for **drivers** on carwithdriver.lk. It mirrors the
web driver dashboard: overview, quote requests / tour briefs, bookings (accept &
decline), messages + offers, earnings, availability, vehicles and profile. It reuses
the existing JWT backend (`../backend`) — no separate API.

## Stack
- Expo SDK 57 + Expo Router (file-based, under `src/app`)
- NativeWind v4 (Tailwind) — tokens mirror the web app (`tailwind.config.js`)
- @tanstack/react-query for server state; `AuthContext` (SecureStore) for auth
- expo-notifications (push), expo-auth-session (Google), expo-image-picker (uploads)
- Plus Jakarta Sans via `@expo-google-fonts/plus-jakarta-sans`

## Project layout
```
src/
  app/                     # routes
    (auth)/                # welcome, login, forgot-password, register, pending
    (app)/                 # authenticated area (guarded: approved drivers only)
      (tabs)/              # Home / Bookings / Messages / Profile
      menu, briefs, earnings, availability, notifications
      chat/[id], request/[id], vehicles/{index,new,[id]}
  api/                     # client + auth/driver/bookings/chat/briefs modules
  auth/                    # AuthContext + Google sign-in button
  components/              # Screen, GradientHeader, Card, Button, Field, …
  hooks/                   # react-query hooks (queries.ts) + usePush
  lib/                     # session/token store, format, media, push
  theme/                   # colors + font families
```

## Setup
```bash
cd mobile
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL + Google client IDs
```
`EXPO_PUBLIC_API_URL` must include `/api`. For local dev against the backend, use your
LAN IP (e.g. `http://192.168.1.20:3000/api`), not `localhost` — a device can't reach that.

## Run (needs a dev build — Google sign-in & push don't work in Expo Go)
```bash
eas build --profile development -p android    # once, installs a dev client on the device
npx expo start --dev-client
```

## Auth model
- **Drivers only.** Non-driver accounts are rejected at login ("this app is for drivers").
- Approved drivers land in the tabs; **pending/rejected** drivers see the awaiting-approval screen.
- Email/password and **Google** sign-in (no Facebook). Google requires the backend change
  that lets existing drivers authenticate via Google (already applied in `../backend`).

## Push notifications
On login, an approved driver's device registers an Expo push token
(`POST /api/driver/push-token`). The backend fires pushes on new bookings, new chat
messages and new tour briefs (`backend/services/expoPushService.js`). Android push needs
a Firebase project (FCM) wired into EAS credentials.

## Builds
`eas.json` defines `development` (dev client), `preview` (internal APK) and `production`
(AAB). Example: `eas build -p android --profile preview`.

# Funda Mobile

React Native / Expo app for the Funda school management platform.

## Stack

- **Expo** ~51 with Expo Router (file-based routing)
- **React Native** 0.74
- **Supabase** — same backend as the web app
- **expo-secure-store** — replaces localStorage for auth token persistence

## Setup

```bash
cd mobile
npm install          # or: bun install
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Run

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # Android emulator
npm run ios          # iOS simulator (macOS only)
```

## Project structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout — AuthProvider + auth gate
│   ├── auth.tsx             # Sign-in screen
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar (role-aware: parent vs school)
│       ├── index.tsx        # Home / overview
│       ├── discipline.tsx   # Discipline records + log record modal
│       ├── calendar.tsx     # School + national calendar
│       ├── learners.tsx     # Learner list (school staff only)
│       ├── alerts.tsx       # Notifications (parent)
│       └── profile.tsx      # Profile + sign out
├── lib/
│   ├── supabase.ts          # Supabase client (SecureStore adapter)
│   └── auth-context.tsx     # Auth state — mirrors web app logic
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

## Notes

- The tab bar adapts based on role: parents see Home/Discipline/Calendar/Alerts/Profile; school staff see Home/Learners/Discipline/Calendar/Profile.
- The discipline "Log record" modal uses a grade-first → learner picker to avoid scrolling through hundreds of names.
- Assets (icon, splash) need to be added to `assets/images/` before building.

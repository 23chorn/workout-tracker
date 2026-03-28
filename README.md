# LIFT — Workout Tracker

A mobile-first PWA for tracking gym workouts against a fixed program. Offline-first, single user, no backend.

## Features

### Today
- Select a program and day to start a workout session
- Exercises pre-loaded with suggested weight based on progression logic
- Last session's reps shown per exercise for reference
- Log sets inline (weight, reps, working/warm-up toggle)
- Per-set e10RM calculation shown live
- Set confirmation with rest timer (auto-starts on confirm)
- Rest timer persists across browser close
- Add/remove exercises ad-hoc without modifying the saved workout template
- Reorder exercises mid-session
- Auto-collapse completed exercises, timer moves to next exercise
- Session completion summary with duration, volume, set count, and new PBs

### History
- Calendar view (default) showing workout days with monthly navigation
- List view with session duration, workout name, and PB indicators
- Session detail with full set breakdown per exercise
- Edit completed sessions (fix weight/reps/working set mistakes)
- Delete sessions with confirmation
- Per-exercise e10RM trend charts

### Stats
- Total workouts, week streak, sets, reps, volume lifted
- Sessions this month and average per week
- Workouts per week bar chart
- Volume by muscle group horizontal bar chart (secondary muscles at 50%)
- Personal bests list (tap for exercise detail with trend chart)
- Exercise detail: e10RM chart with 3M/6M/1Y/All time periods, PB line, expandable recent sessions with full set breakdown

### Manage
- **Exercises**: 68 seeded exercises across all major muscle groups. Search and muscle group filter chips. Add custom exercises. Edit name, muscle groups, rest timer. Add photo (camera or file). Delete exercises.
- **Workouts**: Create/edit workout templates. Add exercises via picker (recent suggestions + search + muscle group filters). Configure sets, rep range, rest per exercise. Reorder exercises.
- **Programs**: Create programs with named days mapped to workouts. Set a default program. Delete with confirmation.
- **Help**: Badge meanings, set confirmation states, W/WU explanation, e10RM formula, data storage info.
- **Demo Mode**: Load sample 3-month dataset to explore the app. User data kept in separate database.
- **Export/Import**: Full database backup as JSON file.
- **Delete All Data**: Nuclear option with confirmation.

### Progression Logic
- **Progress** (+2.5kg): All working sets hit top of rep range
- **Hold** (same weight): Reps within range but not all maxed
- **Deload** (-10%): Reps fell below rep range minimum for two consecutive sessions
- **New**: No previous data for this exercise

### e10RM Formula
```
Per set:  weight x (1 + reps / 30) / 1.333
Session:  average of all working sets for that exercise
```

### PWA
- Service worker for offline caching
- Web app manifest for add-to-home-screen
- iOS meta tags for standalone mode
- Dark theme, mobile-first, touch-optimised (48px min tap targets)

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Dexie.js** (IndexedDB wrapper) for all data storage
- **Lucide React** for icons
- Deployed to **Vercel**

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data Storage

All data is stored locally in IndexedDB. Two separate databases:
- `LiftDB` — user data
- `LiftDB-Demo` — demo mode data

No backend, no accounts, no data sent anywhere. Use export/import for backups.

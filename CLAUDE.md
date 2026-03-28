# CLAUDE.md — Project Context for Claude Code

## Project Overview

LIFT is a mobile-first PWA workout tracker built with Vite + React + TypeScript. All data is stored in IndexedDB via Dexie.js. No backend, no API calls, fully offline-capable.

## Architecture

### Directory Structure
```
src/
  components/     # Shared UI components (ConfirmDialog, ExerciseDetail, ExercisePicker)
  db/             # Database schema (database.ts), seed data (seed.ts), demo data (demo.ts)
  hooks/          # Custom hooks (useRestTimer)
  screens/        # Tab screens (TodayScreen, HistoryScreen, StatsScreen, ManageScreen)
  utils/          # Pure functions (e10rm.ts, progression.ts, backup.ts)
public/           # Static assets (icons, manifest, service worker)
```

### Data Model (Dexie/IndexedDB)
- **exercises** — library of all exercises (name, muscleGroup, secondaryMuscleGroup, defaultRestSeconds, imageUrl)
- **workouts** — reusable templates with exercise configs (sets, repRange, restSeconds)
- **programs** — named collections of days, each mapped to a workout
- **sessions** — completed workout logs with per-exercise sets and e10RM
- **activeSession** — single in-progress session (persists across browser close)

### Two Databases
- `LiftDB` — real user data
- `LiftDB-Demo` — demo mode data (completely isolated)

Switching is controlled by `localStorage('lift-demo-mode')`. The DB is selected at module load time in `database.ts`. Toggling demo mode does a `window.location.reload()` to rebind all Dexie live queries.

### Key Patterns
- **useLiveQuery** (dexie-react-hooks) for reactive data binding in all screens
- **Active session persistence**: exercise states, confirmed sets, and rest timer end time are saved to IndexedDB on every change. On restore, timer resumes if still running.
- **Seed is additive**: `seedDatabase()` only adds exercises not already present (by name). Safe to add new exercises to the seed list — existing users get them on next load without losing custom ones.
- **ExerciseDetail** is a shared component used in Stats (PB drill-down), Manage (exercise view), and Today (tap exercise name).
- **ExercisePicker** is a shared modal used in Today (add exercise to session) and Manage (add exercise to workout), with configurable suggestion strategy (recent vs muscle-group-based).
- All destructive actions use the in-app **ConfirmDialog** component, not native `confirm()`.

### Progression Logic (`utils/progression.ts`)
- Looks at the last 2 sessions containing the exercise
- Progress (+2.5kg) if all working sets hit rep range max
- Deload (90%) if reps fell below rep range **minimum** in 2 consecutive sessions
- Hold otherwise

### e10RM (`utils/e10rm.ts`)
- Per set: `weight * (1 + reps / 30) / 1.333`
- Session average: mean of working sets only

## Build & Deploy

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc + vite build
```

Deployed to Vercel. Static SPA — no server-side rendering, no API routes.

## Conventions

- Dark theme only (CSS custom properties in index.css)
- Mobile-first, max-width 480px centered
- All inputs use `type="number"` with `inputMode` for mobile keyboards
- Numeric inputs store as strings during editing, parse on save (allows clearing fields)
- Photos stored as base64 data URLs (resized to 400px max, JPEG 70%)
- No external UI library — plain CSS classes (.card, .btn, .list-item, .set-row, etc.)
- Icons from lucide-react

import { db } from './database';
import { seedDatabase } from './seed';
import { sessionE10RM } from '../utils/e10rm';

const DEMO_FLAG_KEY = 'lift-demo-mode';

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_FLAG_KEY) === '1';
}

export async function enableDemo(): Promise<void> {
  localStorage.setItem(DEMO_FLAG_KEY, '1');
  await clearAll();
  await seedDatabase();
  await generateDemoData();
}

export async function disableDemo(): Promise<void> {
  localStorage.removeItem(DEMO_FLAG_KEY);
  await clearAll();
  await seedDatabase();
}

async function clearAll() {
  await db.transaction('rw', [db.exercises, db.workouts, db.programs, db.sessions, db.activeSession], async () => {
    await db.exercises.clear();
    await db.workouts.clear();
    await db.programs.clear();
    await db.sessions.clear();
    await db.activeSession.clear();
  });
}

// Helpers
function jitter(base: number, pct: number): number {
  return base + base * (Math.random() * 2 - 1) * pct;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateDemoData() {
  const allEx = await db.exercises.toArray();
  const byName = new Map(allEx.map(e => [e.name, e.id!]));

  const id = (name: string) => byName.get(name)!;

  // --- 4 Workout Templates ---

  const upperAExercises = [
    { exerciseId: id('Bench Press'), sets: 4, repRange: [6, 10] as [number, number], restSeconds: 180 },
    { exerciseId: id('Bent Over Row'), sets: 4, repRange: [6, 10] as [number, number], restSeconds: 180 },
    { exerciseId: id('OHP'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Lat Pulldown'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Dumbbell Lateral Raise'), sets: 3, repRange: [12, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Barbell Curl'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 90 },
    { exerciseId: id('Tricep Pushdown'), sets: 3, repRange: [10, 15] as [number, number], restSeconds: 90 },
  ];

  const upperBExercises = [
    { exerciseId: id('Incline Bench Press'), sets: 4, repRange: [6, 10] as [number, number], restSeconds: 180 },
    { exerciseId: id('Seated Cable Row'), sets: 4, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Dumbbell Shoulder Press'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Cable Fly'), sets: 3, repRange: [10, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Face Pull'), sets: 3, repRange: [12, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Dumbbell Curl'), sets: 3, repRange: [10, 12] as [number, number], restSeconds: 90 },
    { exerciseId: id('Skull Crushers'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 90 },
  ];

  const lowerAExercises = [
    { exerciseId: id('Squat'), sets: 4, repRange: [5, 8] as [number, number], restSeconds: 180 },
    { exerciseId: id('Romanian Deadlift'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 150 },
    { exerciseId: id('Leg Press'), sets: 3, repRange: [10, 15] as [number, number], restSeconds: 120 },
    { exerciseId: id('Leg Curl'), sets: 3, repRange: [10, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Seated Calf Raise'), sets: 4, repRange: [12, 20] as [number, number], restSeconds: 60 },
  ];

  const lowerBExercises = [
    { exerciseId: id('Deadlift'), sets: 3, repRange: [3, 6] as [number, number], restSeconds: 180 },
    { exerciseId: id('Bulgarian Split Squat'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Hack Squat'), sets: 3, repRange: [8, 12] as [number, number], restSeconds: 120 },
    { exerciseId: id('Leg Extension'), sets: 3, repRange: [12, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Leg Curl'), sets: 3, repRange: [10, 15] as [number, number], restSeconds: 90 },
    { exerciseId: id('Standing Calf Raise'), sets: 4, repRange: [10, 15] as [number, number], restSeconds: 60 },
  ];

  const [upperAId, upperBId, lowerAId, lowerBId] = await db.workouts.bulkAdd([
    { name: 'Upper A — Strength', exercises: upperAExercises },
    { name: 'Upper B — Hypertrophy', exercises: upperBExercises },
    { name: 'Lower A — Quad Focus', exercises: lowerAExercises },
    { name: 'Lower B — Posterior Focus', exercises: lowerBExercises },
  ], { allKeys: true });

  // --- Program ---
  await db.programs.add({
    name: 'Upper/Lower 4-Day',
    days: [
      { label: 'Upper A', workoutId: upperAId },
      { label: 'Lower A', workoutId: lowerAId },
      { label: 'Upper B', workoutId: upperBId },
      { label: 'Lower B', workoutId: lowerBId },
    ],
  });

  // --- Generate 3 months of sessions ---
  // ~13 weeks, 4 sessions/week (Mon, Tue, Thu, Fri pattern with occasional skips)

  // Starting weights (kg) per exercise
  const startWeights: Record<string, number> = {
    'Bench Press': 70, 'Bent Over Row': 60, 'OHP': 40, 'Lat Pulldown': 55,
    'Dumbbell Lateral Raise': 8, 'Barbell Curl': 30, 'Tricep Pushdown': 25,
    'Incline Bench Press': 55, 'Seated Cable Row': 50, 'Dumbbell Shoulder Press': 20,
    'Cable Fly': 15, 'Face Pull': 20, 'Dumbbell Curl': 12, 'Skull Crushers': 25,
    'Squat': 90, 'Romanian Deadlift': 80, 'Leg Press': 140, 'Leg Curl': 35,
    'Seated Calf Raise': 40, 'Deadlift': 120, 'Bulgarian Split Squat': 20,
    'Hack Squat': 80, 'Leg Extension': 40, 'Standing Calf Raise': 60,
  };

  // Track current weight per exercise for progression
  const currentWeight: Record<string, number> = { ...startWeights };
  // Track consecutive sessions where reps were missed
  const missedStreak: Record<string, number> = {};

  const dayWorkouts = [
    { label: 'Upper A', workoutId: upperAId, exercises: upperAExercises },
    { label: 'Lower A', workoutId: lowerAId, exercises: lowerAExercises },
    { label: 'Upper B', workoutId: upperBId, exercises: upperBExercises },
    { label: 'Lower B', workoutId: lowerBId, exercises: lowerBExercises },
  ];

  // Start date: 13 weeks ago
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 91);

  // Find first Monday
  while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() + 1);

  const sessions: {
    date: string;
    programId: number;
    dayLabel: string;
    workoutId: number;
    exercises: { exerciseId: number; sets: { weight: number; reps: number; isWorkingSet: boolean }[]; e10RM: number }[];
  }[] = [];

  const programId = (await db.programs.toArray())[0].id!;

  for (let week = 0; week < 13; week++) {
    // Occasionally skip a session (simulate life getting in the way)
    const skipDay = Math.random() < 0.15 ? Math.floor(Math.random() * 4) : -1;

    for (let dayIdx = 0; dayIdx < 4; dayIdx++) {
      if (dayIdx === skipDay) continue;

      // Session days: Mon(0), Tue(1), Thu(3), Fri(4)
      const dayOffsets = [0, 1, 3, 4];
      const sessionDate = new Date(startDate);
      sessionDate.setDate(startDate.getDate() + week * 7 + dayOffsets[dayIdx]);

      // Don't create future sessions
      if (sessionDate > now) continue;

      // Vary the time slightly
      sessionDate.setHours(Math.floor(jitter(18, 0.15)), Math.floor(Math.random() * 60));

      const dayDef = dayWorkouts[dayIdx];

      const exerciseResults = dayDef.exercises.map(we => {
        const exName = allEx.find(e => e.id === we.exerciseId)!.name;
        const weight = currentWeight[exName];
        const repMax = we.repRange[1];
        const repMin = we.repRange[0];

        // Simulate performance — some randomness
        const sets: { weight: number; reps: number; isWorkingSet: boolean }[] = [];

        // Optional warm-up set for compound lifts
        if (we.restSeconds >= 150 && Math.random() > 0.3) {
          sets.push({ weight: Math.round(weight * 0.5 / 2.5) * 2.5, reps: 10, isWorkingSet: false });
        }

        let allHitTop = true;
        let anyMissed = false;

        for (let s = 0; s < we.sets; s++) {
          // Fatigue: later sets are harder
          const fatigueFactor = 1 - s * 0.04;
          // Random performance factor
          const perf = jitter(1, 0.08) * fatigueFactor;
          // Week-level fatigue cycle (every 4th week is a slightly harder week)
          const weekFatigue = week % 4 === 3 ? 0.92 : 1;

          let reps = Math.round(repMin + (repMax - repMin) * perf * weekFatigue);
          reps = Math.max(Math.max(repMin - 2, 1), Math.min(repMax + 1, reps));

          if (reps < repMax) allHitTop = false;
          if (reps < repMin) anyMissed = true;

          sets.push({ weight, reps, isWorkingSet: true });
        }

        // Progression logic (mirrors app logic)
        const streak = missedStreak[exName] ?? 0;
        if (allHitTop) {
          currentWeight[exName] = Math.round((weight + 2.5) * 2) / 2;
          missedStreak[exName] = 0;
        } else if (anyMissed) {
          missedStreak[exName] = streak + 1;
          if (streak + 1 >= 2) {
            // Deload
            currentWeight[exName] = Math.round(weight * 0.9 * 2) / 2;
            missedStreak[exName] = 0;
          }
        } else {
          missedStreak[exName] = 0;
        }

        return {
          exerciseId: we.exerciseId,
          sets,
          e10RM: sessionE10RM(sets),
        };
      });

      sessions.push({
        date: sessionDate.toISOString(),
        programId,
        dayLabel: dayDef.label,
        workoutId: dayDef.workoutId,
        exercises: exerciseResults,
      });
    }
  }

  await db.sessions.bulkAdd(sessions);
}

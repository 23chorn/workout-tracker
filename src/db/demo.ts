import { db } from './database';
import { seedRowingPrograms } from './rowingSeed';
import { sessionE10RM } from '../utils/e10rm';

const DEMO_FLAG_KEY = 'lift-demo-mode';

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_FLAG_KEY) === '1';
}

export async function enableDemo(): Promise<void> {
  localStorage.setItem(DEMO_FLAG_KEY, '1');
  localStorage.setItem('lift-rowing-enabled', '1');
  // Delete the demo DB entirely so it rebuilds fresh
  const { default: Dexie } = await import('dexie');
  await Dexie.delete('LiftDB-Demo');
  window.location.reload();
}

export async function disableDemo(): Promise<void> {
  localStorage.removeItem(DEMO_FLAG_KEY);
  window.location.reload();
}

export async function ensureDemoData(): Promise<void> {
  const count = await db.sessions.count();
  if (count === 0) {
    await generateDemoData();
  }
  // Ensure rowing programs are seeded in demo DB
  await seedRowingPrograms();
  // Regenerate rowing data if missing or if seed version changed
  const rowingVersion = localStorage.getItem('lift-demo-rowing-version') ?? '0';
  const rowingCount = await db.rowingSessions.count();
  if (rowingCount === 0 || rowingVersion !== '2') {
    await db.rowingSessions.clear();
    await db.rowingProgress.clear();
    await generateDemoRowingData();
    localStorage.setItem('lift-demo-rowing-version', '2');
  }
}

// Helpers
function jitter(base: number, pct: number): number {
  return base + base * (Math.random() * 2 - 1) * pct;
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

  const upperAId = (await db.workouts.add({ name: 'Upper A — Strength', exercises: upperAExercises })) as number;
  const upperBId = (await db.workouts.add({ name: 'Upper B — Hypertrophy', exercises: upperBExercises })) as number;
  const lowerAId = (await db.workouts.add({ name: 'Lower A — Quad Focus', exercises: lowerAExercises })) as number;
  const lowerBId = (await db.workouts.add({ name: 'Lower B — Posterior Focus', exercises: lowerBExercises })) as number;

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
    durationMinutes: number;
    programId: number;
    dayLabel: string;
    workoutId: number;
    exercises: { exerciseId: number; sets: { weight: number; reps: number; isWorkingSet: boolean }[]; e10RM: number }[];
  }[] = [];

  const programId = (await db.programs.toArray())[0].id as number;

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
        durationMinutes: Math.floor(jitter(55, 0.25)),
        programId,
        dayLabel: dayDef.label,
        workoutId: dayDef.workoutId,
        exercises: exerciseResults,
      });
    }
  }

  await db.sessions.bulkAdd(sessions);
}

// Generate 7 weeks of rowing data for demo mode
async function generateDemoRowingData() {
  const programs = await db.rowingPrograms.toArray();
  const petePlan = programs.find(p => p.name === 'Pete Plan');
  if (!petePlan?.id) return;

  // Set up progress at week 8 (completed 7 weeks)
  await db.rowingProgress.clear();
  await db.rowingProgress.add({
    currentProgramId: petePlan.id,
    currentWeek: 8,
    completedSessionIds: [],
  });

  const now = new Date();
  const rowingSessions: {
    date: string;
    durationMinutes?: number;
    programId: number;
    week: number;
    day: number;
    optional: boolean;
    type: 'steady' | 'distance' | 'intervals';
    totalTime?: number;
    totalDistance?: number;
    avgSplit?: number;
    avgSPM?: number;
    calories?: number;
    hr?: number;
    intervals?: { rep: number; distance?: number; time?: number; split: number; spm?: number }[];
  }[] = [];

  // Base split that improves over weeks (seconds per 500m)
  const baseSplit = 135; // 2:15 /500m starting

  for (let week = 1; week <= 7; week++) {
    const weekData = petePlan.weeks.find(w => w.week === week);
    if (!weekData) continue;

    // Improvement: ~0.5s per week
    const weekSplit = baseSplit - week * 0.5;
    const skipOptional = Math.random() < 0.4;

    for (const session of weekData.sessions) {
      if (session.optional && skipOptional) continue;

      // Session date: week N maps to N weeks ago, spread across Mon/Wed/Fri/Sat/Sun
      const dayOffsets = [0, 2, 4, 5, 6];
      const dayOffset = dayOffsets[session.day - 1] ?? session.day - 1;
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - (7 - week + 1) * 7 + dayOffset);
      sessionDate.setHours(6 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));

      const splitVariance = () => weekSplit + (Math.random() * 4 - 2);
      const spmVariance = () => Math.floor(22 + Math.random() * 6);

      if (session.type === 'intervals' && session.reps) {
        const reps = session.reps;
        const repDist = session.repDistance ?? 500;
        const ivs = Array.from({ length: reps }, (_, i) => {
          const split = splitVariance() + (i * 0.3); // slight fatigue
          return {
            rep: i + 1,
            distance: repDist,
            time: Math.round((repDist / 500) * split),
            split: Math.round(split * 10) / 10,
            spm: spmVariance(),
          };
        });
        const totalDist = reps * repDist;
        const avgSplit = ivs.reduce((s, iv) => s + iv.split, 0) / ivs.length;
        rowingSessions.push({
          date: sessionDate.toISOString(),
          durationMinutes: Math.floor(jitter(30, 0.2)),
          programId: petePlan.id,
          week, day: session.day, optional: !!session.optional,
          type: 'intervals',
          totalDistance: totalDist,
          totalTime: Math.round(ivs.reduce((s, iv) => s + (iv.time ?? 0), 0) / 60),
          avgSplit: Math.round(avgSplit * 10) / 10,
          avgSPM: Math.round(ivs.reduce((s, iv) => s + (iv.spm ?? 0), 0) / ivs.length),
          calories: Math.round(totalDist * 0.04),
          hr: Math.floor(jitter(155, 0.05)),
          intervals: ivs,
        });
      } else if (session.type === 'distance' && session.repDistance) {
        const dist = session.repDistance;
        const split = splitVariance() + 3; // steady is slower
        const totalTime = Math.round((dist / 500) * split / 60);
        rowingSessions.push({
          date: sessionDate.toISOString(),
          durationMinutes: totalTime,
          programId: petePlan.id,
          week, day: session.day, optional: !!session.optional,
          type: 'distance',
          totalDistance: dist,
          totalTime,
          avgSplit: Math.round(split * 10) / 10,
          avgSPM: Math.floor(jitter(22, 0.05)),
          calories: Math.round(dist * 0.04),
          hr: Math.floor(jitter(145, 0.05)),
        });
      } else {
        // Steady state / time-based
        const minutes = session.repMinutes ?? 20;
        const split = splitVariance() + 5; // easy pace
        const dist = Math.round((minutes * 60 / split) * 500);
        rowingSessions.push({
          date: sessionDate.toISOString(),
          durationMinutes: minutes,
          programId: petePlan.id,
          week, day: session.day, optional: !!session.optional,
          type: 'steady',
          totalDistance: dist,
          totalTime: minutes,
          avgSplit: Math.round(split * 10) / 10,
          avgSPM: Math.floor(jitter(20, 0.05)),
          calories: Math.round(dist * 0.035),
          hr: Math.floor(jitter(135, 0.05)),
        });
      }
    }
  }

  await db.rowingSessions.bulkAdd(rowingSessions);
}

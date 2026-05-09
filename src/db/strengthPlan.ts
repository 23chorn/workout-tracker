import { db, type LiftingPhase, type LiftingPlan, type PhaseDay, type WorkoutExercise } from './database';

export const STRENGTH_PLAN_NAME = '24-Week Strength + Pete Plan';

// Workout template definitions, keyed by phase-prefixed name.
// repRange and rest values encode the per-phase programming from the user's plan.

type ExerciseSpec = { name: string; sets: number; repRange: [number, number]; restSeconds: number };

const W: Record<string, ExerciseSpec[]> = {
  // ─── Phase 1 (weeks 1-8) — Linear progression, high frequency ───
  'P1 Push': [
    { name: 'Bench Press',            sets: 4, repRange: [6, 8],  restSeconds: 180 },
    { name: 'OHP',                    sets: 3, repRange: [8, 10], restSeconds: 150 },
    { name: 'Dumbbell Incline Press', sets: 3, repRange: [8, 12], restSeconds: 120 },
    { name: 'Tricep Pushdown',        sets: 3, repRange: [10, 15],restSeconds: 90  },
  ],
  'P1 Pull': [
    { name: 'Bent Over Row',          sets: 4, repRange: [6, 8],  restSeconds: 180 },
    { name: 'Lat Pulldown',           sets: 3, repRange: [8, 12], restSeconds: 120 },
    { name: 'Seated Cable Row',       sets: 3, repRange: [8, 12], restSeconds: 120 },
    { name: 'Barbell Curl',           sets: 3, repRange: [8, 12], restSeconds: 90  },
    { name: 'Face Pull',              sets: 3, repRange: [12, 15],restSeconds: 60  },
  ],
  'P1 Legs': [
    { name: 'Squat',                  sets: 4, repRange: [5, 5],  restSeconds: 180 },
    { name: 'Deadlift',               sets: 3, repRange: [5, 5],  restSeconds: 240 },
    { name: 'Leg Press',              sets: 3, repRange: [8, 12], restSeconds: 150 },
    { name: 'Leg Curl',               sets: 3, repRange: [10, 12],restSeconds: 90  },
    { name: 'Seated Calf Raise',      sets: 3, repRange: [12, 15],restSeconds: 60  },
  ],
  'P1 PPL Overflow': [
    { name: 'Dumbbell Shoulder Press',sets: 3, repRange: [8, 12], restSeconds: 120 },
    { name: 'Dumbbell Row',           sets: 3, repRange: [8, 12], restSeconds: 120 },
    { name: 'Dumbbell Curl',          sets: 3, repRange: [8, 12], restSeconds: 90  },
    { name: 'Skull Crushers',         sets: 3, repRange: [8, 12], restSeconds: 90  },
  ],

  // ─── Phase 2a (weeks 9-16) — tighter rep ranges, same structure ───
  'P2a Push': [
    { name: 'Bench Press',            sets: 4, repRange: [5, 6],  restSeconds: 180 },
    { name: 'OHP',                    sets: 3, repRange: [6, 8],  restSeconds: 180 },
    { name: 'Dumbbell Incline Press', sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Tricep Pushdown',        sets: 3, repRange: [10, 12],restSeconds: 90  },
  ],
  'P2a Pull': [
    { name: 'Bent Over Row',          sets: 4, repRange: [5, 6],  restSeconds: 180 },
    { name: 'Lat Pulldown',           sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Seated Cable Row',       sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Barbell Curl',           sets: 3, repRange: [8, 10], restSeconds: 90  },
    { name: 'Face Pull',              sets: 3, repRange: [12, 15],restSeconds: 60  },
  ],
  'P2a Legs': [
    { name: 'Squat',                  sets: 4, repRange: [5, 5],  restSeconds: 180 },
    { name: 'Romanian Deadlift',      sets: 3, repRange: [6, 8],  restSeconds: 180 },
    { name: 'Deadlift',               sets: 3, repRange: [5, 5],  restSeconds: 240 },
    { name: 'Leg Press',              sets: 3, repRange: [8, 10], restSeconds: 150 },
    { name: 'Leg Curl',               sets: 3, repRange: [10, 12],restSeconds: 90  },
  ],
  'P2a Pull Overflow': [
    { name: 'Dumbbell Shoulder Press',sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Dumbbell Row',           sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Dumbbell Curl',          sets: 3, repRange: [8, 10], restSeconds: 90  },
    { name: 'Skull Crushers',         sets: 3, repRange: [8, 10], restSeconds: 90  },
  ],

  // ─── Phase 2b (weeks 17-20) — full separation, wave loading for legs ───
  'P2b Push': [
    { name: 'Bench Press',            sets: 4, repRange: [5, 6],  restSeconds: 180 },
    { name: 'OHP',                    sets: 3, repRange: [6, 8],  restSeconds: 180 },
    { name: 'Dumbbell Incline Press', sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Tricep Pushdown',        sets: 3, repRange: [10, 12],restSeconds: 90  },
  ],
  'P2b Pull': [
    { name: 'Bent Over Row',          sets: 4, repRange: [5, 6],  restSeconds: 180 },
    { name: 'Lat Pulldown',           sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Seated Cable Row',       sets: 3, repRange: [8, 10], restSeconds: 120 },
    { name: 'Barbell Curl',           sets: 3, repRange: [8, 10], restSeconds: 90  },
  ],
  'P2b Legs': [
    { name: 'Squat',                  sets: 4, repRange: [5, 5],  restSeconds: 210 },
    { name: 'Deadlift',               sets: 3, repRange: [3, 5],  restSeconds: 240 },
    { name: 'Leg Press',              sets: 3, repRange: [8, 10], restSeconds: 150 },
    { name: 'Leg Curl',               sets: 3, repRange: [10, 12],restSeconds: 90  },
    { name: 'Seated Calf Raise',      sets: 3, repRange: [12, 15],restSeconds: 60  },
  ],

  // ─── Phase 3 (weeks 21-24) — peak, maintain, test max on week 24 ───
  'P3 Push': [
    { name: 'Bench Press',            sets: 3, repRange: [3, 5],  restSeconds: 210 },
    { name: 'OHP',                    sets: 3, repRange: [3, 5],  restSeconds: 210 },
    { name: 'Dumbbell Incline Press', sets: 3, repRange: [6, 8],  restSeconds: 150 },
    { name: 'Tricep Pushdown',        sets: 3, repRange: [8, 12], restSeconds: 90  },
  ],
  'P3 Pull': [
    { name: 'Bent Over Row',          sets: 3, repRange: [3, 5],  restSeconds: 210 },
    { name: 'Lat Pulldown',           sets: 3, repRange: [6, 8],  restSeconds: 120 },
    { name: 'Seated Cable Row',       sets: 3, repRange: [6, 8],  restSeconds: 120 },
    { name: 'Barbell Curl',           sets: 3, repRange: [8, 10], restSeconds: 90  },
  ],
  'P3 Legs': [
    { name: 'Squat',                  sets: 3, repRange: [3, 5],  restSeconds: 240 },
    { name: 'Deadlift',               sets: 3, repRange: [3, 5],  restSeconds: 240 },
    { name: 'Leg Press',              sets: 3, repRange: [6, 8],  restSeconds: 150 },
    { name: 'Leg Curl',               sets: 3, repRange: [10, 12],restSeconds: 90  },
  ],
};

// Targets at 90kg bodyweight (from the user's Claude planning conversation)
const TARGETS: { name: string; startWeight: number; targetWeight: number }[] = [
  { name: 'Bench Press', startWeight: 55, targetWeight: 76.5 },
  { name: 'OHP',         startWeight: 30, targetWeight: 49.5 },
  { name: 'Squat',       startWeight: 50, targetWeight: 90   },
  { name: 'Deadlift',    startWeight: 70, targetWeight: 108  },
];

// Day-of-week: 0 = Mon, 6 = Sun
const REST_DAY = (d: 0|1|2|3|4|5|6): PhaseDay => ({ dayOfWeek: d, label: 'Rest' });

function buildPhases(workoutIdFor: (name: string) => number): LiftingPhase[] {
  const p1p2a = (pushW: string, pullW: string, legsW: string, overflowW: string): PhaseDay[] => [
    { dayOfWeek: 0, label: 'Push + Row',   workoutId: workoutIdFor(pushW),     rowingSlot: 1 },
    { dayOfWeek: 1, label: 'Pull',         workoutId: workoutIdFor(pullW) },
    REST_DAY(2),
    { dayOfWeek: 3, label: 'Legs',         workoutId: workoutIdFor(legsW) },
    REST_DAY(4),
    { dayOfWeek: 5, label: 'Row',          rowingSlot: 2 },
    { dayOfWeek: 6, label: 'PPL + Row',    workoutId: workoutIdFor(overflowW), rowingSlot: 3 },
  ];

  const p2bp3 = (pushW: string, pullW: string, legsW: string): PhaseDay[] => [
    { dayOfWeek: 0, label: 'Push',         workoutId: workoutIdFor(pushW) },
    { dayOfWeek: 1, label: 'Row',          rowingSlot: 1 },
    REST_DAY(2),
    { dayOfWeek: 3, label: 'Legs',         workoutId: workoutIdFor(legsW) },
    REST_DAY(4),
    { dayOfWeek: 5, label: 'Row',          rowingSlot: 2 },
    { dayOfWeek: 6, label: 'Pull + Row',   workoutId: workoutIdFor(pullW),    rowingSlot: 3 },
  ];

  return [
    {
      name: 'Phase 1', startWeek: 1, endWeek: 8,
      notes: 'Combined sessions, linear progression. Pete Plan weeks 1-8 (building to 8500m).',
      days: p1p2a('P1 Push', 'P1 Pull', 'P1 Legs', 'P1 PPL Overflow'),
      defaultScheme: 'linear',
    },
    {
      name: 'Phase 2a', startWeek: 9, endWeek: 16,
      notes: 'Linear until stall, then switch to top-set + backoff manually per lift. Pete Plan weeks 9-16.',
      days: p1p2a('P2a Push', 'P2a Pull', 'P2a Legs', 'P2a Pull Overflow'),
      defaultScheme: 'linear',
    },
    {
      name: 'Phase 2b', startWeek: 17, endWeek: 20,
      notes: 'Full separation begins. Wave loading introduced for lower body. Pete Plan weeks 17-20.',
      days: p2bp3('P2b Push', 'P2b Pull', 'P2b Legs'),
      defaultScheme: 'linear',
      // Squat/Deadlift can be switched to 'wave-3week' via manual override when Phase 2b begins.
    },
    {
      name: 'Phase 3', startWeek: 21, endWeek: 24,
      notes: 'Peak and consolidation. Week 24 is the test-max week — attempt targets.',
      days: p2bp3('P3 Push', 'P3 Pull', 'P3 Legs'),
      defaultScheme: 'maintain',
    },
  ];
}

async function upsertWorkout(name: string, specs: ExerciseSpec[], exerciseIdByName: Map<string, number>): Promise<number> {
  const exercises: WorkoutExercise[] = [];
  for (const spec of specs) {
    const exId = exerciseIdByName.get(spec.name);
    if (!exId) throw new Error(`strengthPlan: exercise not found in library: ${spec.name}`);
    exercises.push({
      exerciseId: exId,
      sets: spec.sets,
      repRange: spec.repRange,
      restSeconds: spec.restSeconds,
    });
  }

  const existing = await db.workouts.where('name').equals(name).first();
  if (existing) {
    await db.workouts.update(existing.id!, { exercises });
    return existing.id!;
  }
  return (await db.workouts.add({ name, exercises })) as number;
}

export async function seedStrengthPlan(): Promise<void> {
  // Only run if there are no lifting plans yet (idempotent — won't overwrite an active plan).
  const existingPlans = await db.liftingPlans.toArray();
  if (existingPlans.some(p => p.name === STRENGTH_PLAN_NAME)) {
    return;
  }

  // Resolve exercise IDs by name
  const allExercises = await db.exercises.toArray();
  const exIdByName = new Map<string, number>();
  for (const e of allExercises) exIdByName.set(e.name, e.id!);

  // Verify all referenced exercises exist; bail with a clear error if not
  const referenced = new Set<string>();
  for (const specs of Object.values(W)) for (const s of specs) referenced.add(s.name);
  for (const t of TARGETS) referenced.add(t.name);
  const missing = [...referenced].filter(n => !exIdByName.has(n));
  if (missing.length > 0) {
    console.warn('[strengthPlan] skipping seed — missing exercises:', missing);
    return;
  }

  // Upsert all workouts
  const workoutIdByName = new Map<string, number>();
  for (const [name, specs] of Object.entries(W)) {
    const id = await upsertWorkout(name, specs, exIdByName);
    workoutIdByName.set(name, id);
  }

  // Build phases
  const phases = buildPhases((name) => {
    const id = workoutIdByName.get(name);
    if (!id) throw new Error(`strengthPlan: workout not seeded: ${name}`);
    return id;
  });

  const targets = TARGETS.map(t => ({
    exerciseId: exIdByName.get(t.name)!,
    startWeight: t.startWeight,
    targetWeight: t.targetWeight,
  }));

  const plan: Omit<LiftingPlan, 'id'> = {
    name: STRENGTH_PLAN_NAME,
    startDate: new Date().toISOString().split('T')[0],
    phases,
    targets,
  };

  const planId = (await db.liftingPlans.add(plan as LiftingPlan)) as number;

  // Mark active (clearing any previously-active row)
  await db.liftingPlanProgress.clear();
  await db.liftingPlanProgress.add({ planId, active: true });
}

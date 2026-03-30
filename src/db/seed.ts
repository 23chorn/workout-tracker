import { db, type Exercise, type ExerciseCategory } from './database';

const COMPOUND_REST = 180;
const ISOLATION_REST = 90;

type Seed = Omit<Exercise, 'id'>;

function ex(name: string, muscleGroup: string, category: ExerciseCategory, rest: number, secondary?: string): Seed {
  return { name, muscleGroup, secondaryMuscleGroup: secondary, category, defaultRestSeconds: rest };
}

const B = 'barbell' as const;
const D = 'dumbbell' as const;
const M = 'machine' as const;
const BW = 'bodyweight' as const;
const C = COMPOUND_REST;
const I = ISOLATION_REST;

const seedExercises: Seed[] = [
  // Barbell — upper
  ex('Bench Press', 'Chest', B, C, 'Triceps'),
  ex('Incline Bench Press', 'Chest', B, C, 'Shoulders'),
  ex('OHP', 'Shoulders', B, C, 'Triceps'),
  ex('Bent Over Row', 'Back', B, C, 'Biceps'),
  ex('Barbell Curl', 'Biceps', B, I),
  ex('Close Grip Bench Press', 'Triceps', B, C, 'Chest'),
  ex('Skull Crushers', 'Triceps', B, I),
  ex('Preacher Curl', 'Biceps', B, I),
  ex('Barbell Shrug', 'Traps', B, I),
  ex('Upright Row', 'Shoulders', B, C, 'Traps'),
  ex('Pendlay Row', 'Back', B, C, 'Biceps'),
  // Barbell — lower
  ex('Squat', 'Quads', B, C, 'Glutes'),
  ex('Deadlift', 'Back', B, C, 'Hamstrings'),
  ex('Romanian Deadlift', 'Hamstrings', B, C, 'Glutes'),
  ex('Front Squat', 'Quads', B, C, 'Core'),
  ex('Sumo Deadlift', 'Hamstrings', B, C, 'Glutes'),
  ex('Barbell Hip Thrust', 'Glutes', B, C, 'Hamstrings'),

  // Dumbbell — upper
  ex('Dumbbell Shoulder Press', 'Shoulders', D, C, 'Triceps'),
  ex('Dumbbell Lateral Raise', 'Shoulders', D, I),
  ex('Dumbbell Curl', 'Biceps', D, I),
  ex('Tricep Overhead Extension', 'Triceps', D, I),
  ex('Dumbbell Bench Press', 'Chest', D, C, 'Triceps'),
  ex('Dumbbell Incline Press', 'Chest', D, C, 'Shoulders'),
  ex('Dumbbell Row', 'Back', D, C, 'Biceps'),
  ex('Hammer Curl', 'Biceps', D, I),
  ex('Concentration Curl', 'Biceps', D, I),
  ex('Arnold Press', 'Shoulders', D, C, 'Triceps'),
  ex('Dumbbell Rear Delt Fly', 'Shoulders', D, I, 'Back'),
  ex('Dumbbell Pullover', 'Chest', D, I, 'Back'),
  // Dumbbell — lower
  ex('Bulgarian Split Squat', 'Quads', D, C, 'Glutes'),
  ex('Dumbbell Lunge', 'Quads', D, C, 'Glutes'),
  ex('Goblet Squat', 'Quads', D, C, 'Glutes'),

  // Machine / Cable — upper
  ex('Lat Pulldown', 'Back', M, C, 'Biceps'),
  ex('Seated Cable Row', 'Back', M, C, 'Biceps'),
  ex('Cable Fly', 'Chest', M, I),
  ex('Tricep Pushdown', 'Triceps', M, I),
  ex('Face Pull', 'Shoulders', M, I, 'Back'),
  ex('Pec Deck', 'Chest', M, I),
  ex('Chest Supported Row', 'Back', M, C, 'Biceps'),
  ex('Machine Chest Press', 'Chest', M, C, 'Triceps'),
  ex('Machine Shoulder Press', 'Shoulders', M, C, 'Triceps'),
  ex('Cable Lateral Raise', 'Shoulders', M, I),
  ex('Cable Curl', 'Biceps', M, I),
  ex('Cable Overhead Tricep Extension', 'Triceps', M, I),
  ex('Reverse Pec Deck', 'Shoulders', M, I, 'Back'),
  ex('Machine Bicep Curl', 'Biceps', M, I),
  ex('Machine Tricep Extension', 'Triceps', M, I),
  ex('T-Bar Row', 'Back', M, C, 'Biceps'),
  // Machine / Cable — lower
  ex('Leg Press', 'Quads', M, C, 'Glutes'),
  ex('Leg Curl', 'Hamstrings', M, I),
  ex('Leg Extension', 'Quads', M, I),
  ex('Seated Calf Raise', 'Calves', M, I),
  ex('Standing Calf Raise', 'Calves', M, I),
  ex('Hack Squat', 'Quads', M, C, 'Glutes'),
  ex('Hip Adductor', 'Adductors', M, I),
  ex('Hip Abductor', 'Abductors', M, I),
  ex('Glute Kickback Machine', 'Glutes', M, I),
  ex('Smith Machine Squat', 'Quads', M, C, 'Glutes'),
  // Machine — core
  ex('Cable Crunch', 'Core', M, I),

  // Bodyweight
  ex('Pull Up', 'Back', BW, C, 'Biceps'),
  ex('Chin Up', 'Back', BW, C, 'Biceps'),
  ex('Assisted Pull Up', 'Back', BW, C, 'Biceps'),
  ex('Assisted Dip', 'Triceps', BW, C, 'Chest'),
  ex('Dips', 'Triceps', BW, C, 'Chest'),
  ex('Chest Dips', 'Chest', BW, C, 'Triceps'),
  ex('Push Up', 'Chest', BW, I, 'Triceps'),
  ex('Hanging Leg Raise', 'Core', BW, I),
  ex('Ab Wheel Rollout', 'Core', BW, I),
  ex('Decline Sit Up', 'Core', BW, I),
  ex('Russian Twist', 'Core', BW, I),
];

export async function seedDatabase() {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map(e => e.name));

  const toAdd = seedExercises.filter(e => !existingNames.has(e.name));
  if (toAdd.length > 0) {
    await db.exercises.bulkAdd(toAdd);
  }

  // Backfill category and secondary muscle groups on existing exercises
  for (const seed of seedExercises) {
    const ex = await db.exercises.where('name').equals(seed.name).first();
    if (!ex) continue;
    const updates: Partial<Exercise> = {};
    if (!ex.category && seed.category) updates.category = seed.category;
    if (!ex.secondaryMuscleGroup && seed.secondaryMuscleGroup) updates.secondaryMuscleGroup = seed.secondaryMuscleGroup;
    if (Object.keys(updates).length > 0) {
      await db.exercises.update(ex.id!, updates);
    }
  }
}

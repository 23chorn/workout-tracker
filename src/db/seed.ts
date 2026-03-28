import { db, type Exercise } from './database';

const COMPOUND_REST = 180;
const ISOLATION_REST = 90;

const seedExercises: Omit<Exercise, 'id'>[] = [
  // Upper body — free weights
  { name: 'Bench Press', muscleGroup: 'Chest', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Incline Bench Press', muscleGroup: 'Chest', secondaryMuscleGroup: 'Shoulders', defaultRestSeconds: COMPOUND_REST },
  { name: 'OHP', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Bent Over Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Barbell Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Close Grip Bench Press', muscleGroup: 'Triceps', secondaryMuscleGroup: 'Chest', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', defaultRestSeconds: ISOLATION_REST },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Skull Crushers', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Tricep Overhead Extension', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Incline Press', muscleGroup: 'Chest', secondaryMuscleGroup: 'Shoulders', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Preacher Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Concentration Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Arnold Press', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Rear Delt Fly', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Back', defaultRestSeconds: ISOLATION_REST },
  { name: 'Dumbbell Pullover', muscleGroup: 'Chest', secondaryMuscleGroup: 'Back', defaultRestSeconds: ISOLATION_REST },
  { name: 'Barbell Shrug', muscleGroup: 'Traps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Upright Row', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Traps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dips', muscleGroup: 'Triceps', secondaryMuscleGroup: 'Chest', defaultRestSeconds: COMPOUND_REST },
  { name: 'Chest Dips', muscleGroup: 'Chest', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  // Upper body — bodyweight / assisted
  { name: 'Pull Up', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Chin Up', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Assisted Pull Up', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Assisted Dip', muscleGroup: 'Triceps', secondaryMuscleGroup: 'Chest', defaultRestSeconds: COMPOUND_REST },
  // Upper body — machines/cables
  { name: 'Lat Pulldown', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Seated Cable Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Cable Fly', muscleGroup: 'Chest', defaultRestSeconds: ISOLATION_REST },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Face Pull', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Back', defaultRestSeconds: ISOLATION_REST },
  { name: 'Pec Deck', muscleGroup: 'Chest', defaultRestSeconds: ISOLATION_REST },
  { name: 'Chest Supported Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Machine Chest Press', muscleGroup: 'Chest', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Machine Shoulder Press', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', defaultRestSeconds: ISOLATION_REST },
  { name: 'Cable Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Cable Overhead Tricep Extension', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Reverse Pec Deck', muscleGroup: 'Shoulders', secondaryMuscleGroup: 'Back', defaultRestSeconds: ISOLATION_REST },
  { name: 'Machine Bicep Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Machine Tricep Extension', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'T-Bar Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Pendlay Row', muscleGroup: 'Back', secondaryMuscleGroup: 'Biceps', defaultRestSeconds: COMPOUND_REST },
  // Lower body — free weights
  { name: 'Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Deadlift', muscleGroup: 'Back', secondaryMuscleGroup: 'Hamstrings', defaultRestSeconds: COMPOUND_REST },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Barbell Hip Thrust', muscleGroup: 'Glutes', secondaryMuscleGroup: 'Hamstrings', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Lunge', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Front Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Core', defaultRestSeconds: COMPOUND_REST },
  { name: 'Sumo Deadlift', muscleGroup: 'Hamstrings', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Goblet Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  // Lower body — machines
  { name: 'Leg Press', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', defaultRestSeconds: ISOLATION_REST },
  { name: 'Leg Extension', muscleGroup: 'Quads', defaultRestSeconds: ISOLATION_REST },
  { name: 'Seated Calf Raise', muscleGroup: 'Calves', defaultRestSeconds: ISOLATION_REST },
  { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultRestSeconds: ISOLATION_REST },
  { name: 'Hack Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Hip Adductor', muscleGroup: 'Adductors', defaultRestSeconds: ISOLATION_REST },
  { name: 'Hip Abductor', muscleGroup: 'Abductors', defaultRestSeconds: ISOLATION_REST },
  { name: 'Glute Kickback Machine', muscleGroup: 'Glutes', defaultRestSeconds: ISOLATION_REST },
  { name: 'Smith Machine Squat', muscleGroup: 'Quads', secondaryMuscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  // Core
  { name: 'Cable Crunch', muscleGroup: 'Core', defaultRestSeconds: ISOLATION_REST },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', defaultRestSeconds: ISOLATION_REST },
  { name: 'Ab Wheel Rollout', muscleGroup: 'Core', defaultRestSeconds: ISOLATION_REST },
  { name: 'Decline Sit Up', muscleGroup: 'Core', defaultRestSeconds: ISOLATION_REST },
  { name: 'Russian Twist', muscleGroup: 'Core', defaultRestSeconds: ISOLATION_REST },
];

export async function seedDatabase() {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map(e => e.name));

  // Add new seed exercises
  const toAdd = seedExercises.filter(e => !existingNames.has(e.name));
  if (toAdd.length > 0) {
    await db.exercises.bulkAdd(toAdd);
  }

  // Backfill secondary muscle groups on existing seed exercises that are missing them
  for (const seed of seedExercises) {
    if (!seed.secondaryMuscleGroup) continue;
    const existing = await db.exercises.where('name').equals(seed.name).first();
    if (existing && !existing.secondaryMuscleGroup) {
      await db.exercises.update(existing.id!, { secondaryMuscleGroup: seed.secondaryMuscleGroup });
    }
  }
}

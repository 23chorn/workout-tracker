import { db, type Exercise } from './database';

const COMPOUND_REST = 180;
const ISOLATION_REST = 90;

const seedExercises: Omit<Exercise, 'id'>[] = [
  // Upper body — free weights
  { name: 'Bench Press', muscleGroup: 'Chest', defaultRestSeconds: COMPOUND_REST },
  { name: 'Incline Bench Press', muscleGroup: 'Chest', defaultRestSeconds: COMPOUND_REST },
  { name: 'OHP', muscleGroup: 'Shoulders', defaultRestSeconds: COMPOUND_REST },
  { name: 'Bent Over Row', muscleGroup: 'Back', defaultRestSeconds: COMPOUND_REST },
  { name: 'Barbell Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Close Grip Bench Press', muscleGroup: 'Triceps', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', defaultRestSeconds: ISOLATION_REST },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Skull Crushers', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Tricep Overhead Extension', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  // Upper body — machines/cables
  { name: 'Lat Pulldown', muscleGroup: 'Back', defaultRestSeconds: COMPOUND_REST },
  { name: 'Seated Cable Row', muscleGroup: 'Back', defaultRestSeconds: COMPOUND_REST },
  { name: 'Cable Fly', muscleGroup: 'Chest', defaultRestSeconds: ISOLATION_REST },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', defaultRestSeconds: ISOLATION_REST },
  { name: 'Face Pull', muscleGroup: 'Shoulders', defaultRestSeconds: ISOLATION_REST },
  { name: 'Pec Deck', muscleGroup: 'Chest', defaultRestSeconds: ISOLATION_REST },
  { name: 'Chest Supported Row', muscleGroup: 'Back', defaultRestSeconds: COMPOUND_REST },
  // Lower body — free weights
  { name: 'Squat', muscleGroup: 'Quads', defaultRestSeconds: COMPOUND_REST },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', defaultRestSeconds: COMPOUND_REST },
  { name: 'Deadlift', muscleGroup: 'Back', defaultRestSeconds: COMPOUND_REST },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads', defaultRestSeconds: COMPOUND_REST },
  { name: 'Barbell Hip Thrust', muscleGroup: 'Glutes', defaultRestSeconds: COMPOUND_REST },
  { name: 'Dumbbell Lunge', muscleGroup: 'Quads', defaultRestSeconds: COMPOUND_REST },
  // Lower body — machines
  { name: 'Leg Press', muscleGroup: 'Quads', defaultRestSeconds: COMPOUND_REST },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', defaultRestSeconds: ISOLATION_REST },
  { name: 'Leg Extension', muscleGroup: 'Quads', defaultRestSeconds: ISOLATION_REST },
  { name: 'Seated Calf Raise', muscleGroup: 'Calves', defaultRestSeconds: ISOLATION_REST },
  { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultRestSeconds: ISOLATION_REST },
  { name: 'Hack Squat', muscleGroup: 'Quads', defaultRestSeconds: COMPOUND_REST },
];

export async function seedDatabase() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(seedExercises);
  }
}

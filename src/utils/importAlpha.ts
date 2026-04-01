import { db, type Exercise, type ExerciseCategory, type SessionExercise } from '../db/database';
import { sessionE10RM } from './e10rm';

// Alpha Progression exercise name → LIFT exercise name mapping
const NAME_MAP: Record<string, string> = {
  'Deadlifts': 'Deadlift',
  'Leg Press': 'Leg Press',
  'Lying Leg Curls': 'Leg Curl',
  'Hack Squats': 'Hack Squat',
  'Leg Extensions': 'Leg Extension',
  'Chest Dips': 'Chest Dips',
  'Shoulder Press': 'Machine Shoulder Press',
  'Bench Press|Dumbbells': 'Dumbbell Bench Press',
  'Bench Press|Barbell': 'Bench Press',
  'Face Pulls with Rope': 'Face Pull',
  'Triceps Pushdowns': 'Tricep Pushdown',
  'Butterfly with Wide Grip': 'Pec Deck',
  'Seated chest press': 'Machine Chest Press',
  'Standing Shoulder Press': 'OHP',
  'Rows with Wide Grip': 'Seated Cable Row',
  'Preacher Curls': 'Preacher Curl',
  'Incline Bench Press': 'Incline Bench Press',
  'Lateral Raises': 'Cable Lateral Raise',
  'Dips': 'Dips',
  'Standing flys': 'Cable Fly',
  'Curls|Dumbbells': 'Dumbbell Curl',
  'Curls|Barbell': 'Barbell Curl',
  'Seated Dip': 'Assisted Dip',
  'Rows with Close Grip': 'Seated Cable Row',
  'Lat Pulldowns with Wide Neutral Grip': 'Lat Pulldown',
  'Lat Pulldowns with Wide Overhand Grip': 'Lat Pulldown',
  'Lat Pulldowns with Close Overhand Grip': 'Lat Pulldown',
  'Chest-Supported Rows with Wide Grip': 'Chest Supported Row',
  'Chest-Supported Low Rows with Overhand Grip': 'Chest Supported Row',
  'Chest-Supported Low Rows with Neutral Grip': 'Chest Supported Row',
  'ISO Lateral Low Row': 'Chest Supported Row',
  'ISO lateral high row': 'Seated Cable Row',
  'Pull-Ups with Wide Overhand Grip': 'Pull Up',
  'Pull-Ups with Close Overhand Grip': 'Pull Up',
  'Overhead Triceps Extensions': 'Tricep Overhead Extension',
  'Dual Leg Press': 'Leg Press',
  'Standing chest press': 'Machine Chest Press',
};

interface RawSet {
  kg: number;
  reps: number;
}

interface RawExercise {
  name: string;
  equipment: string;
  sets: RawSet[];
}

interface RawSession {
  date: string;
  dayLabel: string;
  duration: number;
  program: string;
  exercises: RawExercise[];
}

const SESSIONS: RawSession[] = [
  {
    date: '2026-01-18', dayLabel: 'Upper', duration: 71, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Bench Press', equipment: 'Barbell', sets: [{ kg: 60, reps: 7 }, { kg: 60, reps: 6 }, { kg: 60, reps: 5 }] },
      { name: 'Lat Pulldowns with Close Overhand Grip', equipment: 'Cable', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 10 }, { kg: 40, reps: 10 }] },
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 20, reps: 6 }, { kg: 20, reps: 6 }, { kg: 20, reps: 6 }] },
      { name: 'Preacher Curls', equipment: 'Machine', sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 12 }, { kg: 15, reps: 10 }] },
      { name: 'Overhead Triceps Extensions', equipment: 'Dumbbells', sets: [{ kg: 7.5, reps: 15 }, { kg: 7.5, reps: 10 }, { kg: 7.5, reps: 8 }] },
    ],
  },
  {
    date: '2026-01-21', dayLabel: 'Lower', duration: 68, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Dual Leg Press', equipment: 'Machine', sets: [{ kg: 50, reps: 12 }, { kg: 50, reps: 12 }, { kg: 50, reps: 12 }, { kg: 50, reps: 12 }, { kg: 50, reps: 12 }] },
      { name: 'Leg Extensions', equipment: 'Machine', sets: [{ kg: 30, reps: 10 }, { kg: 30, reps: 10 }, { kg: 30, reps: 10 }] },
      { name: 'Deadlifts', equipment: 'Barbell', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 12 }, { kg: 40, reps: 12 }] },
    ],
  },
  {
    date: '2026-01-24', dayLabel: 'Push', duration: 60, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 20, reps: 15 }, { kg: 20, reps: 15 }, { kg: 20, reps: 15 }] },
      { name: 'Chest-Supported Low Rows with Neutral Grip', equipment: 'Machine', sets: [{ kg: 20, reps: 12 }, { kg: 20, reps: 10 }, { kg: 20, reps: 12 }] },
      { name: 'Dips', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 6 }, { kg: 0, reps: 6 }, { kg: 0, reps: 6 }] },
      { name: 'Curls', equipment: 'Barbell', sets: [{ kg: 20, reps: 15 }, { kg: 20, reps: 12 }, { kg: 20, reps: 15 }] },
    ],
  },
  {
    date: '2026-01-25', dayLabel: 'Legs', duration: 60, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Pull-Ups with Wide Overhand Grip', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 1 }, { kg: 0, reps: 1 }, { kg: 0, reps: 1 }] },
      { name: 'Lateral Raises', equipment: 'Machine', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }, { kg: 10, reps: 15 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 12.5, reps: 15 }, { kg: 12.5, reps: 15 }, { kg: 12.5, reps: 15 }] },
      { name: 'Face Pulls with Rope', equipment: 'Cable', sets: [{ kg: 12, reps: 15 }, { kg: 16.5, reps: 15 }, { kg: 16.5, reps: 15 }] },
    ],
  },
  {
    date: '2026-01-28', dayLabel: 'Push', duration: 51, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Standing chest press', equipment: 'Machine', sets: [{ kg: 40, reps: 15 }, { kg: 40, reps: 15 }, { kg: 40, reps: 15 }] },
      { name: 'Standing flys', equipment: 'Machine', sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 10 }, { kg: 10, reps: 10 }] },
      { name: 'Pull-Ups with Close Overhand Grip', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 3 }, { kg: 0, reps: 3 }, { kg: 0, reps: 3 }] },
      { name: 'Standing Shoulder Press', equipment: 'Barbell', sets: [{ kg: 30, reps: 7 }, { kg: 30, reps: 7 }, { kg: 30, reps: 7 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }, { kg: 15, reps: 15 }] },
    ],
  },
  {
    date: '2026-02-07', dayLabel: 'Upper', duration: 70, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Bench Press', equipment: 'Barbell', sets: [{ kg: 60, reps: 6 }, { kg: 60, reps: 6 }, { kg: 60, reps: 5 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }, { kg: 15, reps: 15 }] },
    ],
  },
  {
    date: '2026-02-08', dayLabel: 'Pull', duration: 77, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }] },
      { name: 'ISO Lateral Low Row', equipment: 'Machine', sets: [{ kg: 20, reps: 12 }, { kg: 20, reps: 12 }, { kg: 20, reps: 12 }] },
      { name: 'ISO lateral high row', equipment: 'Machine', sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }] },
      { name: 'Face Pulls with Rope', equipment: 'Cable', sets: [{ kg: 18, reps: 15 }, { kg: 18, reps: 15 }, { kg: 18, reps: 15 }] },
      { name: 'Curls', equipment: 'Barbell', sets: [{ kg: 25, reps: 10 }, { kg: 25, reps: 10 }, { kg: 25, reps: 10 }] },
    ],
  },
  {
    date: '2026-02-18', dayLabel: 'Push', duration: 60, program: 'Standalone',
    exercises: [
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 7 }] },
      { name: 'ISO Lateral Low Row', equipment: 'Machine', sets: [{ kg: 40, reps: 6 }, { kg: 40, reps: 6 }, { kg: 40, reps: 5 }] },
      { name: 'Standing flys', equipment: 'Machine', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 8 }, { kg: 20, reps: 7 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 18, reps: 12 }, { kg: 18, reps: 12 }, { kg: 18, reps: 10 }] },
    ],
  },
  {
    date: '2026-02-20', dayLabel: 'Push', duration: 60, program: 'Standalone',
    exercises: [
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 9 }, { kg: 40, reps: 9 }] },
      { name: 'Chest-Supported Rows with Wide Grip', equipment: 'Machine', sets: [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 10 }] },
      { name: 'Lat Pulldowns with Wide Overhand Grip', equipment: 'Machine', sets: [{ kg: 55, reps: 12 }, { kg: 55, reps: 11 }, { kg: 55, reps: 10 }] },
      { name: 'Chest-Supported Low Rows with Overhand Grip', equipment: 'Machine', sets: [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 8 }] },
      { name: 'Lateral Raises', equipment: 'Machine', sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }, { kg: 15, reps: 15 }] },
      { name: 'Curls', equipment: 'Barbell', sets: [{ kg: 17.5, reps: 15 }, { kg: 17.5, reps: 15 }, { kg: 17.5, reps: 10 }] },
    ],
  },
  {
    date: '2026-02-28', dayLabel: 'Upper', duration: 60, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 40, reps: 11 }, { kg: 40, reps: 11 }, { kg: 40, reps: 10 }] },
      { name: 'Rows with Wide Grip', equipment: 'Cable', sets: [{ kg: 30, reps: 15 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }] },
      { name: 'Seated Dip', equipment: 'Machine', sets: [{ kg: 100, reps: 12 }, { kg: 100, reps: 12 }, { kg: 100, reps: 12 }, { kg: 100, reps: 12 }, { kg: 100, reps: 12 }] },
      { name: 'Standing flys', equipment: 'Machine', sets: [{ kg: 20, reps: 8 }, { kg: 20, reps: 8 }, { kg: 20, reps: 8 }] },
      { name: 'Lateral Raises', equipment: 'Machine', sets: [{ kg: 20, reps: 15 }, { kg: 25, reps: 12 }, { kg: 25, reps: 9 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 16.5, reps: 15 }, { kg: 18, reps: 12 }, { kg: 18, reps: 12 }] },
      { name: 'Curls', equipment: 'Dumbbells', sets: [{ kg: 20, reps: 15 }, { kg: 20, reps: 12 }, { kg: 20, reps: 12 }] },
    ],
  },
  {
    date: '2026-03-01', dayLabel: 'Lower', duration: 58, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Deadlifts', equipment: 'Barbell', sets: [{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }, { kg: 60, reps: 10 }] },
      { name: 'Leg Extensions', equipment: 'Machine', sets: [{ kg: 25, reps: 15 }, { kg: 30, reps: 15 }, { kg: 35, reps: 15 }, { kg: 40, reps: 15 }] },
    ],
  },
  {
    date: '2026-03-04', dayLabel: 'Push', duration: 48, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Incline Bench Press', equipment: 'Barbell', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 12 }, { kg: 40, reps: 12 }] },
      { name: 'Lateral Raises', equipment: 'Machine', sets: [{ kg: 25, reps: 10 }, { kg: 25, reps: 10 }, { kg: 25, reps: 12 }] },
      { name: 'Standing Shoulder Press', equipment: 'Barbell', sets: [{ kg: 25, reps: 12 }, { kg: 25, reps: 12 }, { kg: 25, reps: 12 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 18, reps: 12 }, { kg: 18, reps: 12 }, { kg: 15, reps: 15 }] },
      { name: 'Dips', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 7 }, { kg: 0, reps: 7 }, { kg: 0, reps: 6 }] },
    ],
  },
  {
    date: '2026-03-09', dayLabel: 'Legs', duration: 36, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Leg Press', equipment: 'Machine', sets: [{ kg: 50, reps: 12 }, { kg: 100, reps: 12 }, { kg: 100, reps: 12 }] },
      { name: 'Deadlifts', equipment: 'Barbell', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 12 }, { kg: 40, reps: 12 }] },
      { name: 'Dips', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 8 }, { kg: 0, reps: 8 }, { kg: 0, reps: 7 }] },
    ],
  },
  {
    date: '2026-03-16', dayLabel: 'Push', duration: 49, program: 'Standalone',
    exercises: [
      { name: 'Seated chest press', equipment: 'Machine', sets: [{ kg: 35, reps: 15 }, { kg: 45, reps: 12 }, { kg: 45, reps: 12 }] },
      { name: 'Lat Pulldowns with Wide Neutral Grip', equipment: 'Machine', sets: [{ kg: 80, reps: 6 }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }] },
      { name: 'Rows with Close Grip', equipment: 'Cable', sets: [{ kg: 35, reps: 12 }, { kg: 45, reps: 11 }, { kg: 45, reps: 10 }] },
      { name: 'Seated Dip', equipment: 'Machine', sets: [{ kg: 120, reps: 12 }, { kg: 120, reps: 11 }, { kg: 120, reps: 15 }] },
      { name: 'Face Pulls with Rope', equipment: 'Cable', sets: [{ kg: 22.5, reps: 12 }, { kg: 22.5, reps: 10 }, { kg: 22.5, reps: 9 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 12.5, reps: 15 }, { kg: 15, reps: 15 }, { kg: 15, reps: 10 }] },
    ],
  },
  {
    date: '2026-03-17', dayLabel: 'Lower', duration: 61, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Deadlifts', equipment: 'Barbell', sets: [{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }, { kg: 60, reps: 10 }] },
    ],
  },
  {
    date: '2026-03-21', dayLabel: 'Upper', duration: 50, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Seated chest press', equipment: 'Machine', sets: [{ kg: 50, reps: 12 }, { kg: 50, reps: 12 }, { kg: 50, reps: 10 }] },
      { name: 'Standing Shoulder Press', equipment: 'Barbell', sets: [{ kg: 30, reps: 10 }, { kg: 30, reps: 10 }, { kg: 30, reps: 10 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 18, reps: 15 }, { kg: 18, reps: 12 }, { kg: 18, reps: 10 }] },
      { name: 'Rows with Wide Grip', equipment: 'Cable', sets: [{ kg: 30, reps: 15 }, { kg: 30, reps: 15 }, { kg: 35, reps: 15 }] },
      { name: 'Preacher Curls', equipment: 'Machine', sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 9 }, { kg: 20, reps: 8 }] },
    ],
  },
  {
    date: '2026-03-26', dayLabel: 'Push', duration: 85, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Chest Dips', equipment: 'Bodyweight', sets: [{ kg: 0, reps: 8 }, { kg: 0, reps: 8 }, { kg: 0, reps: 7 }] },
      { name: 'Shoulder Press', equipment: 'Machine', sets: [{ kg: 40, reps: 5 }, { kg: 40, reps: 6 }, { kg: 40, reps: 5 }] },
      { name: 'Bench Press', equipment: 'Dumbbells', sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 6 }, { kg: 45, reps: 6 }] },
      { name: 'Face Pulls with Rope', equipment: 'Cable', sets: [{ kg: 25, reps: 12 }, { kg: 25, reps: 12 }, { kg: 25, reps: 12 }] },
      { name: 'Triceps Pushdowns', equipment: 'Cable', sets: [{ kg: 20, reps: 15 }, { kg: 20, reps: 15 }, { kg: 20, reps: 15 }] },
      { name: 'Butterfly with Wide Grip', equipment: 'Machine', sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 10 }, { kg: 30, reps: 10 }] },
    ],
  },
  {
    date: '2026-03-28', dayLabel: 'Legs', duration: 97, program: 'Upper/Lower PPL',
    exercises: [
      { name: 'Deadlifts', equipment: 'Barbell', sets: [{ kg: 60, reps: 12 }] },
      { name: 'Leg Press', equipment: 'Machine', sets: [{ kg: 120, reps: 12 }, { kg: 120, reps: 10 }, { kg: 120, reps: 10 }] },
      { name: 'Lying Leg Curls', equipment: 'Machine', sets: [{ kg: 35, reps: 12 }, { kg: 35, reps: 12 }, { kg: 35, reps: 12 }] },
      { name: 'Hack Squats', equipment: 'Machine', sets: [{ kg: 20, reps: 8 }, { kg: 20, reps: 8 }, { kg: 20, reps: 8 }] },
      { name: 'Leg Extensions', equipment: 'Machine', sets: [{ kg: 45, reps: 12 }, { kg: 50, reps: 8 }, { kg: 45, reps: 10 }] },
    ],
  },
];

function resolveExerciseName(name: string, equipment: string): string {
  // Try specific name|equipment key first
  const specific = NAME_MAP[`${name}|${equipment}`];
  if (specific) return specific;
  // Then generic name key
  const generic = NAME_MAP[name];
  if (generic) return generic;
  // Fallback: return original
  return name;
}

function inferCategory(equipment: string): ExerciseCategory {
  const eq = equipment.toLowerCase();
  if (eq === 'barbell') return 'barbell';
  if (eq === 'dumbbells' || eq === 'dumbbell') return 'dumbbell';
  if (eq === 'bodyweight') return 'bodyweight';
  return 'machine'; // machine, cable
}

function inferMuscleGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bench') || n.includes('chest') || n.includes('fly') || n.includes('butterfly') || n.includes('pec')) return 'Chest';
  if (n.includes('shoulder') || n.includes('lateral') || n.includes('face pull') || n.includes('ohp')) return 'Shoulders';
  if (n.includes('tricep') || n.includes('dip') || n.includes('pushdown') || n.includes('skull')) return 'Triceps';
  if (n.includes('curl') || n.includes('bicep')) return 'Biceps';
  if (n.includes('row') || n.includes('pulldown') || n.includes('pull-up') || n.includes('pull up') || n.includes('lat')) return 'Back';
  if (n.includes('deadlift')) return 'Back';
  if (n.includes('squat') || n.includes('leg press') || n.includes('leg ext') || n.includes('hack')) return 'Quads';
  if (n.includes('leg curl') || n.includes('hamstring')) return 'Hamstrings';
  if (n.includes('calf')) return 'Calves';
  return 'Other';
}

export async function importAlphaProgression(): Promise<{ sessionsAdded: number; exercisesAdded: string[] }> {
  // Load all existing exercises
  const allExercises = await db.exercises.toArray();
  const exerciseByName = new Map(allExercises.map(e => [e.name.toLowerCase(), e]));

  // Get first program and its workouts as fallback for programId/workoutId
  const programs = await db.programs.toArray();
  const workouts = await db.workouts.toArray();
  const fallbackProgramId = programs[0]?.id ?? 0;
  const fallbackWorkoutId = workouts[0]?.id ?? 0;

  const exercisesAdded: string[] = [];
  let sessionsAdded = 0;

  // Check for existing sessions to avoid duplicates
  const existingSessions = await db.sessions.toArray();
  const existingDateSet = new Set(existingSessions.map(s => s.date.split('T')[0]));

  for (const raw of SESSIONS) {
    // Skip if session already exists on this date
    if (existingDateSet.has(raw.date)) continue;

    const sessionExercises: SessionExercise[] = [];

    for (const rawEx of raw.exercises) {
      const liftName = resolveExerciseName(rawEx.name, rawEx.equipment);

      // Find or create exercise
      let exercise = exerciseByName.get(liftName.toLowerCase());
      if (!exercise) {
        const newEx: Omit<Exercise, 'id'> = {
          name: liftName,
          muscleGroup: inferMuscleGroup(liftName),
          category: inferCategory(rawEx.equipment),
          defaultRestSeconds: 120,
        };
        const id = await db.exercises.add(newEx);
        exercise = { ...newEx, id: id as number };
        exerciseByName.set(liftName.toLowerCase(), exercise);
        exercisesAdded.push(liftName);
      }

      const sets = rawEx.sets.map(s => ({
        weight: s.kg,
        reps: s.reps,
        isWorkingSet: true,
      }));

      sessionExercises.push({
        exerciseId: exercise.id!,
        sets,
        e10RM: sessionE10RM(sets),
      });
    }

    if (sessionExercises.length === 0) continue;

    await db.sessions.add({
      date: new Date(raw.date + 'T12:00:00').toISOString(),
      durationMinutes: raw.duration,
      programId: fallbackProgramId,
      dayLabel: raw.dayLabel,
      workoutId: fallbackWorkoutId,
      exercises: sessionExercises,
    });

    sessionsAdded++;
  }

  return { sessionsAdded, exercisesAdded };
}

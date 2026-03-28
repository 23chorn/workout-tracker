import Dexie, { type EntityTable } from 'dexie';

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string;
  secondaryMuscleGroup?: string;
  defaultRestSeconds: number;
  imageUrl?: string;
}

export interface WorkoutExercise {
  exerciseId: number;
  sets: number;
  repRange: [number, number];
  restSeconds: number;
}

export interface Workout {
  id?: number;
  name: string;
  exercises: WorkoutExercise[];
}

export interface ProgramDay {
  label: string;
  workoutId: number;
}

export interface Program {
  id?: number;
  name: string;
  days: ProgramDay[];
}

export interface SessionSet {
  weight: number;
  reps: number;
  isWorkingSet: boolean;
}

export interface SessionExercise {
  exerciseId: number;
  sets: SessionSet[];
  e10RM: number;
}

export interface Session {
  id?: number;
  date: string;
  durationMinutes?: number;
  programId: number;
  dayLabel: string;
  workoutId: number;
  exercises: SessionExercise[];
}

export interface ActiveSession {
  id?: number;
  startedAt: string;
  programId: number;
  programName: string;
  dayLabel: string;
  workoutId: number;
  workoutName: string;
  exerciseStates: {
    exerciseId: number;
    sets: { weight: string; reps: string; isWorkingSet: boolean }[];
    restSeconds: number;
    suggestedWeight: number;
    suggestionReason: string;
    repRange: [number, number];
    numSets: number;
  }[];
  confirmedSets?: string[];
  restTimerEnd?: string;
  restTimerTotal?: number;
}

type LiftDB = Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  programs: EntityTable<Program, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  activeSession: EntityTable<ActiveSession, 'id'>;
};

function createDB(name: string): LiftDB {
  const d = new Dexie(name) as LiftDB;
  d.version(1).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
  });
  d.version(2).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
    activeSession: '++id',
  });
  d.version(3).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
    activeSession: '++id',
  });
  return d;
}

const DEMO_FLAG = 'lift-demo-mode';
const isDemo = localStorage.getItem(DEMO_FLAG) === '1';

// Single DB instance — selected at load time based on localStorage flag.
// Toggling demo mode reloads the page, so this re-evaluates with the new flag.
const db: LiftDB = createDB(isDemo ? 'LiftDB-Demo' : 'LiftDB');

export { db };

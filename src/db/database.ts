import Dexie, { type EntityTable } from 'dexie';

export type ExerciseCategory = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string;
  secondaryMuscleGroup?: string;
  category?: ExerciseCategory;
  defaultRestSeconds: number;
  imageUrl?: string;
}

export interface BodyWeightEntry {
  id?: number;
  date: string;
  weight: number;
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
    lastSession?: { weight: number; reps: number[] };
  }[];
  confirmedSets?: string[];
  restTimerEnd?: string;
  restTimerTotal?: number;
}

// Rowing types

export interface RowingProgramSession {
  day: number;
  type: 'steady' | 'distance' | 'intervals';
  target: string;
  reps?: number;
  repDistance?: number;
  repMinutes?: number;
  restSeconds?: number;
  optional?: boolean;
  guidance?: string;
}

export interface RowingProgram {
  id?: number;
  name: string;
  type: 'structured' | 'freeform';
  weeks: { week: number; sessions: RowingProgramSession[] }[];
}

export interface RowingProgress {
  id?: number;
  currentProgramId: number;
  currentWeek: number;
  completedSessionIds: number[];
}

export interface RowingInterval {
  rep: number;
  distance?: number;
  time?: number;
  split: number;
  spm?: number;
}

export interface RowingSession {
  id?: number;
  date: string;
  programId?: number;
  week?: number;
  day?: number;
  optional?: boolean;
  type: 'steady' | 'distance' | 'intervals';
  totalTime?: number;
  totalDistance?: number;
  avgSplit?: number;
  avgSPM?: number;
  calories?: number;
  hr?: number;
  intervals?: RowingInterval[];
}

type LiftDB = Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  programs: EntityTable<Program, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  activeSession: EntityTable<ActiveSession, 'id'>;
  rowingPrograms: EntityTable<RowingProgram, 'id'>;
  rowingProgress: EntityTable<RowingProgress, 'id'>;
  rowingSessions: EntityTable<RowingSession, 'id'>;
  bodyWeight: EntityTable<BodyWeightEntry, 'id'>;
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
  d.version(4).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
    activeSession: '++id',
    rowingPrograms: '++id, name',
    rowingProgress: '++id, currentProgramId',
    rowingSessions: '++id, date, type, programId',
  });
  d.version(5).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
    activeSession: '++id',
    rowingPrograms: '++id, name',
    rowingProgress: '++id, currentProgramId',
    rowingSessions: '++id, date, type, programId',
    bodyWeight: '++id, date',
  });
  return d;
}

const DEMO_FLAG = 'lift-demo-mode';
const isDemo = localStorage.getItem(DEMO_FLAG) === '1';

// Single DB instance — selected at load time based on localStorage flag.
// Toggling demo mode reloads the page, so this re-evaluates with the new flag.
const db: LiftDB = createDB(isDemo ? 'LiftDB-Demo' : 'LiftDB');

export { db };

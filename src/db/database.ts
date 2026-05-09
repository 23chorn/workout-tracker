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
    lastSession?: { weight: number; reps: number[]; e10RM?: number };
  }[];
  confirmedSets?: string[];
  restTimerEnd?: string;
  restTimerTotal?: number;
}

// Lifting plan types

export type ProgressionScheme = 'linear' | 'top-set-backoff' | 'wave-3week' | 'maintain';

export type RowingSlot = 1 | 2 | 3 | 'optional';

export interface PhaseDay {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Mon
  label: string;
  workoutId?: number;
  rowingSlot?: RowingSlot;
}

export interface PhaseSchemeOverride {
  exerciseId: number;
  scheme: ProgressionScheme;
}

export interface LiftingPhase {
  name: string;
  startWeek: number;
  endWeek: number;
  notes?: string;
  days: PhaseDay[];
  defaultScheme: ProgressionScheme;
  schemeOverrides?: PhaseSchemeOverride[];
}

export interface LiftingPlanTarget {
  exerciseId: number;
  startWeight: number;
  targetWeight: number;
}

export interface LiftingPlan {
  id?: number;
  name: string;
  startDate: string;
  phases: LiftingPhase[];
  targets: LiftingPlanTarget[];
  rowingPlanId?: number;
}

export interface LiftingPlanProgress {
  id?: number;
  planId: number;
  active: boolean;
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
  liftingPlans: EntityTable<LiftingPlan, 'id'>;
  liftingPlanProgress: EntityTable<LiftingPlanProgress, 'id'>;
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
  d.version(6).stores({
    exercises: '++id, name, muscleGroup',
    workouts: '++id, name',
    programs: '++id, name',
    sessions: '++id, date, programId, workoutId',
    activeSession: '++id',
    rowingPrograms: '++id, name',
    rowingProgress: '++id, currentProgramId',
    rowingSessions: '++id, date, type, programId',
    bodyWeight: '++id, date',
    liftingPlans: '++id, name',
    liftingPlanProgress: '++id, planId',
  });
  return d;
}

const DEMO_FLAG = 'lift-demo-mode';
const isDemo = localStorage.getItem(DEMO_FLAG) === '1';

// Single DB instance — selected at load time based on localStorage flag.
// Toggling demo mode reloads the page, so this re-evaluates with the new flag.
const db: LiftDB = createDB(isDemo ? 'LiftDB-Demo' : 'LiftDB');

export { db };

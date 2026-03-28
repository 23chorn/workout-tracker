import Dexie, { type EntityTable } from 'dexie';

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: string;
  defaultRestSeconds: number;
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
}

const db = new Dexie('LiftDB') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  programs: EntityTable<Program, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  activeSession: EntityTable<ActiveSession, 'id'>;
};

db.version(1).stores({
  exercises: '++id, name, muscleGroup',
  workouts: '++id, name',
  programs: '++id, name',
  sessions: '++id, date, programId, workoutId',
});

db.version(2).stores({
  exercises: '++id, name, muscleGroup',
  workouts: '++id, name',
  programs: '++id, name',
  sessions: '++id, date, programId, workoutId',
  activeSession: '++id',
});

export { db };

const KEY = 'lift-compound-goals';

export type CompoundGoalKey = 'bench' | 'ohp' | 'squat' | 'deadlift';
export type CompoundGoals = Record<CompoundGoalKey, number | null>;

const DEFAULT: CompoundGoals = { bench: null, ohp: null, squat: null, deadlift: null };

export function loadCompoundGoals(): CompoundGoals {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveCompoundGoals(g: CompoundGoals): void {
  localStorage.setItem(KEY, JSON.stringify(g));
}

export const COMPOUND_DEFS: { key: CompoundGoalKey; label: string; exactNames: string[] }[] = [
  { key: 'bench',    label: 'Bench Press', exactNames: ['bench press', 'barbell bench press'] },
  { key: 'ohp',      label: 'OHP',         exactNames: ['ohp', 'overhead press', 'barbell overhead press'] },
  { key: 'squat',    label: 'Squat',       exactNames: ['squat', 'back squat', 'barbell squat', 'barbell back squat'] },
  { key: 'deadlift', label: 'Deadlift',    exactNames: ['deadlift', 'conventional deadlift', 'barbell deadlift'] },
];

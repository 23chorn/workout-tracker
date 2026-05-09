import { db } from '../db/database';

interface Suggestion {
  weight: number;
  reason: 'increase' | 'deload' | 'hold' | 'first';
}

export async function getSuggestion(
  exerciseId: number,
  repRangeMax: number,
  repRangeMin?: number
): Promise<Suggestion> {
  const min = repRangeMin ?? Math.max(1, repRangeMax - 4);
  const mid = (min + repRangeMax) / 2;

  const relevant = (await db.sessions.orderBy('date').reverse().toArray())
    .filter(s => s.exercises.some(e => e.exerciseId === exerciseId))
    .slice(0, 2);

  if (relevant.length === 0) return { weight: 0, reason: 'first' };

  const latestEx = relevant[0].exercises.find(e => e.exerciseId === exerciseId)!;
  const workingSets = latestEx.sets.filter(s => s.isWorkingSet);
  if (workingSets.length === 0) return { weight: 0, reason: 'first' };

  const currentWeight = workingSets[0].weight;
  const avgReps = workingSets.reduce((sum, s) => sum + s.reps, 0) / workingSets.length;

  // Clear increase: avg reps reached the top of the range
  if (avgReps >= repRangeMax) {
    return { weight: currentWeight + 2.5, reason: 'increase' };
  }

  if (relevant.length >= 2) {
    const prevEx = relevant[1].exercises.find(e => e.exerciseId === exerciseId);
    const prevWorking = prevEx?.sets.filter(s => s.isWorkingSet) ?? [];

    // Hard deload: reps collapsed below minimum in both sessions
    if (workingSets.some(s => s.reps < min) && prevWorking.some(s => s.reps < min)) {
      return { weight: Math.round(currentWeight * 0.9 * 2) / 2, reason: 'deload' };
    }

    if (prevEx && latestEx.e10RM > 0 && prevEx.e10RM > 0) {
      const e10rmUp = latestEx.e10RM > prevEx.e10RM;

      // e10RM improving + reps comfortably above minimum → weight is working, push it
      if (e10rmUp && avgReps >= min + 1) {
        return { weight: currentWeight + 2.5, reason: 'increase' };
      }

      // e10RM declining + reps in lower half of range → step weight back to restore rep quality
      if (!e10rmUp && avgReps < mid) {
        return { weight: Math.max(0, currentWeight - 2.5), reason: 'deload' };
      }
    }
  }

  return { weight: currentWeight, reason: 'hold' };
}

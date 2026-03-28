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

  const sessions = await db.sessions
    .orderBy('date')
    .reverse()
    .toArray();

  const relevant = sessions
    .filter(s => s.exercises.some(e => e.exerciseId === exerciseId))
    .slice(0, 2);

  if (relevant.length === 0) {
    return { weight: 0, reason: 'first' };
  }

  const latest = relevant[0];
  const latestEx = latest.exercises.find(e => e.exerciseId === exerciseId)!;
  const workingSets = latestEx.sets.filter(s => s.isWorkingSet);

  if (workingSets.length === 0) {
    return { weight: 0, reason: 'first' };
  }

  const latestWeight = workingSets[0].weight;
  const allHitTop = workingSets.every(s => s.reps >= repRangeMax);

  if (allHitTop) {
    return { weight: latestWeight + 2.5, reason: 'increase' };
  }

  // Deload: only if reps fell BELOW the rep range minimum in two consecutive sessions
  if (relevant.length >= 2) {
    const prev = relevant[1];
    const prevEx = prev.exercises.find(e => e.exerciseId === exerciseId);
    if (prevEx) {
      const prevWorking = prevEx.sets.filter(s => s.isWorkingSet);
      const prevFailed = prevWorking.some(s => s.reps < min);
      const latestFailed = workingSets.some(s => s.reps < min);
      if (prevFailed && latestFailed) {
        return { weight: Math.round(latestWeight * 0.9 * 2) / 2, reason: 'deload' };
      }
    }
  }

  return { weight: latestWeight, reason: 'hold' };
}

export function calcE10RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return (weight * (1 + reps / 30)) / 1.333;
}

export function sessionE10RM(sets: { weight: number; reps: number; isWorkingSet: boolean }[]): number {
  const working = sets.filter(s => s.isWorkingSet && s.weight > 0 && s.reps > 0);
  if (working.length === 0) return 0;
  return Math.max(...working.map(s => calcE10RM(s.weight, s.reps)));
}

export function calcE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function sessionE1RM(sets: { weight: number; reps: number; isWorkingSet: boolean }[]): number {
  const working = sets.filter(s => s.isWorkingSet && s.weight > 0 && s.reps > 0);
  if (working.length === 0) return 0;
  return Math.max(...working.map(s => calcE1RM(s.weight, s.reps)));
}

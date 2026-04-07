// Simple module-level navigation guard. When an editor (e.g. WorkoutManager,
// ExerciseManager) is in an unsaved-edit state, it registers a guard that
// intercepts tab switches and shows a discard-confirmation dialog.

type Guard = (proceed: () => void) => void;

let currentGuard: Guard | null = null;

export function setNavGuard(g: Guard | null) {
  currentGuard = g;
}

export function requestNav(proceed: () => void) {
  if (currentGuard) {
    currentGuard(proceed);
  } else {
    proceed();
  }
}

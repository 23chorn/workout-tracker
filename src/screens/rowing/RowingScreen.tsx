import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PetePlanView } from './PetePlanView';
import { FreeformView } from './FreeformView';

export function RowingScreen() {
  const programs = useLiveQuery(() => db.rowingPrograms.toArray()) ?? [];
  const progress = useLiveQuery(() => db.rowingProgress.toArray()) ?? [];
  const sessions = useLiveQuery(() => db.rowingSessions.orderBy('date').reverse().toArray()) ?? [];

  const petePlan = programs.find(p => p.name === 'Pete Plan');
  const activeProgress = progress[0] ?? null;
  const isPetePlanActive = activeProgress && petePlan && activeProgress.currentWeek <= 24;

  return (
    <div className="screen">
      <h1>Rowing</h1>

      {isPetePlanActive && petePlan ? (
        <PetePlanView
          program={petePlan}
          progress={activeProgress}
          sessions={sessions}
        />
      ) : (
        <FreeformView
          sessions={sessions}
          petePlan={petePlan ?? null}
          hasCompletedPlan={activeProgress ? activeProgress.currentWeek > 24 : false}
        />
      )}
    </div>
  );
}

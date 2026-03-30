import { useState } from 'react';
import { ExerciseManager } from '../components/manage/ExerciseManager';
import { WorkoutManager } from '../components/manage/WorkoutManager';
import { ProgramManager } from '../components/manage/ProgramManager';

type Tab = 'exercises' | 'workouts' | 'programs';

export function ManageScreen() {
  const [tab, setTab] = useState<Tab>('exercises');

  return (
    <div className="screen">
      <h1>Manage</h1>

      <div className="sub-tabs">
        {(['exercises', 'workouts', 'programs'] as Tab[]).map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'exercises' && <ExerciseManager />}
      {tab === 'workouts' && <WorkoutManager />}
      {tab === 'programs' && <ProgramManager />}
    </div>
  );
}

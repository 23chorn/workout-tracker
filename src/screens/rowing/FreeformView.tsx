import { useState } from 'react';
import { db, type RowingSession, type RowingProgram } from '../../db/database';
import { LogRowingSession } from './LogRowingSession';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Waves, Ruler, Repeat, Play } from 'lucide-react';

export function FreeformView({ sessions: _sessions, petePlan, hasCompletedPlan }: {
  sessions: RowingSession[];
  petePlan: RowingProgram | null;
  hasCompletedPlan: boolean;
}) {
  const [logging, setLogging] = useState<'steady' | 'distance' | 'intervals' | null>(null);
  const [showStartPlan, setShowStartPlan] = useState(false);

  const startPetePlan = async () => {
    if (!petePlan?.id) return;
    await db.rowingProgress.clear();
    await db.rowingProgress.add({
      currentProgramId: petePlan.id,
      currentWeek: 1,
      completedSessionIds: [],
    });
    setShowStartPlan(false);
    // Reload to switch to Pete Plan view
    window.location.reload();
  };

  if (logging) {
    return (
      <LogRowingSession
        freeformType={logging}
        onComplete={() => setLogging(null)}
        onCancel={() => setLogging(null)}
      />
    );
  }

  return (
    <div>
      {hasCompletedPlan && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--green)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
            Pete Plan Complete
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            You've finished the 24-week program. Log freeform sessions or restart the plan.
          </div>
        </div>
      )}

      <h2>Log a Session</h2>

      <button className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }} onClick={() => setLogging('steady')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Waves size={20} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Steady State</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Continuous row at easy pace</div>
          </div>
        </div>
      </button>

      <button className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }} onClick={() => setLogging('distance')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ruler size={20} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Fixed Distance</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Row a set distance for time</div>
          </div>
        </div>
      </button>

      <button className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }} onClick={() => setLogging('intervals')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Repeat size={20} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Intervals</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reps with rest between</div>
          </div>
        </div>
      </button>

      {petePlan && (
        <>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-full" onClick={() => setShowStartPlan(true)}>
              <Play size={14} /> {hasCompletedPlan ? 'Restart Pete Plan' : 'Start Pete Plan'}
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              24-week structured rowing program
            </div>
          </div>

          {showStartPlan && (
            <ConfirmDialog
              title={hasCompletedPlan ? 'Restart Pete Plan' : 'Start Pete Plan'}
              message={hasCompletedPlan
                ? 'This will reset your progress to Week 1. All session history is preserved.'
                : 'Begin the 24-week Pete Plan? You can switch back to freeform at any time.'}
              confirmLabel="Start"
              onConfirm={startPetePlan}
              onCancel={() => setShowStartPlan(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

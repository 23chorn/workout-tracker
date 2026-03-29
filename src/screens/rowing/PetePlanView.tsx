import { useState } from 'react';
import { db, type RowingProgram, type RowingProgress, type RowingSession, type RowingProgramSession } from '../../db/database';
import { LogRowingSession } from './LogRowingSession';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ChevronRight, ChevronLeft, ChevronDown, Check, Map, Info, X } from 'lucide-react';
import { SESSION_INFO } from '../../db/petePlan';

function formatSplit(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getPhase(week: number) {
  const phase = week <= 8 ? 1 : week <= 16 ? 2 : 3;
  const label = phase === 1 ? 'Build Base' : phase === 2 ? 'Develop Speed' : 'Peak Performance';
  return { phase, label };
}

// Full plan explorer
function PlanExplorer({ program, progress, sessions, onBack }: {
  program: RowingProgram;
  progress: RowingProgress;
  sessions: RowingSession[];
  onBack: () => void;
}) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  return (
    <div>
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>
      <h2 style={{ marginBottom: 16 }}>Full Plan — 24 Weeks</h2>

      {[
        { label: 'Phase 1 — Build Base', weeks: [1, 8] },
        { label: 'Phase 2 — Develop Speed', weeks: [9, 16] },
        { label: 'Phase 3 — Peak Performance', weeks: [17, 24] },
      ].map(phase => (
        <div key={phase.label} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {phase.label}
          </div>
          {program.weeks
            .filter(w => w.week >= phase.weeks[0] && w.week <= phase.weeks[1])
            .map(weekData => {
              const isExpanded = expandedWeek === weekData.week;
              const isCurrent = weekData.week === progress.currentWeek;
              const isCompleted = weekData.week < progress.currentWeek;
              const isFuture = weekData.week > progress.currentWeek;
              const weekSessions = sessions.filter(s => s.programId === program.id && s.week === weekData.week);
              const completedDays = new Set(weekSessions.map(s => s.day));
              const coreSessions = weekData.sessions.filter(s => !s.optional);
              const coreCompleted = coreSessions.filter(s => completedDays.has(s.day)).length;

              return (
                <div key={weekData.week} className="card" style={{ padding: 0, marginBottom: 6, overflow: 'hidden' }}>
                  <button
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                      opacity: isFuture ? 0.6 : 1,
                    }}
                    onClick={() => setExpandedWeek(isExpanded ? null : weekData.week)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCompleted ? (
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} color="white" />
                        </div>
                      ) : isCurrent ? (
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{weekData.week}</span>
                        </div>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{weekData.week}</span>
                        </div>
                      )}
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Week {weekData.week}</span>
                        {isCurrent && <span className="badge badge-accent" style={{ marginLeft: 6, fontSize: 10 }}>Current</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {(isCompleted || isCurrent) && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {coreCompleted}/{coreSessions.length}
                        </span>
                      )}
                      <ChevronDown size={14} color="var(--text-muted)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
                      {weekData.sessions.map((session, si) => {
                        const done = completedDays.has(session.day);
                        const sessionResult = weekSessions.find(s => s.day === session.day);
                        return (
                          <div key={si} style={{
                            padding: '8px 0',
                            borderBottom: si < weekData.sessions.length - 1 ? '1px solid var(--border)' : 'none',
                            opacity: session.optional ? 0.7 : 1,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              {done ? (
                                <Check size={12} color="var(--green)" />
                              ) : (
                                <div style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid var(--border)' }} />
                              )}
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                Day {session.day}
                                {session.optional && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (optional)</span>}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--accent)', marginLeft: 18 }}>
                              {session.target}
                            </div>
                            {session.guidance && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 18, marginTop: 2 }}>
                                {session.guidance}
                              </div>
                            )}
                            {sessionResult && sessionResult.avgSplit && (
                              <div style={{ fontSize: 11, color: 'var(--green)', marginLeft: 18, marginTop: 2 }}>
                                Result: {formatSplit(sessionResult.avgSplit)}/500m
                                {sessionResult.totalDistance && ` · ${sessionResult.totalDistance}m`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export function PetePlanView({ program, progress, sessions }: {
  program: RowingProgram;
  progress: RowingProgress;
  sessions: RowingSession[];
}) {
  const [logging, setLogging] = useState<RowingProgramSession | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const getSessionInfo = (session: RowingProgramSession): string => {
    if (session.optional) return SESSION_INFO.optional;
    if (session.type === 'steady') return SESSION_INFO.steady;
    if (session.type === 'distance') return SESSION_INFO.steady;
    // Intervals: determine group by rest ratio
    const guidance = session.guidance?.toLowerCase() ?? '';
    if (guidance.includes('speed endurance') || guidance.includes('speed endurance')) return SESSION_INFO.at;
    if (guidance.includes('endurance interval')) return SESSION_INFO.endurance;
    if (guidance.includes('speed work') || guidance.includes('speed')) return SESSION_INFO.speed;
    return SESSION_INFO.at;
  };

  const weekData = program.weeks.find(w => w.week === progress.currentWeek);
  const { phase, label: phaseLabel } = getPhase(progress.currentWeek);

  const weekSessions = sessions.filter(s => s.programId === program.id && s.week === progress.currentWeek);
  const completedDays = new Set(weekSessions.map(s => s.day));

  const getLastSession = (type: string): RowingSession | undefined => {
    return sessions.find(s => s.type === type);
  };

  const advanceWeek = async () => {
    if (!progress.id) return;
    await db.rowingProgress.update(progress.id, {
      currentWeek: progress.currentWeek + 1,
    });
    setShowAdvance(false);
  };

  if (logging && weekData) {
    return (
      <LogRowingSession
        prescription={logging}
        programId={program.id!}
        week={progress.currentWeek}
        onComplete={() => setLogging(null)}
        onCancel={() => setLogging(null)}
      />
    );
  }

  if (showPlan) {
    return (
      <PlanExplorer
        program={program}
        progress={progress}
        sessions={sessions}
        onBack={() => setShowPlan(false)}
      />
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="badge badge-accent">Phase {phase}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Week {progress.currentWeek} / 24</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Pete Plan</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{phaseLabel}</div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(progress.currentWeek / 24) * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
        </div>
      </div>

      <button className="btn btn-secondary btn-full mb-md" onClick={() => setShowPlan(true)}>
        <Map size={14} /> View Full Plan
      </button>

      <h2>This Week's Sessions</h2>

      {weekData?.sessions.filter(s => !s.optional).map((session, i) => {
        const done = completedDays.has(session.day);
        const last = getLastSession(session.type);
        return (
          <button
            key={i}
            className="card"
            style={{ width: '100%', textAlign: 'left', cursor: done ? 'default' : 'pointer', opacity: done ? 0.6 : 1, marginBottom: 8 }}
            onClick={() => !done && setLogging(session)}
            disabled={done}
          >
            <div className="row-between" style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {done ? (
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="white" />
                  </div>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 15 }}>Day {session.day}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={(e) => { e.stopPropagation(); setShowInfo(getSessionInfo(session)); }}
                >
                  <Info size={16} />
                </button>
                {!done && <ChevronRight size={16} color="var(--text-muted)" />}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
              {session.target}
            </div>
            {session.guidance && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{session.guidance}</div>
            )}
            {last && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Last {session.type}: {last.avgSplit ? formatSplit(last.avgSplit) + '/500m' : ''}
                {last.totalDistance ? ` · ${last.totalDistance}m` : ''}
              </div>
            )}
          </button>
        );
      })}

      {weekData?.sessions.some(s => s.optional) && (
        <>
          <h2 style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>Optional</h2>
          {weekData.sessions.filter(s => s.optional).map((session, i) => {
            const done = completedDays.has(session.day);
            return (
              <button
                key={`opt-${i}`}
                className="card"
                style={{ width: '100%', textAlign: 'left', cursor: done ? 'default' : 'pointer', opacity: done ? 0.6 : 1, marginBottom: 8 }}
                onClick={() => !done && setLogging(session)}
                disabled={done}
              >
                <div className="row-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {done ? (
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="white" />
                      </div>
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                    )}
                    <span style={{ fontSize: 14 }}>{session.target}</span>
                  </div>
                  {!done && <ChevronRight size={16} color="var(--text-muted)" />}
                </div>
              </button>
            );
          })}
        </>
      )}

      <button className="btn btn-secondary btn-full" style={{ marginTop: 16 }} onClick={() => setShowAdvance(true)}>
        Advance to Week {progress.currentWeek + 1}
      </button>

      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="row-between mb-md">
              <h2 style={{ marginBottom: 0 }}>Session Info</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowInfo(null)}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>{showInfo}</p>
          </div>
        </div>
      )}

      {showAdvance && (
        <ConfirmDialog
          title={progress.currentWeek >= 24 ? 'Complete Pete Plan' : `Advance to Week ${progress.currentWeek + 1}`}
          message={progress.currentWeek >= 24
            ? 'You\'ve completed the 24-week Pete Plan! The rowing module will switch to freeform mode.'
            : 'Move to the next week? You can do this even if you haven\'t finished all sessions.'}
          confirmLabel={progress.currentWeek >= 24 ? 'Complete' : 'Advance'}
          onConfirm={advanceWeek}
          onCancel={() => setShowAdvance(false)}
        />
      )}
    </div>
  );
}

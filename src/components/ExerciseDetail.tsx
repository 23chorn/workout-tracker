import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { ChevronLeft } from 'lucide-react';

type TimePeriod = '3m' | '6m' | '1y' | 'all';
const PERIOD_LABELS: Record<TimePeriod, string> = { '3m': '3M', '6m': '6M', '1y': '1Y', 'all': 'All' };

function periodCutoff(period: TimePeriod): Date | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === '3m') d.setMonth(d.getMonth() - 3);
  else if (period === '6m') d.setMonth(d.getMonth() - 6);
  else if (period === '1y') d.setFullYear(d.getFullYear() - 1);
  return d;
}

export function ExerciseDetail({ exerciseId, backLabel, onBack, children }: {
  exerciseId: number;
  backLabel: string;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray()) ?? [];
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId));
  const [period, setPeriod] = useState<TimePeriod>('3m');

  const bestE10RM = useMemo(() => {
    let best = 0;
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (ex.exerciseId === exerciseId && ex.e10RM > best) best = ex.e10RM;
      }
    }
    return best;
  }, [sessions, exerciseId]);

  const dataPoints = useMemo(() => {
    const cutoff = periodCutoff(period);
    return sessions
      .filter(s => s.exercises.some(e => e.exerciseId === exerciseId))
      .filter(s => !cutoff || new Date(s.date) >= cutoff)
      .map(s => {
        const ex = s.exercises.find(e => e.exerciseId === exerciseId)!;
        return { date: new Date(s.date), e10RM: ex.e10RM };
      })
      .filter(d => d.e10RM > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sessions, exerciseId, period]);

  if (!exercise) return null;

  const w = 320;
  const h = 180;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const maxVal = dataPoints.length > 0 ? Math.max(...dataPoints.map(d => d.e10RM)) : 0;
  const minVal = dataPoints.length > 0 ? Math.min(...dataPoints.map(d => d.e10RM)) : 0;
  const range = maxVal - minVal || 1;

  const points = dataPoints.map((d, i) => {
    const x = dataPoints.length === 1
      ? (padL + w - padR) / 2
      : padL + (i / (dataPoints.length - 1)) * (w - padL - padR);
    const y = padT + (1 - (d.e10RM - minVal) / range) * (h - padT - padB);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${h - padB} L ${points[0].x} ${h - padB} Z`
    : '';

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = minVal + (range / gridCount) * i;
    const y = padT + (1 - (val - minVal) / range) * (h - padT - padB);
    return { y, val };
  });

  return (
    <div>
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
        <ChevronLeft size={16} /> {backLabel}
      </button>

      <h2 style={{ marginBottom: 4 }}>{exercise.name}</h2>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        {exercise.muscleGroup} &middot; Rest: {exercise.defaultRestSeconds}s
        {bestE10RM > 0 && (
          <> &middot; PB: <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{bestE10RM.toFixed(1)} kg</span></>
        )}
      </div>

      {children}

      {bestE10RM > 0 && (
        <>
          <div className="sub-tabs" style={{ marginBottom: 16 }}>
            {(['3m', '6m', '1y', 'all'] as TimePeriod[]).map(p => (
              <button
                key={p}
                className={`sub-tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {dataPoints.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <p>No data for this period.</p>
            </div>
          ) : (
            <div className="chart">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>e10RM over time</div>
              <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
                {gridLines.map((g, i) => (
                  <g key={i}>
                    <line x1={padL} y1={g.y} x2={w - padR} y2={g.y} stroke="var(--border)" strokeWidth="0.5" />
                    <text x={padL - 4} y={g.y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                      {g.val.toFixed(1)}
                    </text>
                  </g>
                ))}
                {areaD && <path d={areaD} fill="var(--accent)" opacity="0.1" />}
                <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
                ))}
                {points.length >= 2 && (
                  <>
                    <text x={points[0].x} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="start">
                      {points[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                    <text x={points[points.length - 1].x} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                      {points[points.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  </>
                )}
                {(() => {
                  const bestY = padT + (1 - (bestE10RM - minVal) / range) * (h - padT - padB);
                  return (
                    <line x1={padL} y1={bestY} x2={w - padR} y2={bestY}
                      stroke="var(--yellow)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                  );
                })()}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{dataPoints.length} session{dataPoints.length !== 1 ? 's' : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 2, background: 'var(--yellow)', display: 'inline-block', borderRadius: 1 }} />
                  PB line
                </span>
              </div>
            </div>
          )}

          <h2 style={{ marginTop: 20, marginBottom: 4 }}>Recent Sessions</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Average e10RM (kg) per session</div>
          {dataPoints.slice().reverse().slice(0, 10).map((dp, i) => (
            <div key={i} className="list-item" style={{ cursor: 'default', width: '100%' }}>
              <div>
                <div className="subtitle">
                  {dp.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <span style={{
                fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: dp.e10RM >= bestE10RM ? 'var(--yellow)' : 'var(--accent)',
              }}>
                {dp.e10RM.toFixed(1)} kg
                {dp.e10RM >= bestE10RM && <span className="pb-badge" style={{ marginLeft: 6, fontSize: 10 }}>PB</span>}
              </span>
            </div>
          ))}
        </>
      )}

      {bestE10RM === 0 && (
        <div className="empty" style={{ padding: 24 }}>
          <p>No session data yet for this exercise.</p>
        </div>
      )}
    </div>
  );
}

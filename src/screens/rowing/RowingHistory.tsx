import { useState, useMemo } from 'react';
import { type RowingSession } from '../../db/database';
import { formatSplit, formatMinSec } from '../../utils/date';
import { ChevronDown, Trophy } from 'lucide-react';

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function SplitTrendChart({ sessions }: { sessions: RowingSession[] }) {
  const data = useMemo(() =>
    sessions
      .filter(s => s.avgSplit && s.avgSplit > 0)
      .map(s => ({ date: new Date(s.date), split: s.avgSplit!, type: s.type }))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [sessions]
  );

  if (data.length < 2) return null;

  const maxSplit = Math.max(...data.map(d => d.split));
  const minSplit = Math.min(...data.map(d => d.split));
  const range = maxSplit - minSplit || 1;

  const w = 300, h = 120, pad = 20;
  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + ((d.split - minSplit) / range) * (h - pad * 2), // Lower split = higher on chart (inverted)
    ...d,
  }));
  // Invert: lower split should be higher
  const invertedPoints = points.map(p => ({ ...p, y: h - p.y }));
  const pathD = invertedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="chart">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Avg Split Trend (/500m)</div>
      <svg viewBox={`0 0 ${w} ${h}`} height={h}>
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {invertedPoints.map((p, i) => {
          const color = p.type === 'intervals' ? 'var(--yellow)' : p.type === 'distance' ? 'var(--green)' : 'var(--accent)';
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />;
        })}
        <text x={pad - 4} y={14} fill="var(--text-muted)" fontSize="9" textAnchor="end">{formatSplit(minSplit)}</text>
        <text x={pad - 4} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{formatSplit(maxSplit)}</text>
        <text x={pad} y={h - 4} fill="var(--text-muted)" fontSize="9">{data[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
        <text x={w - pad} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{data[data.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginRight: 4 }} />Steady</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginRight: 4 }} />Distance</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', marginRight: 4 }} />Intervals</span>
      </div>
    </div>
  );
}

function WeeklyVolumeChart({ sessions }: { sessions: RowingSession[] }) {
  const weeklyData = useMemo(() => {
    const weeks = new Map<string, number>();
    for (const s of sessions) {
      if (!s.totalDistance) continue;
      const key = getWeekKey(new Date(s.date));
      weeks.set(key, (weeks.get(key) ?? 0) + s.totalDistance);
    }
    return [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [sessions]);

  if (weeklyData.length === 0) return null;
  const maxVal = Math.max(...weeklyData.map(d => d[1]));

  return (
    <div className="chart">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Weekly Volume (metres)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {weeklyData.map(([week, dist]) => (
          <div key={week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{(dist / 1000).toFixed(1)}K</span>
            <div style={{ width: '100%', height: `${(dist / maxVal) * 60}px`, background: 'var(--accent)', borderRadius: 4, minHeight: 4 }} />
            <span style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {new Date(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonalBests({ sessions }: { sessions: RowingSession[] }) {
  const pbs = useMemo(() => {
    const bestSplit = new Map<number, { split: number; date: string }>();
    const bestDist = new Map<number, { distance: number; date: string }>();

    const standardDistances = [500, 2000, 5000, 10000];
    const standardTimes = [20, 30]; // minutes

    for (const s of sessions) {
      // Best split for standard distances
      if (s.type === 'distance' && s.totalDistance && s.avgSplit) {
        for (const d of standardDistances) {
          if (Math.abs(s.totalDistance - d) < 100) { // within 100m
            const current = bestSplit.get(d);
            if (!current || s.avgSplit < current.split) {
              bestSplit.set(d, { split: s.avgSplit, date: s.date });
            }
          }
        }
      }
      // Best distance for timed pieces
      if (s.type === 'steady' && s.totalTime && s.totalDistance) {
        for (const t of standardTimes) {
          if (Math.abs(s.totalTime - t) < 2) { // within 2 min
            const current = bestDist.get(t);
            if (!current || s.totalDistance > current.distance) {
              bestDist.set(t, { distance: s.totalDistance, date: s.date });
            }
          }
        }
      }
      // Interval PBs (best single rep split)
      if (s.type === 'intervals' && s.intervals) {
        for (const iv of s.intervals) {
          if (iv.distance && iv.split > 0) {
            for (const d of [500]) {
              if (Math.abs(iv.distance - d) < 50) {
                const current = bestSplit.get(d);
                if (!current || iv.split < current.split) {
                  bestSplit.set(d, { split: iv.split, date: s.date });
                }
              }
            }
          }
        }
      }
    }

    const results: { label: string; value: string; date: string }[] = [];
    for (const [dist, data] of bestSplit) {
      results.push({ label: `${dist >= 1000 ? `${dist / 1000}K` : dist}m`, value: formatSplit(data.split) + '/500m', date: data.date });
    }
    for (const [time, data] of bestDist) {
      results.push({ label: `${time} min`, value: `${data.distance}m`, date: data.date });
    }
    return results;
  }, [sessions]);

  if (pbs.length === 0) return null;

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <Trophy size={18} color="var(--yellow)" /> Personal Bests
      </h2>
      {pbs.map((pb, i) => (
        <div key={i} className="list-item" style={{ cursor: 'default', width: '100%' }}>
          <div>
            <div className="title">{pb.label}</div>
            <div className="subtitle">{new Date(pb.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {pb.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RowingHistory({ sessions }: { sessions: RowingSession[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const typeLabel = (t: string) => t === 'steady' ? 'Steady State' : t === 'distance' ? 'Distance' : 'Intervals';

  return (
    <div>
      <SplitTrendChart sessions={sessions} />
      <WeeklyVolumeChart sessions={sessions} />
      <PersonalBests sessions={sessions} />

      <h2 style={{ marginTop: 16 }}>Sessions</h2>
      {sessions.length === 0 ? (
        <div className="empty"><p>No rowing sessions yet.</p></div>
      ) : (
        sessions.map((s, i) => (
          <div key={s.id} className="card" style={{ padding: 0, marginBottom: 8, overflow: 'hidden' }}>
            <button
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {typeLabel(s.type)}
                  {s.week && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Wk {s.week}</span>}
                </div>
                <div className="subtitle">
                  {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {s.totalDistance && ` · ${s.totalDistance}m`}
                  {s.avgSplit && ` · ${formatSplit(s.avgSplit)}/500m`}
                </div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" style={{ transform: expanded === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {expanded === i && (
              <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, fontSize: 13 }}>
                  {s.totalTime != null && <div><span style={{ color: 'var(--text-muted)' }}>Time:</span> {formatMinSec(s.totalTime)}</div>}
                  {s.totalDistance != null && <div><span style={{ color: 'var(--text-muted)' }}>Distance:</span> {s.totalDistance}m</div>}
                  {s.avgSplit != null && <div><span style={{ color: 'var(--text-muted)' }}>Split:</span> {formatSplit(s.avgSplit)}/500m</div>}
                  {s.avgSPM != null && <div><span style={{ color: 'var(--text-muted)' }}>SPM:</span> {s.avgSPM}</div>}
                  {s.calories != null && <div><span style={{ color: 'var(--text-muted)' }}>Cal:</span> {s.calories}</div>}
                  {s.hr != null && <div><span style={{ color: 'var(--text-muted)' }}>HR:</span> {s.hr}</div>}
                </div>
                {s.intervals && s.intervals.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Intervals</div>
                    <div className="set-labels" style={{ gridTemplateColumns: '32px 1fr 1fr 1fr' }}>
                      <span>Rep</span>
                      <span>Dist</span>
                      <span>Split</span>
                      <span>SPM</span>
                    </div>
                    {s.intervals.map((iv, idx) => (
                      <div className="set-row" key={idx} style={{ gridTemplateColumns: '32px 1fr 1fr 1fr', marginBottom: 2 }}>
                        <span className="set-num">{iv.rep}</span>
                        <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.distance ?? '—'}m</span>
                        <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{formatSplit(iv.split)}</span>
                        <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.spm ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

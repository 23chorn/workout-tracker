import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { toDateKey } from '../utils/date';

export function BodyWeightTracker() {
  const entries = useLiveQuery(() => db.bodyWeight.orderBy('date').reverse().toArray()) ?? [];
  const [weight, setWeight] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const addEntry = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    await db.bodyWeight.add({ date: new Date().toISOString(), weight: w });
    setWeight('');
    setShowAdd(false);
  };

  const deleteEntry = async (id: number) => {
    await db.bodyWeight.delete(id);
  };

  const latest = entries[0];
  const todayKey = toDateKey(new Date());
  const loggedToday = entries.some(e => toDateKey(new Date(e.date)) === todayKey);

  // Chart data (chronological)
  const chartData = useMemo(() => [...entries].reverse(), [entries]);

  const w = 300, h = 120, padL = 36, padR = 12, padT = 12, padB = 24;

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.weight)) : 0;
  const minVal = chartData.length > 0 ? Math.min(...chartData.map(d => d.weight)) : 0;
  const range = maxVal - minVal || 1;

  const points = chartData.map((d, i) => ({
    x: chartData.length === 1 ? (padL + w - padR) / 2 : padL + (i / (chartData.length - 1)) * (w - padL - padR),
    y: padT + (1 - (d.weight - minVal) / range) * (h - padT - padB),
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div>
      <div className="row-between mb-sm">
        <h2 style={{ marginBottom: 0 }}>Body Weight</h2>
        {!showAdd && (
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
            {loggedToday ? 'Update' : 'Log'}
          </button>
        )}
      </div>

      {latest && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Current: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{latest.weight} kg</span>
          <span style={{ marginLeft: 8 }}>
            ({new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
          </span>
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 78.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              autoFocus
            />
          </div>
          <div className="row gap-sm">
            <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={addEntry}>Save</button>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="chart" style={{ marginBottom: 12 }}>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
            <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
            ))}
            <text x={padL - 4} y={padT + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{maxVal.toFixed(1)}</text>
            <text x={padL - 4} y={h - padB} fill="var(--text-muted)" fontSize="9" textAnchor="end">{minVal.toFixed(1)}</text>
            {points.length >= 2 && (
              <>
                <text x={padL} y={h - 4} fill="var(--text-muted)" fontSize="9">
                  {new Date(chartData[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={w - padR} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                  {new Date(chartData[chartData.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </>
            )}
          </svg>
        </div>
      )}

      {entries.length > 0 && (
        <div>
          {entries.slice(0, 10).map(e => (
            <div key={e.id} className="list-item" style={{ width: '100%' }}>
              <div>
                <div className="title">{e.weight} kg</div>
                <div className="subtitle">{new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <button onClick={() => deleteEntry(e.id!)} style={{ color: 'var(--text-muted)', padding: 8 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

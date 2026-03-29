import { useState } from 'react';
import { db, type RowingProgramSession, type RowingInterval } from '../../db/database';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

function parseSplit(str: string): number | null {
  const parts = str.split(':');
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0]);
  const s = parseFloat(parts[1]);
  if (isNaN(m) || isNaN(s)) return null;
  return m * 60 + s;
}

export function LogRowingSession({ prescription, programId, week, onComplete, onCancel, freeformType }: {
  prescription?: RowingProgramSession;
  programId?: number;
  week?: number;
  freeformType?: 'steady' | 'distance' | 'intervals';
  onComplete: () => void;
  onCancel: () => void;
}) {
  const type = prescription?.type ?? freeformType ?? 'steady';
  const isIntervals = type === 'intervals';
  const numReps = prescription?.reps ?? 4;

  const [totalTime, setTotalTime] = useState('');
  const [totalDistance, setTotalDistance] = useState('');
  const [avgSplit, setAvgSplit] = useState('');
  const [avgSPM, setAvgSPM] = useState('');
  const [calories, setCalories] = useState('');
  const [hr, setHr] = useState('');

  const [intervals, setIntervals] = useState<{ distance: string; time: string; split: string; spm: string }[]>(
    isIntervals ? Array.from({ length: numReps }, () => ({ distance: prescription?.repDistance ? String(prescription.repDistance) : '', time: '', split: '', spm: '' })) : []
  );

  const updateInterval = (idx: number, field: string, value: string) => {
    setIntervals(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addInterval = () => {
    setIntervals(prev => [...prev, { distance: prescription?.repDistance ? String(prescription.repDistance) : '', time: '', split: '', spm: '' }]);
  };

  const removeInterval = (idx: number) => {
    setIntervals(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const parsedIntervals: RowingInterval[] = isIntervals
      ? intervals.map((iv, i) => ({
          rep: i + 1,
          distance: iv.distance ? parseFloat(iv.distance) : undefined,
          time: iv.time ? (parseSplit(iv.time) ?? parseFloat(iv.time)) : undefined,
          split: parseSplit(iv.split) ?? 0,
          spm: iv.spm ? parseInt(iv.spm) : undefined,
        })).filter(iv => iv.split > 0)
      : [];

    const computedAvgSplit = isIntervals && parsedIntervals.length > 0
      ? parsedIntervals.reduce((s, iv) => s + iv.split, 0) / parsedIntervals.length
      : parseSplit(avgSplit) ?? undefined;

    await db.rowingSessions.add({
      date: new Date().toISOString(),
      programId,
      week,
      day: prescription?.day,
      optional: prescription?.optional,
      type,
      totalTime: totalTime ? (parseSplit(totalTime) ?? parseFloat(totalTime) * 60) / 60 : undefined,
      totalDistance: totalDistance ? parseFloat(totalDistance) : undefined,
      avgSplit: computedAvgSplit,
      avgSPM: avgSPM ? parseInt(avgSPM) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      hr: hr ? parseInt(hr) : undefined,
      intervals: isIntervals ? parsedIntervals : undefined,
    });

    onComplete();
  };

  return (
    <div>
      <button className="btn btn-sm btn-secondary mb-md" onClick={onCancel}>
        <ChevronLeft size={16} /> Back
      </button>

      {prescription && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
            {prescription.target}
          </div>
          {prescription.guidance && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{prescription.guidance}</div>
          )}
        </div>
      )}

      <h2>{isIntervals ? 'Log Intervals' : type === 'distance' ? 'Log Distance Piece' : 'Log Steady State'}</h2>

      {isIntervals ? (
        <>
          {intervals.map((iv, idx) => (
            <div className="card" key={idx} style={{ marginBottom: 8 }}>
              <div className="row-between mb-sm">
                <strong style={{ fontSize: 13 }}>Rep {idx + 1}</strong>
                {intervals.length > 1 && (
                  <button onClick={() => removeInterval(idx)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Distance (m)</label>
                  <input type="number" inputMode="numeric" value={iv.distance} onChange={e => updateInterval(idx, 'distance', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Time</label>
                  <input placeholder="1:45" value={iv.time} onChange={e => updateInterval(idx, 'time', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Split (/500m)</label>
                  <input placeholder="2:05" value={iv.split} onChange={e => updateInterval(idx, 'split', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>SPM</label>
                  <input type="number" inputMode="numeric" value={iv.spm} onChange={e => updateInterval(idx, 'spm', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-full mb-md" onClick={addInterval}>
            <Plus size={14} /> Add Rep
          </button>
        </>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group">
          <label>Total Time</label>
          <input placeholder="25:30" value={totalTime} onChange={e => setTotalTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Total Distance (m)</label>
          <input type="number" inputMode="numeric" value={totalDistance} onChange={e => setTotalDistance(e.target.value)} />
        </div>
        {!isIntervals && (
          <div className="form-group">
            <label>Avg Split (/500m)</label>
            <input placeholder="2:05" value={avgSplit} onChange={e => setAvgSplit(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label>Avg SPM</label>
          <input type="number" inputMode="numeric" value={avgSPM} onChange={e => setAvgSPM(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Calories</label>
          <input type="number" inputMode="numeric" value={calories} onChange={e => setCalories(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Heart Rate</label>
          <input type="number" inputMode="numeric" value={hr} onChange={e => setHr(e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary btn-full mt-md" onClick={save}>
        Save Session
      </button>
    </div>
  );
}

import { useState } from 'react';
import { db, type RowingSession } from '../../db/database';
import { formatSplit, formatMinSec } from '../../utils/date';
import { ConfirmDialog } from '../ConfirmDialog';
import { ChevronLeft, Trash2, Waves } from 'lucide-react';
import { StatCard } from '../StatCard';

export function RowingSessionDetail({ session: rs, onBack }: {
  session: RowingSession;
  onBack: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteRowingSession = async () => {
    if (!rs.id) return;
    await db.rowingSessions.delete(rs.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  const tl = (t: string) => t === 'steady' ? 'Steady State' : t === 'distance' ? 'Distance' : 'Intervals';

  return (
    <div className="screen">
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}><ChevronLeft size={16} /> Back</button>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Waves size={22} color="var(--green)" /> {tl(rs.type)}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        {new Date(rs.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        {rs.week && ` · Pete Plan Week ${rs.week}`}
        {rs.totalTime != null && ` · ${formatMinSec(rs.totalTime)}`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {rs.totalDistance != null && <StatCard label="Distance" value={`${rs.totalDistance.toLocaleString()}m`} />}
        {rs.avgSplit != null && <StatCard label="Avg Split" value={`${formatSplit(rs.avgSplit)}/500m`} color="var(--green)" />}
        {rs.totalTime != null && <StatCard label="Time" value={formatMinSec(rs.totalTime)} />}
        {rs.avgSPM != null && <StatCard label="SPM" value={rs.avgSPM} />}
        {rs.calories != null && <StatCard label="Calories" value={rs.calories} />}
        {rs.hr != null && <StatCard label="Heart Rate" value={rs.hr} sub="bpm" />}
      </div>

      {rs.intervals && rs.intervals.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Intervals</div>
          <div className="set-labels" style={{ gridTemplateColumns: '32px 1fr 1fr 1fr 1fr' }}>
            <span>Rep</span><span>Dist</span><span>Time</span><span>Split</span><span>SPM</span>
          </div>
          {rs.intervals.map((iv, idx) => (
            <div key={idx} className="set-row" style={{ gridTemplateColumns: '32px 1fr 1fr 1fr 1fr', marginBottom: 2 }}>
              <span className="set-num">{iv.rep}</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.distance ?? '—'}m</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.time ? formatSplit(iv.time) : '—'}</span>
              <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{formatSplit(iv.split)}</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.spm ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-danger btn-full" style={{ marginTop: 16 }} onClick={() => setShowDeleteConfirm(true)}>
        <Trash2 size={14} /> Delete Session
      </button>

      {showDeleteConfirm && (
        <ConfirmDialog title="Delete Rowing Session" message={`Delete this ${tl(rs.type)} session from ${new Date(rs.date).toLocaleDateString()}? This cannot be undone.`} confirmLabel="Delete" destructive onConfirm={deleteRowingSession} onCancel={() => setShowDeleteConfirm(false)} />
      )}
    </div>
  );
}

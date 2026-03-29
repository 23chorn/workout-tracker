import { StatCard } from './StatCard';

export interface SessionSummaryData {
  dayLabel: string;
  date?: string;
  duration?: number;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  pbs: { name: string; e10RM: number }[];
}

function formatVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}K kg`;
  return `${Math.round(kg)} kg`;
}

export function SessionSummary({ data, onDismiss, dismissLabel }: {
  data: SessionSummaryData;
  onDismiss: () => void;
  dismissLabel?: string;
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', paddingTop: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>&#10003;</div>
        <h1 style={{ marginBottom: 4 }}>{data.dayLabel}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          {data.date
            ? new Date(data.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            : 'Session Complete'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <StatCard label="Duration" value={data.duration != null ? `${data.duration}m` : '—'} />
        <StatCard label="Exercises" value={data.exerciseCount} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <StatCard label="Total Sets" value={data.totalSets} />
        <StatCard label="Volume" value={formatVolume(data.totalVolume)} />
      </div>

      {data.pbs.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pb-badge">PB</span> New Personal Bests
          </div>
          {data.pbs.map((pb, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14 }}>{pb.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--yellow)' }}>{pb.e10RM.toFixed(1)} kg</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={onDismiss}>
        {dismissLabel ?? 'Done'}
      </button>
    </div>
  );
}

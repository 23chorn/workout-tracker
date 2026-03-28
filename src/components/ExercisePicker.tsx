import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise } from '../db/database';
import { Plus } from 'lucide-react';

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1D';
  if (days < 7) return `${days}D`;
  const weeks = Math.round(days / 7);
  if (weeks <= 4) return `${weeks}W`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}M`;
  const years = Math.round(days / 365);
  return `${years}Y`;
}

function ExerciseRow({ ex, last, onAdd }: { ex: Exercise; last?: Date; onAdd: () => void }) {
  return (
    <button className="list-item" style={{ width: '100%' }} onClick={onAdd}>
      <div style={{ textAlign: 'left' }}>
        <div className="title">{ex.name}</div>
        <div className="subtitle">{ex.muscleGroup}{ex.secondaryMuscleGroup && ` / ${ex.secondaryMuscleGroup}`}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {last && (
          <span style={{
            fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)',
            padding: '2px 6px', borderRadius: 4, fontWeight: 600,
          }}>
            {relativeTime(last)}
          </span>
        )}
        <Plus size={16} color="var(--accent)" />
      </div>
    </button>
  );
}

export function ExercisePicker({ exercises, suggestBy, onAdd, onClose }: {
  exercises: Exercise[];
  suggestBy: 'recent' | { muscleGroups: Set<string> };
  onAdd: (id: number) => void;
  onClose: () => void;
}) {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray()) ?? [];
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  const lastCompleted = useMemo(() => {
    const map = new Map<number, Date>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (!map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, new Date(s.date));
        }
      }
    }
    return map;
  }, [sessions]);

  // All unique muscle groups from available exercises
  const muscleGroups = useMemo(() =>
    [...new Set(exercises.flatMap(e => [e.muscleGroup, ...(e.secondaryMuscleGroup ? [e.secondaryMuscleGroup] : [])]))].sort(),
    [exercises]
  );

  const isSearching = search.trim().length > 0;
  const isFiltering = muscleFilter !== null;

  // Muscle group filter: primary first, then secondary
  const muscleFiltered = useMemo(() => {
    if (!muscleFilter) return null;
    const primary = exercises.filter(e => e.muscleGroup === muscleFilter);
    const secondary = exercises.filter(e => e.secondaryMuscleGroup === muscleFilter && e.muscleGroup !== muscleFilter);
    return { primary, secondary };
  }, [exercises, muscleFilter]);

  // Default suggestions
  let suggested: Exercise[];
  let suggestLabel: string;
  if (suggestBy === 'recent') {
    suggested = [...exercises]
      .sort((a, b) => {
        const aTime = lastCompleted.get(a.id!)?.getTime() ?? 0;
        const bTime = lastCompleted.get(b.id!)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10);
    suggestLabel = 'Recent';
  } else {
    const mg = suggestBy.muscleGroups;
    suggested = exercises
      .filter(e => mg.has(e.muscleGroup) || (e.secondaryMuscleGroup && mg.has(e.secondaryMuscleGroup)))
      .slice(0, 10);
    suggestLabel = 'Suggested';
  }

  // Search results
  const searchResults = isSearching
    ? exercises.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase()) ||
        (e.secondaryMuscleGroup?.toLowerCase().includes(search.toLowerCase()))
      )
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Add Exercise</h2>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); if (e.target.value) setMuscleFilter(null); }}
          placeholder="Search all exercises..."
          style={{ marginBottom: 8 }}
          autoFocus
        />

        {/* Muscle group filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {muscleGroups.map(mg => (
            <button
              key={mg}
              onClick={() => { setMuscleFilter(muscleFilter === mg ? null : mg); setSearch(''); }}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: '1px solid var(--border)',
                background: muscleFilter === mg ? 'var(--accent)' : 'var(--bg-input)',
                color: muscleFilter === mg ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {mg}
            </button>
          ))}
        </div>

        <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {/* Search mode */}
          {isSearching && searchResults && (
            <>
              {searchResults.map(ex => (
                <ExerciseRow key={ex.id} ex={ex} last={lastCompleted.get(ex.id!)} onAdd={() => onAdd(ex.id!)} />
              ))}
              {searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>
                  No exercises found
                </div>
              )}
            </>
          )}

          {/* Muscle filter mode */}
          {!isSearching && isFiltering && muscleFiltered && (
            <>
              {muscleFiltered.primary.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                    Primary — {muscleFilter}
                  </div>
                  {muscleFiltered.primary.map(ex => (
                    <ExerciseRow key={ex.id} ex={ex} last={lastCompleted.get(ex.id!)} onAdd={() => onAdd(ex.id!)} />
                  ))}
                </>
              )}
              {muscleFiltered.secondary.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12, marginBottom: 6 }}>
                    Secondary — {muscleFilter}
                  </div>
                  {muscleFiltered.secondary.map(ex => (
                    <ExerciseRow key={ex.id} ex={ex} last={lastCompleted.get(ex.id!)} onAdd={() => onAdd(ex.id!)} />
                  ))}
                </>
              )}
            </>
          )}

          {/* Default suggestions */}
          {!isSearching && !isFiltering && (
            <>
              {suggested.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {suggestLabel}
                </div>
              )}
              {suggested.map(ex => (
                <ExerciseRow key={ex.id} ex={ex} last={lastCompleted.get(ex.id!)} onAdd={() => onAdd(ex.id!)} />
              ))}
            </>
          )}
        </div>

        <button className="btn btn-secondary btn-full mt-md" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

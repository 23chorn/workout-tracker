import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ExerciseCategory } from '../../db/database';
import { ExerciseDetail } from '../ExerciseDetail';
import { ConfirmDialog } from '../ConfirmDialog';
import { OptionPicker } from '../OptionPicker';
import { Plus, Trash2, Camera, Dumbbell } from 'lucide-react';
import { MuscleGroupChips } from '../MuscleGroupChips';

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ExerciseManager() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [secondaryMuscleGroup, setSecondaryMuscleGroup] = useState('');
  const [addCategory, setAddCategory] = useState<ExerciseCategory | ''>('');
  const [rest, setRest] = useState('90');
  const [addPicker, setAddPicker] = useState<'muscle' | 'secondary' | 'category' | null>(null);
  const [viewingExercise, setViewingExercise] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef(0);

  const openExercise = (id: number) => {
    const screenEl = document.querySelector('.screen');
    scrollRef.current = screenEl?.scrollTop ?? 0;
    setViewingExercise(id);
  };

  const closeExercise = () => {
    setViewingExercise(null);
    requestAnimationFrame(() => {
      const screenEl = document.querySelector('.screen');
      if (screenEl) screenEl.scrollTop = scrollRef.current;
    });
  };

  const addExercise = async () => {
    if (!name.trim()) return;
    await db.exercises.add({
      name: name.trim(),
      muscleGroup: muscleGroup,
      secondaryMuscleGroup: secondaryMuscleGroup || undefined,
      category: addCategory || undefined,
      defaultRestSeconds: parseInt(rest) || 90,
    });
    setName(''); setMuscleGroup(''); setSecondaryMuscleGroup(''); setAddCategory(''); setRest('90'); setShowAdd(false);
  };

  const handlePhoto = async (exId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 400);
    await db.exercises.update(exId, { imageUrl: dataUrl });
  };

  const removePhoto = async (exId: number) => {
    await db.exercises.update(exId, { imageUrl: undefined });
  };

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const allMuscleGroups = [...new Set(exercises.flatMap(e => [e.muscleGroup, ...(e.secondaryMuscleGroup ? [e.secondaryMuscleGroup] : [])]))].sort();

  const filtered = (() => {
    let list = exercises;
    if (muscleFilter) {
      list = list.filter(e => e.muscleGroup === muscleFilter || e.secondaryMuscleGroup === muscleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        (e.secondaryMuscleGroup?.toLowerCase().includes(q))
      );
    }
    return list;
  })();
  const groups = [...new Set(filtered.map(e => e.muscleGroup))].sort();

  const [editingFields, setEditingFields] = useState(false);
  const [showDeleteExercise, setShowDeleteExercise] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editSecondary, setEditSecondary] = useState('');
  const [editCategory, setEditCategory] = useState<ExerciseCategory | ''>('');
  const [editRest, setEditRest] = useState('');
  const [editPicker, setEditPicker] = useState<'muscle' | 'secondary' | 'category' | null>(null);

  const ALL_MUSCLES = [...new Set(exercises.flatMap(e => [e.muscleGroup, ...(e.secondaryMuscleGroup ? [e.secondaryMuscleGroup] : [])]))].sort();
  const CATEGORIES: ExerciseCategory[] = ['barbell', 'dumbbell', 'machine', 'bodyweight'];

  const deleteExercise = async (id: number) => {
    await db.exercises.delete(id);
    setShowDeleteExercise(false);
    closeExercise();
  };

  const viewing = viewingExercise !== null ? exercises.find(e => e.id === viewingExercise) : null;

  const startEditing = () => {
    if (!viewing) return;
    setEditName(viewing.name);
    setEditMuscle(viewing.muscleGroup);
    setEditSecondary(viewing.secondaryMuscleGroup ?? '');
    setEditCategory(viewing.category ?? '');
    setEditRest(String(viewing.defaultRestSeconds));
    setEditingFields(true);
  };

  const saveEditing = async () => {
    if (!viewing || !editName.trim() || !editMuscle) return;
    await db.exercises.update(viewing.id!, {
      name: editName.trim(),
      muscleGroup: editMuscle,
      secondaryMuscleGroup: editSecondary || undefined,
      category: editCategory || undefined,
      defaultRestSeconds: parseInt(editRest) || 90,
    });
    setEditingFields(false);
  };

  if (viewing) {
    return (
      <div>
        <ExerciseDetail
          exerciseId={viewing.id!}
          backLabel="Exercises"
          onBack={() => { closeExercise(); setEditingFields(false); }}
          onEdit={startEditing}
        >
          {editingFields && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <button className="picker-input" onClick={() => setEditPicker('category')}>
                  {editCategory ? <span style={{ textTransform: 'capitalize' }}>{editCategory}</span> : <span className="placeholder">Select...</span>}
                </button>
              </div>
              <div className="form-group">
                <label>Primary Muscle Group</label>
                <button className="picker-input" onClick={() => setEditPicker('muscle')}>
                  {editMuscle || <span className="placeholder">Select...</span>}
                </button>
              </div>
              <div className="form-group">
                <label>Secondary Muscle Group</label>
                <button className="picker-input" onClick={() => setEditPicker('secondary')}>
                  {editSecondary || <span className="placeholder">None</span>}
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Default Rest (seconds)</label>
                <input type="number" value={editRest} onChange={e => setEditRest(e.target.value)} />
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setEditingFields(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEditing}>Save</button>
              </div>

              {editPicker === 'category' && (
                <OptionPicker title="Category" options={CATEGORIES.map(c => c.charAt(0).toUpperCase() + c.slice(1))} value={editCategory ? editCategory.charAt(0).toUpperCase() + editCategory.slice(1) : ''} allowEmpty onChange={v => setEditCategory((v.toLowerCase() as ExerciseCategory) || '')} onClose={() => setEditPicker(null)} />
              )}
              {editPicker === 'muscle' && (
                <OptionPicker title="Primary Muscle Group" options={ALL_MUSCLES} value={editMuscle} onChange={v => setEditMuscle(v)} onClose={() => setEditPicker(null)} />
              )}
              {editPicker === 'secondary' && (
                <OptionPicker title="Secondary Muscle Group" options={ALL_MUSCLES} value={editSecondary} allowEmpty onChange={v => setEditSecondary(v)} onClose={() => setEditPicker(null)} />
              )}
            </div>
          )}

          {viewing.imageUrl ? (
            <div style={{ marginBottom: 16 }}>
              <img src={viewing.imageUrl} alt={viewing.name} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => photoRef.current?.click()}>
                  <Camera size={14} /> Replace Photo
                </button>
                <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => removePhoto(viewing.id!)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary btn-full mb-md" onClick={() => photoRef.current?.click()}>
              <Camera size={16} /> Add Photo
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={(e) => handlePhoto(viewing.id!, e)} style={{ display: 'none' }} />
        </ExerciseDetail>
        <button className="btn btn-danger btn-full" style={{ marginTop: 24 }} onClick={() => setShowDeleteExercise(true)}>
          <Trash2 size={14} /> Delete Exercise
        </button>
        {showDeleteExercise && (
          <ConfirmDialog title="Delete Exercise" message={`Delete "${viewing.name}"? This won't remove it from existing sessions but it will be removed from the library and any workout templates.`} confirmLabel="Delete" destructive onConfirm={() => deleteExercise(viewing.id!)} onCancel={() => setShowDeleteExercise(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Exercises ({exercises.length})</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add
        </button>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setMuscleFilter(null); }} placeholder="Search exercises..." style={{ marginBottom: 8 }} />

      <MuscleGroupChips groups={allMuscleGroups} selected={muscleFilter} onSelect={(mg) => { setMuscleFilter(mg); setSearch(''); }} />

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Exercise</h2>
            <div className="form-group"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Barbell Row" /></div>
            <div className="form-group">
              <label>Category</label>
              <button className="picker-input" onClick={() => setAddPicker('category')}>
                {addCategory ? <span style={{ textTransform: 'capitalize' }}>{addCategory}</span> : <span className="placeholder">Select...</span>}
              </button>
            </div>
            <div className="form-group">
              <label>Primary Muscle Group</label>
              <button className="picker-input" onClick={() => setAddPicker('muscle')}>
                {muscleGroup || <span className="placeholder">Select...</span>}
              </button>
            </div>
            <div className="form-group">
              <label>Secondary Muscle Group</label>
              <button className="picker-input" onClick={() => setAddPicker('secondary')}>
                {secondaryMuscleGroup || <span className="placeholder">None</span>}
              </button>
            </div>
            <div className="form-group"><label>Default Rest (seconds)</label><input type="number" value={rest} onChange={e => setRest(e.target.value)} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addExercise}>Add</button>
            </div>
            {addPicker === 'category' && (
              <OptionPicker title="Category" options={CATEGORIES.map(c => c.charAt(0).toUpperCase() + c.slice(1))} value={addCategory ? addCategory.charAt(0).toUpperCase() + addCategory.slice(1) : ''} allowEmpty onChange={v => setAddCategory((v.toLowerCase() as ExerciseCategory) || '')} onClose={() => setAddPicker(null)} />
            )}
            {addPicker === 'muscle' && (
              <OptionPicker title="Primary Muscle Group" options={ALL_MUSCLES} value={muscleGroup} onChange={v => setMuscleGroup(v)} onClose={() => setAddPicker(null)} />
            )}
            {addPicker === 'secondary' && (
              <OptionPicker title="Secondary Muscle Group" options={ALL_MUSCLES} value={secondaryMuscleGroup} allowEmpty onChange={v => setSecondaryMuscleGroup(v)} onClose={() => setAddPicker(null)} />
            )}
          </div>
        </div>
      )}

      {groups.map(group => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{group}</div>
          {filtered.filter(e => e.muscleGroup === group).map(ex => (
            <button key={ex.id} className="list-item" style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }} onClick={() => openExercise(ex.id!)}>
              {ex.imageUrl ? (
                <img src={ex.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Dumbbell size={14} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <div className="title">{ex.name}</div>
                <div className="subtitle">{ex.category && <span style={{ textTransform: 'capitalize' }}>{ex.category} &middot; </span>}{ex.muscleGroup}{ex.secondaryMuscleGroup && ` / ${ex.secondaryMuscleGroup}`} &middot; {ex.defaultRestSeconds}s</div>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

import { db } from '../db/database';

export async function exportData(): Promise<void> {
  const [exercises, workouts, programs, sessions, rowingPrograms, rowingProgress, rowingSessions] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.programs.toArray(),
    db.sessions.toArray(),
    db.rowingPrograms.toArray(),
    db.rowingProgress.toArray(),
    db.rowingSessions.toArray(),
  ]);

  const data = {
    exercises, workouts, programs, sessions,
    rowingPrograms, rowingProgress, rowingSessions,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `lift-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  await db.transaction('rw', [db.exercises, db.workouts, db.programs, db.sessions, db.rowingPrograms, db.rowingProgress, db.rowingSessions], async () => {
    await db.exercises.clear();
    await db.workouts.clear();
    await db.programs.clear();
    await db.sessions.clear();
    await db.rowingPrograms.clear();
    await db.rowingProgress.clear();
    await db.rowingSessions.clear();

    if (data.exercises?.length) await db.exercises.bulkAdd(data.exercises);
    if (data.workouts?.length) await db.workouts.bulkAdd(data.workouts);
    if (data.programs?.length) await db.programs.bulkAdd(data.programs);
    if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions);
    if (data.rowingPrograms?.length) await db.rowingPrograms.bulkAdd(data.rowingPrograms);
    if (data.rowingProgress?.length) await db.rowingProgress.bulkAdd(data.rowingProgress);
    if (data.rowingSessions?.length) await db.rowingSessions.bulkAdd(data.rowingSessions);
  });
}

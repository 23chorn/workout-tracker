import { db } from './database';
import { PETE_PLAN } from './petePlan';

const ROWING_SEED_VERSION = 2; // Bump this when Pete Plan data changes

export async function seedRowingPrograms() {
  const currentVersion = parseInt(localStorage.getItem('lift-rowing-seed-version') ?? '0');
  if (currentVersion < ROWING_SEED_VERSION) {
    // Clear and re-seed with updated program data
    await db.rowingPrograms.clear();
    await db.rowingPrograms.add(PETE_PLAN);
    localStorage.setItem('lift-rowing-seed-version', String(ROWING_SEED_VERSION));
  } else {
    // First time — seed if empty
    const count = await db.rowingPrograms.count();
    if (count === 0) {
      await db.rowingPrograms.add(PETE_PLAN);
      localStorage.setItem('lift-rowing-seed-version', String(ROWING_SEED_VERSION));
    }
  }
}

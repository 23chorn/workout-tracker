import { db, type LiftingPhase, type LiftingPlan, type PhaseDay, type RowingProgramSession } from '../db/database';
import { PETE_PLAN_WEEKS } from '../db/petePlan';

/** Returns the currently-active lifting plan, or null if none. */
export async function getActivePlan(): Promise<LiftingPlan | null> {
  const progress = await db.liftingPlanProgress.filter(p => p.active).first();
  if (!progress) return null;
  const plan = await db.liftingPlans.get(progress.planId);
  return plan ?? null;
}

/** Total weeks in a plan, derived from the last phase. */
export function totalWeeks(plan: LiftingPlan): number {
  return plan.phases.reduce((max, p) => Math.max(max, p.endWeek), 0);
}

/** Current week number within the plan, 1-indexed, clamped to [1, totalWeeks]. */
export function getCurrentWeek(plan: LiftingPlan, now = new Date()): number {
  const start = new Date(plan.startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(totalWeeks(plan), Math.max(1, week));
}

/** Phase containing the given week, or null. */
export function getPhaseForWeek(plan: LiftingPlan, week: number): LiftingPhase | null {
  return plan.phases.find(p => week >= p.startWeek && week <= p.endWeek) ?? null;
}

/** Day-of-week with Monday = 0 (our PhaseDay convention). */
export function mondayIndex(now = new Date()): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const js = now.getDay(); // 0 = Sun
  return ((js + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export type TodayContext = {
  plan: LiftingPlan;
  week: number;
  weekInPhase: number;
  phase: LiftingPhase;
  phaseDay: PhaseDay;
  rowingSession: RowingProgramSession | null;
};

/** Resolve everything needed to render today's plan context. */
export function getTodayContext(plan: LiftingPlan, now = new Date()): TodayContext | null {
  const week = getCurrentWeek(plan, now);
  const phase = getPhaseForWeek(plan, week);
  if (!phase) return null;
  const weekInPhase = week - phase.startWeek + 1;
  const dow = mondayIndex(now);
  const phaseDay = phase.days.find(d => d.dayOfWeek === dow);
  if (!phaseDay) return null;

  let rowingSession: RowingProgramSession | null = null;
  if (phaseDay.rowingSlot) {
    const peteWeek = PETE_PLAN_WEEKS.find(w => w.week === week);
    if (peteWeek) {
      // Pete Plan sessions are stored with day 1..5. We map our slots:
      // slot 1 → day 1 (steady), slot 2 → day 2 (intervals), slot 3 → day 3 (steady/mixed), 'optional' → day 4.
      const slotToDay: Record<string, number> = { '1': 1, '2': 2, '3': 3, 'optional': 4 };
      const targetDay = slotToDay[String(phaseDay.rowingSlot)];
      rowingSession = peteWeek.sessions.find(s => s.day === targetDay) ?? null;
    }
  }

  return { plan, week, weekInPhase, phase, phaseDay, rowingSession };
}

/** Shift the plan forward by one day — "I missed today, push the cycle forward". */
export async function skipDay(planId: number): Promise<void> {
  const plan = await db.liftingPlans.get(planId);
  if (!plan) return;
  // Shifting startDate BACK one day makes "today" land on what was yesterday's plan day,
  // which effectively postpones the remaining schedule by one day.
  const d = new Date(plan.startDate);
  d.setDate(d.getDate() - 1);
  plan.startDate = d.toISOString().split('T')[0];
  await db.liftingPlans.update(planId, { startDate: plan.startDate });
}

/** Update per-exercise scheme override on a phase (manual stall toggle). */
export async function setSchemeOverride(
  planId: number,
  phaseIndex: number,
  exerciseId: number,
  scheme: import('../db/database').ProgressionScheme | null,
): Promise<void> {
  const plan = await db.liftingPlans.get(planId);
  if (!plan) return;
  const phase = plan.phases[phaseIndex];
  if (!phase) return;
  const overrides = (phase.schemeOverrides ?? []).filter(o => o.exerciseId !== exerciseId);
  if (scheme) overrides.push({ exerciseId, scheme });
  phase.schemeOverrides = overrides;
  await db.liftingPlans.update(planId, { phases: plan.phases });
}

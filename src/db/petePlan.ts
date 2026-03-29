import { type RowingProgramSession } from './database';

// Pete Plan: 24-week beginner rowing program
// Source: https://thepeteplan.wordpress.com/beginner-training/
//
// Weekly structure:
//   Day 1: Long steady-state distance
//   Day 2: Interval session
//   Day 3: Steady-state distance / time-based
//   Day 4 (optional): Additional endurance
//   Day 5 (optional): Additional intervals

type WeekDef = { week: number; sessions: RowingProgramSession[] };

function dist(day: number, meters: number, guidance: string, optional = false): RowingProgramSession {
  return { day, type: 'distance', target: `${meters}m`, repDistance: meters, guidance, optional };
}

function time(day: number, minutes: number, guidance: string, optional = false): RowingProgramSession {
  return { day, type: 'steady', target: `${minutes} min`, repMinutes: minutes, guidance, optional };
}

function iv(day: number, reps: number, repDist: number, restMin: number, guidance: string, optional = false): RowingProgramSession {
  return {
    day, type: 'intervals',
    target: `${reps} × ${repDist}m / ${restMin} min rest`,
    reps, repDistance: repDist, restSeconds: restMin * 60, guidance, optional,
  };
}

function ivTime(day: number, reps: number, repMin: number, restMin: number, guidance: string, optional = false): RowingProgramSession {
  return {
    day, type: 'intervals',
    target: `${reps} × ${repMin} min / ${restMin} min rest`,
    reps, repMinutes: repMin, restSeconds: restMin * 60, guidance, optional,
  };
}

// Session group explanations
export const SESSION_INFO = {
  speed: 'Speed Training (Group 3): Higher-intensity intervals with rest equal to work duration. Start conservatively — estimate pace from your best recent 5K. Do all reps except the last at target pace, then sprint the final rep. Record the session average as your next target.',
  at: 'Speed Endurance / Anaerobic Threshold (Group 2): Rest approximately half the interval duration. Use the same progression method as speed intervals — target the session average from your previous attempt. Builds anaerobic threshold and mental toughness.',
  endurance: 'Endurance Training (Group 1): Single-distance pieces or longer intervals with short rest (max ¼ of interval duration). Row at 22-25spm maintaining at least 10 seconds slower pace than your endurance interval sessions. Aids recovery before harder sessions.',
  steady: 'Steady State: Focus on technique, relaxation and efficiency. Rate 24spm or lower. Use negative splitting — gradually accelerate through the second half. These sessions build your aerobic base.',
  optional: 'Optional Session: Lower intensity, rate 20-22spm. For recovery or technique work. Skip if fatigued — consistency on core sessions matters more.',
};

const SS = 'Steady state. Focus on technique, relaxation and efficiency. Rate 24spm or lower.';
const NEG = 'Negative split — gradually accelerate through the second half.';
const OPT = 'Optional. Low intensity, rate 20-22spm. Recovery or technique focus.';

export const PETE_PLAN_WEEKS: WeekDef[] = [
  // Week 1: Day1=5000m, Day2=6×500m/2min, Day3=5000m, [Day4=20min], [Day5=2×10min/2min]
  { week: 1, sessions: [
    dist(1, 5000, `${SS} Establish your baseline pace.`),
    iv(2, 6, 500, 2, 'Speed work. Find a comfortable repeatable pace.'),
    dist(3, 5000, `${SS} ${NEG}`),
    time(4, 20, OPT, true),
    ivTime(5, 2, 10, 2, `Endurance intervals. ${OPT}`, true),
  ]},
  // Week 2: Day1=5500m, Day2=4×750m/2min, Day3=5500m, [Day4=20min], [Day5=3×8min/2min]
  { week: 2, sessions: [
    dist(1, 5500, `${SS} Slightly longer than week 1.`),
    iv(2, 4, 750, 2, 'Speed endurance. New distance — find the rhythm.'),
    dist(3, 5500, `${SS} ${NEG}`),
    time(4, 20, OPT, true),
    ivTime(5, 3, 8, 2, `Endurance intervals. ${OPT}`, true),
  ]},
  // Week 3: Day1=6000m, Day2=2×2000m/4min, Day3=6000m, [Day4=5000m], [Day5=6×500m/2min]
  { week: 3, sessions: [
    dist(1, 6000, `${SS} Building distance.`),
    iv(2, 2, 2000, 4, 'Speed endurance. Longer reps. Even pacing across both.'),
    dist(3, 6000, `${SS} ${NEG}`),
    dist(4, 5000, OPT, true),
    iv(5, 6, 500, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 4: Day1=6500m, Day2=3×1000m/3min, Day3=6500m, [Day4=6000m], [Day5=2×2500m/2min]
  { week: 4, sessions: [
    dist(1, 6500, `${SS} Keep extending.`),
    iv(2, 3, 1000, 3, 'Speed work. 3 × 1000m. Hold your pace.'),
    dist(3, 6500, `${SS} ${NEG}`),
    dist(4, 6000, OPT, true),
    iv(5, 2, 2500, 2, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 5: Day1=7000m, Day2=4×800m/2min, Day3=7000m, [Day4=20min], [Day5=2×10min/2min]
  { week: 5, sessions: [
    dist(1, 7000, `${SS} 7K for the first time.`),
    iv(2, 4, 800, 2, 'Speed work. Match or beat week 4 pace.'),
    dist(3, 7000, `${SS} ${NEG}`),
    time(4, 20, OPT, true),
    ivTime(5, 2, 10, 2, `Endurance intervals. ${OPT}`, true),
  ]},
  // Week 6: Day1=7500m, Day2=3×2000m/4min, Day3=7500m, [Day4=5000m], [Day5=6×500m/2min]
  { week: 6, sessions: [
    dist(1, 7500, SS),
    iv(2, 3, 2000, 4, 'Speed endurance. 3 × 2K. Controlled effort.'),
    dist(3, 7500, `${SS} ${NEG}`),
    dist(4, 5000, OPT, true),
    iv(5, 6, 500, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 7: Day1=8000m, Day2=7×500m/2min, Day3=8000m, [Day4=6000m], [Day5=3×1500m/3min]
  { week: 7, sessions: [
    dist(1, 8000, `${SS} First 8K.`),
    iv(2, 7, 500, 2, 'Speed work. 7 reps now. Hold the pace.'),
    dist(3, 8000, `${SS} ${NEG}`),
    dist(4, 6000, OPT, true),
    iv(5, 3, 1500, 3, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 8: Day1=8500m, Day2=4×1500m/3min, Day3=8000m, [Day4=25min], [Day5=3×1000m/3min]
  { week: 8, sessions: [
    dist(1, 8500, SS),
    iv(2, 4, 1500, 3, 'Speed endurance. 4 × 1500m.'),
    dist(3, 8000, `${SS} ${NEG}`),
    time(4, 25, OPT, true),
    iv(5, 3, 1000, 3, `Speed work. ${OPT}`, true),
  ]},
  // Week 9: Day1=9000m, Day2=4×800m/2min, Day3=8000m, [Day4=8000m], [Day5=2×10min/2min]
  { week: 9, sessions: [
    dist(1, 9000, SS),
    iv(2, 4, 800, 2, 'Speed work. Push the pace.'),
    dist(3, 8000, `${SS} ${NEG}`),
    dist(4, 8000, OPT, true),
    ivTime(5, 2, 10, 2, `Endurance intervals. ${OPT}`, true),
  ]},
  // Week 10: Day1=9500m, Day2=3×2000m/4min, Day3=8000m, [Day4=8000m], [Day5=7×500m/2min]
  { week: 10, sessions: [
    dist(1, 9500, SS),
    iv(2, 3, 2000, 4, 'Speed endurance. Faster than week 6.'),
    dist(3, 8000, `${SS} ${NEG}`),
    dist(4, 8000, OPT, true),
    iv(5, 7, 500, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 11: Day1=10000m, Day2=8×500m/2min, Day3=8000m, [Day4=25min], [Day5=4×1500m/3min]
  { week: 11, sessions: [
    dist(1, 10000, `${SS} First 10K! Distance plateaus here — focus shifts to pace.`),
    iv(2, 8, 500, 2, 'Speed work. 8 × 500m. Fast.'),
    dist(3, 8000, `${SS} ${NEG}`),
    time(4, 25, OPT, true),
    iv(5, 4, 1500, 3, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 12: Day1=10000m, Day2=4×1500m/3min, Day3=3×10min/2min, [Day4=8000m], [Day5=4×800m/2min]
  { week: 12, sessions: [
    dist(1, 10000, `${SS} Improve pace from week 11.`),
    iv(2, 4, 1500, 3, 'Speed endurance. 4 × 1500m.'),
    ivTime(3, 3, 10, 2, 'Endurance intervals. Time-based.'),
    dist(4, 8000, OPT, true),
    iv(5, 4, 800, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 13: Day1=10000m, Day2=4×1000m/3min, Day3=2×15min/2min, [Day4=8000m], [Day5=3×2000m/4min]
  { week: 13, sessions: [
    dist(1, 10000, SS),
    iv(2, 4, 1000, 3, 'Speed work. 4 × 1000m.'),
    ivTime(3, 2, 15, 2, 'Endurance intervals. 2 × 15 min.'),
    dist(4, 8000, OPT, true),
    iv(5, 3, 2000, 4, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 14: Day1=10000m, Day2=3×2000m/4min, Day3=4×8min/2min, [Day4=30min], [Day5=7×500m/2min]
  { week: 14, sessions: [
    dist(1, 10000, SS),
    iv(2, 3, 2000, 4, 'Speed endurance. Push for best splits.'),
    ivTime(3, 4, 8, 2, 'Endurance intervals. 4 × 8 min.'),
    time(4, 30, OPT, true),
    iv(5, 7, 500, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 15: Day1=10000m, Day2=5×750m/2min, Day3=3×10min/2min, [Day4=8000m], [Day5=4×1500m/3min]
  { week: 15, sessions: [
    dist(1, 10000, SS),
    iv(2, 5, 750, 2, 'Speed work. 5 × 750m.'),
    ivTime(3, 3, 10, 2, 'Endurance intervals. 3 × 10 min.'),
    dist(4, 8000, OPT, true),
    iv(5, 4, 1500, 3, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 16: Day1=10500m, Day2=5×1500m/3min, Day3=30min, [Day4=10000m], [Day5=4×1000m/3min]
  { week: 16, sessions: [
    dist(1, 10500, `${SS} Stepping up distance again.`),
    iv(2, 5, 1500, 3, 'Speed endurance. 5 × 1500m.'),
    time(3, 30, `${SS} 30 min steady.`),
    dist(4, 10000, OPT, true),
    iv(5, 4, 1000, 3, `Speed work. ${OPT}`, true),
  ]},
  // Week 17: Day1=10500m, Day2=8×500m/2min, Day3=2×15min/2min, [Day4=30min], [Day5=4×8min/2min]
  { week: 17, sessions: [
    dist(1, 10500, SS),
    iv(2, 8, 500, 2, 'Speed work. 8 × 500m. Faster than week 11.'),
    ivTime(3, 2, 15, 2, 'Endurance intervals. 2 × 15 min.'),
    time(4, 30, OPT, true),
    ivTime(5, 4, 8, 2, `Endurance intervals. ${OPT}`, true),
  ]},
  // Week 18: Day1=11000m, Day2=4×2000m/4min, Day3=30min, [Day4=10000m], [Day5=4×1000m/3min]
  { week: 18, sessions: [
    dist(1, 11000, `${SS} 11K.`),
    iv(2, 4, 2000, 4, 'Speed endurance. 4 × 2K. Best effort.'),
    time(3, 30, `${SS} 30 min steady.`),
    dist(4, 10000, OPT, true),
    iv(5, 4, 1000, 3, `Speed work. ${OPT}`, true),
  ]},
  // Week 19: Day1=10000m, Day2=5×800m/2min, Day3=3×10min/2min, [Day4=30min], [Day5=4×2000m/4min]
  { week: 19, sessions: [
    dist(1, 10000, `${SS} Slightly shorter this week.`),
    iv(2, 5, 800, 2, 'Speed work. 5 × 800m.'),
    ivTime(3, 3, 10, 2, 'Endurance intervals. 3 × 10 min.'),
    time(4, 30, OPT, true),
    iv(5, 4, 2000, 4, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 20: Day1=12000m, Day2=5×1500m/3min, Day3=30min, [Day4=10000m], [Day5=8×500m/2min]
  { week: 20, sessions: [
    dist(1, 12000, `${SS} Longest piece. 12K.`),
    iv(2, 5, 1500, 3, 'Speed endurance. 5 × 1500m.'),
    time(3, 30, `${SS} 30 min steady.`),
    dist(4, 10000, OPT, true),
    iv(5, 8, 500, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 21: Day1=10000m, Day2=4×1000m/3min, Day3=4×8min/2min, [Day4=12000m], [Day5=5×1500m/3min]
  { week: 21, sessions: [
    dist(1, 10000, SS),
    iv(2, 4, 1000, 3, 'Speed work. 4 × 1000m.'),
    ivTime(3, 4, 8, 2, 'Endurance intervals. 4 × 8 min.'),
    dist(4, 12000, OPT, true),
    iv(5, 5, 1500, 3, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 22: Day1=12000m, Day2=4×2000m/4min, Day3=30min, [Day4=3×10min/2min], [Day5=5×800m/2min]
  { week: 22, sessions: [
    dist(1, 12000, `${SS} 12K.`),
    iv(2, 4, 2000, 4, 'Speed endurance. 4 × 2K.'),
    time(3, 30, `${SS} 30 min steady.`),
    ivTime(4, 3, 10, 2, `Endurance intervals. ${OPT}`, true),
    iv(5, 5, 800, 2, `Speed work. ${OPT}`, true),
  ]},
  // Week 23: Day1=10000m, Day2=8×500m/2min, Day3=2×15min/2min, [Day4=10000m], [Day5=4×2000m/4min]
  { week: 23, sessions: [
    dist(1, 10000, SS),
    iv(2, 8, 500, 2, 'Speed work. 8 × 500m. Final speed session.'),
    ivTime(3, 2, 15, 2, 'Endurance intervals. 2 × 15 min.'),
    dist(4, 10000, OPT, true),
    iv(5, 4, 2000, 4, `Speed endurance. ${OPT}`, true),
  ]},
  // Week 24: Day1=12000m, Day2=5×1500m/3min, Day3=30min, [Day4=2×15min/2min], [Day5=4×1000m/3min]
  { week: 24, sessions: [
    dist(1, 12000, `${SS} Final long piece. How far you've come.`),
    iv(2, 5, 1500, 3, 'Speed endurance. 5 × 1500m. Leave it all on the erg.'),
    time(3, 30, `${SS} Final 30 min steady. Reflect on 24 weeks of progress.`),
    ivTime(4, 2, 15, 2, `Endurance intervals. ${OPT}`, true),
    iv(5, 4, 1000, 3, `Speed work. ${OPT}`, true),
  ]},
];

export const PETE_PLAN = {
  name: 'Pete Plan',
  type: 'structured' as const,
  weeks: PETE_PLAN_WEEKS,
};

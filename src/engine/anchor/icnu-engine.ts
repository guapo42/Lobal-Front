/**
 * ICNU Weighting Engine
 *
 * Translates professional requirements into neurochemical triggers.
 * Instead of abstract "importance," uses four dimensions that map
 * to how an interest-based nervous system actually activates:
 *
 *   FocusScore = (w₁·I + w₂·C + w₃·N + w₄·U) / Σw
 *
 * The weights shift based on the user's current energy/dopamine
 * level, so the "right" task surfaces for the current brain state.
 */

export interface ICNUScores {
  interest: number;   // 0-10: hyper-focus magnet
  challenge: number;  // 0-10: problem-solving complexity
  novelty: number;    // 0-10: new project / tech stack
  urgency: number;    // 0-10: deadline proximity
}

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Weight profiles for each energy level.
 * Low energy → lean on urgency (must-do) with low complexity.
 * High energy → lean on interest + challenge (want-to-do).
 */
const ENERGY_WEIGHTS: Record<EnergyLevel, { wI: number; wC: number; wN: number; wU: number }> = {
  1: { wI: 0.10, wC: 0.05, wN: 0.05, wU: 0.80 }, // Survival mode: only urgent, simple tasks
  2: { wI: 0.15, wC: 0.10, wN: 0.10, wU: 0.65 }, // Low battery: urgent + slightly interesting
  3: { wI: 0.25, wC: 0.25, wN: 0.20, wU: 0.30 }, // Balanced: all dimensions roughly equal
  4: { wI: 0.35, wC: 0.30, wN: 0.20, wU: 0.15 }, // High gear: interest + challenge lead
  5: { wI: 0.35, wC: 0.30, wN: 0.25, wU: 0.10 }, // Hyperfocus: novelty + challenge peak
};

/**
 * Calculate the Focus Score for a task at a given energy level.
 * Returns a value between 0.0 and 1.0.
 */
export function calculateFocusScore(
  icnu: ICNUScores,
  energy: EnergyLevel
): number {
  const w = ENERGY_WEIGHTS[energy];
  const raw =
    w.wI * icnu.interest +
    w.wC * icnu.challenge +
    w.wN * icnu.novelty +
    w.wU * icnu.urgency;

  // Normalize: max possible raw = 10 (all scores at 10, weights sum to 1)
  return Math.min(1, Math.max(0, raw / 10));
}

/**
 * Rank tasks by Focus Score at the current energy level.
 * Returns tasks sorted descending by score with the score attached.
 */
export function rankTasks<T extends { icnu_score: ICNUScores }>(
  tasks: T[],
  energy: EnergyLevel
): (T & { focusScore: number })[] {
  return tasks
    .map((task) => ({
      ...task,
      focusScore: calculateFocusScore(task.icnu_score, energy),
    }))
    .sort((a, b) => b.focusScore - a.focusScore);
}

/**
 * Filter tasks that match the current energy level.
 *
 * Energy 1-2: Only show tasks with high urgency + low challenge
 * Energy 3:   Show all tasks above threshold
 * Energy 4-5: Highlight high challenge + interest tasks
 */
export function filterByEnergy<T extends { icnu_score: ICNUScores }>(
  tasks: T[],
  energy: EnergyLevel
): T[] {
  if (energy <= 2) {
    // Low energy: urgent but not complex
    return tasks.filter(
      (t) => t.icnu_score.urgency >= 5 && t.icnu_score.challenge <= 6
    );
  }

  if (energy >= 4) {
    // High energy: interesting or challenging
    return tasks.filter(
      (t) => t.icnu_score.interest >= 5 || t.icnu_score.challenge >= 5
    );
  }

  // Balanced: show everything
  return tasks;
}

/**
 * Calculate the visual "wedge expansion" factor for the Radial Dial.
 * Tasks with higher Focus Scores get proportionally wider wedges,
 * pulling the eye toward tasks the brain is most likely to engage with.
 *
 * Returns a multiplier (0.5x to 2.0x of base width).
 */
export function wedgeExpansion(focusScore: number): number {
  // Map 0-1 score to 0.5-2.0 multiplier with ease-in curve
  return 0.5 + focusScore * focusScore * 1.5;
}

/**
 * Get the energy weight profile for display purposes.
 */
export function getWeightProfile(energy: EnergyLevel) {
  return ENERGY_WEIGHTS[energy];
}

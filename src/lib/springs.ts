/**
 * Shared spring physics configs for consistent "juicy" micro-interactions.
 * All interactive elements use these to feel weighted and bouncy.
 */

export const springs = {
  /** Button press / task complete — snappy, satisfying */
  snap: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 1 },

  /** Card expand / node select — medium weight */
  medium: { type: 'spring' as const, stiffness: 300, damping: 25, mass: 1 },

  /** Panel slide / overlay — smooth and deliberate */
  smooth: { type: 'spring' as const, stiffness: 200, damping: 28, mass: 1.2 },

  /** Breathing / pulsing — organic, 60bpm anchor */
  breathe: { type: 'spring' as const, stiffness: 30, damping: 10, mass: 2 },

  /** Bounce on completion — celebratory */
  bounce: { type: 'spring' as const, stiffness: 400, damping: 12, mass: 0.8 },
};

/**
 * 60bpm breathing cycle — 1 second per beat.
 * Used for the "Now" indicator and focus anchoring.
 */
export const BREATH_DURATION = 1;
export const BREATH_CYCLE = {
  duration: BREATH_DURATION,
  repeat: Infinity,
  ease: [0.45, 0, 0.55, 1] as [number, number, number, number], // sine-like ease
};

/**
 * Urgency color scale: Blue → Amber → Soft Crimson
 * Maps ICNU urgency (0-10) to a color.
 */
export function urgencyColor(urgency: number): string {
  if (urgency <= 3) return '#3b82f6';      // Electric blue — calm
  if (urgency <= 5) return '#6366f1';      // Indigo — moderate
  if (urgency <= 7) return '#f59e0b';      // Amber — rising
  if (urgency <= 8) return '#f97316';      // Orange — high
  return '#ef4444';                         // Soft crimson — critical
}

/**
 * Urgency background accent for peripheral cues.
 */
export function urgencyAccentBg(urgency: number): string {
  if (urgency <= 3) return 'rgba(59,130,246,0.08)';
  if (urgency <= 5) return 'rgba(99,102,241,0.08)';
  if (urgency <= 7) return 'rgba(245,158,11,0.08)';
  if (urgency <= 8) return 'rgba(249,115,22,0.08)';
  return 'rgba(239,68,68,0.08)';
}

/**
 * Variable font weight for attention direction.
 * Active content: 600, normal: 400, background: 300.
 */
export const fontWeights = {
  active: 600,
  normal: 400,
  background: 300,
} as const;

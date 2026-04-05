'use client';

/**
 * Behavioral Guardrails — HCI-Informed Deterministic Rules
 *
 * These are hard-coded rules that the Anchor engine enforces.
 * The LLM cannot override them. They exist to protect the ADHD
 * brain from its own impulses while respecting autonomy.
 */

// ── 1. The "Body Double" Protocol ──

interface BodyDoubleState {
  monitoring: boolean;
  tabSwitchCount: number;
  lastTabSwitch: number;
  onNudge: (() => void) | null;
  _cleanup?: () => void;
}

const bodyDouble: BodyDoubleState = {
  monitoring: false,
  tabSwitchCount: 0,
  lastTabSwitch: 0,
  onNudge: null,
};

/**
 * Start monitoring tab switches during DEEP_FOCUS.
 * Triggers a nudge callback when a switch is detected.
 */
export function startBodyDouble(onNudge: () => void): void {
  bodyDouble.monitoring = true;
  bodyDouble.tabSwitchCount = 0;
  bodyDouble.onNudge = onNudge;

  const handler = () => {
    if (!bodyDouble.monitoring) return;
    if (document.hidden) {
      bodyDouble.tabSwitchCount++;
      bodyDouble.lastTabSwitch = Date.now();
      console.log(
        `[Guardrail:BodyDouble] Tab switch #${bodyDouble.tabSwitchCount} during focus`
      );
      // Trigger nudge when they come back
    } else if (bodyDouble.lastTabSwitch > 0) {
      const awayMs = Date.now() - bodyDouble.lastTabSwitch;
      if (awayMs > 3000) {
        // Only nudge if they were away for >3s (not just a quick glance)
        bodyDouble.onNudge?.();
      }
    }
  };

  document.addEventListener('visibilitychange', handler);
  bodyDouble._cleanup = () => {
    document.removeEventListener('visibilitychange', handler);
  };
}

export function stopBodyDouble(): void {
  bodyDouble.monitoring = false;
  bodyDouble._cleanup?.();
}

export function getBodyDoubleStats() {
  return {
    tabSwitchCount: bodyDouble.tabSwitchCount,
    monitoring: bodyDouble.monitoring,
  };
}

// ── 2. The "Anti-Paralysis" Trigger ──

export interface AntiParalysisEntry {
  text: string;
  estimatedMinutes: number;
}

/**
 * Generate three trivially easy "micro-entry" tasks
 * when a task has been stuck in TASK_INITIATION for >20 min.
 *
 * These are deterministic (no LLM needed) — designed to be
 * so easy they bypass the Wall of Awful.
 */
export function generateAntiParalysisEntries(taskTitle: string): AntiParalysisEntry[] {
  return [
    {
      text: `Just open the workspace for "${taskTitle}"`,
      estimatedMinutes: 1,
    },
    {
      text: 'Write one sentence about what you need to do first',
      estimatedMinutes: 2,
    },
    {
      text: 'Set a 5-minute timer and do anything related',
      estimatedMinutes: 5,
    },
  ];
}

// ── 3. Visual Decay ──

/**
 * Calculate the visual opacity for a completed task.
 * Completed tasks fade over 24 hours instead of disappearing,
 * providing a "wins" record that satisfies the reward need.
 *
 * Returns opacity from 1.0 (just completed) to 0.15 (24h old).
 */
export function completedTaskOpacity(completedAt: number): number {
  const hoursAgo = (Date.now() - completedAt) / (60 * 60 * 1000);
  if (hoursAgo <= 0) return 1;
  if (hoursAgo >= 24) return 0.15;
  // Exponential decay: fast initial fade, slow tail
  return Math.max(0.15, Math.exp(-hoursAgo / 8));
}

/**
 * Should a completed task still be visible?
 * Returns false after 48 hours (fully faded + buffer).
 */
export function isCompletedTaskVisible(completedAt: number): boolean {
  return Date.now() - completedAt < 48 * 60 * 60 * 1000;
}

// ── 4. Focus Session Enforcement ──

/**
 * Check if the user should be prompted to take a break.
 * Suggests breaks at 25-minute intervals (Pomodoro-style).
 */
export function shouldSuggestBreak(focusStartedAt: number): boolean {
  const focusMinutes = (Date.now() - focusStartedAt) / 60_000;
  // Suggest at 25, 50, 75 min etc (but not in the first 20 min)
  return focusMinutes >= 25 && focusMinutes % 25 < 1;
}

// ── 5. Breadcrumb / Mental Snapshot Timer ──

let snapshotInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start capturing mental snapshots every 15 minutes.
 * The callback receives a request to save whatever the user
 * was doing at that moment.
 */
export function startSnapshotTimer(
  onSnapshot: (taskId: string | null) => void,
  getActiveTaskId: () => string | null
): void {
  stopSnapshotTimer();
  snapshotInterval = setInterval(() => {
    onSnapshot(getActiveTaskId());
  }, 15 * 60 * 1000);
}

export function stopSnapshotTimer(): void {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
}

/**
 * Finite State Machine for The External Lobe.
 *
 * States represent the user's cognitive mode. Transitions are
 * triggered by user actions or deterministic timers — never by
 * the LLM directly (the LLM can *suggest* transitions, but the
 * Anchor must validate and execute them).
 */

export type FSMState =
  | 'IDLE'
  | 'CAPTURE_MODE'
  | 'TASK_INITIATION'
  | 'DEEP_FOCUS'
  | 'BREAK'
  | 'REVIEW'
  | 'BRAIN_DUMP';

export type FSMEvent =
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_COMPLETE'; taskId?: string }
  | { type: 'BEGIN_TASK'; taskId: string }
  | { type: 'FOCUS_ACHIEVED' }
  | { type: 'FOCUS_BROKEN'; reason: 'tab_switch' | 'inactivity' | 'manual' }
  | { type: 'TAKE_BREAK' }
  | { type: 'BREAK_OVER' }
  | { type: 'START_REVIEW' }
  | { type: 'REVIEW_COMPLETE' }
  | { type: 'AIRLOCK_TRIGGER' }
  | { type: 'ANTI_PARALYSIS'; taskId: string }
  | { type: 'RESET' };

export interface FSMContext {
  state: FSMState;
  activeTaskId: string | null;
  focusStartedAt: number | null;
  focusMinutes: number;
  initiationStartedAt: number | null;
  breakStartedAt: number | null;
  transitionHistory: { from: FSMState; to: FSMState; event: FSMEvent['type']; at: number }[];
}

type TransitionTable = {
  [S in FSMState]?: {
    [E in FSMEvent['type']]?: FSMState;
  };
};

const TRANSITIONS: TransitionTable = {
  IDLE: {
    START_CAPTURE: 'CAPTURE_MODE',
    BEGIN_TASK: 'TASK_INITIATION',
    START_REVIEW: 'REVIEW',
    AIRLOCK_TRIGGER: 'BRAIN_DUMP',
  },
  CAPTURE_MODE: {
    CAPTURE_COMPLETE: 'IDLE',
    RESET: 'IDLE',
  },
  TASK_INITIATION: {
    FOCUS_ACHIEVED: 'DEEP_FOCUS',
    ANTI_PARALYSIS: 'TASK_INITIATION', // stays but triggers micro-actions
    START_CAPTURE: 'CAPTURE_MODE',
    RESET: 'IDLE',
  },
  DEEP_FOCUS: {
    FOCUS_BROKEN: 'IDLE',
    TAKE_BREAK: 'BREAK',
    START_CAPTURE: 'CAPTURE_MODE',
    RESET: 'IDLE',
  },
  BREAK: {
    BREAK_OVER: 'IDLE',
    START_CAPTURE: 'CAPTURE_MODE',
    RESET: 'IDLE',
  },
  REVIEW: {
    REVIEW_COMPLETE: 'IDLE',
    START_CAPTURE: 'CAPTURE_MODE',
    RESET: 'IDLE',
  },
  BRAIN_DUMP: {
    CAPTURE_COMPLETE: 'IDLE',
    RESET: 'IDLE',
  },
};

export function createFSMContext(): FSMContext {
  return {
    state: 'IDLE',
    activeTaskId: null,
    focusStartedAt: null,
    focusMinutes: 0,
    initiationStartedAt: null,
    breakStartedAt: null,
    transitionHistory: [],
  };
}

export function transition(ctx: FSMContext, event: FSMEvent): FSMContext {
  const stateTransitions = TRANSITIONS[ctx.state];
  const nextState = stateTransitions?.[event.type];

  if (!nextState) {
    console.warn(
      `[Anchor:FSM] Invalid transition: ${ctx.state} + ${event.type} — ignoring`
    );
    return ctx;
  }

  const now = Date.now();
  const next: FSMContext = {
    ...ctx,
    state: nextState,
    transitionHistory: [
      ...ctx.transitionHistory.slice(-50), // cap history
      { from: ctx.state, to: nextState, event: event.type, at: now },
    ],
  };

  // Side-effect context updates based on event type
  switch (event.type) {
    case 'BEGIN_TASK':
      next.activeTaskId = event.taskId;
      next.initiationStartedAt = now;
      next.focusStartedAt = null;
      break;

    case 'FOCUS_ACHIEVED':
      next.focusStartedAt = now;
      next.initiationStartedAt = null;
      break;

    case 'FOCUS_BROKEN':
      if (ctx.focusStartedAt) {
        next.focusMinutes += Math.floor((now - ctx.focusStartedAt) / 60_000);
      }
      next.focusStartedAt = null;
      break;

    case 'TAKE_BREAK':
      if (ctx.focusStartedAt) {
        next.focusMinutes += Math.floor((now - ctx.focusStartedAt) / 60_000);
      }
      next.focusStartedAt = null;
      next.breakStartedAt = now;
      break;

    case 'BREAK_OVER':
      next.breakStartedAt = null;
      break;

    case 'CAPTURE_COMPLETE':
      if ('taskId' in event && event.taskId) {
        next.activeTaskId = event.taskId;
      }
      break;

    case 'RESET':
      next.activeTaskId = null;
      next.focusStartedAt = null;
      next.initiationStartedAt = null;
      next.breakStartedAt = null;
      break;
  }

  console.log(`[Anchor:FSM] ${ctx.state} → ${nextState} (via ${event.type})`);
  return next;
}

/**
 * Check if a task has been stuck in TASK_INITIATION for >20 minutes.
 * Returns true if Anti-Paralysis should trigger.
 */
export function shouldTriggerAntiParalysis(ctx: FSMContext): boolean {
  if (ctx.state !== 'TASK_INITIATION' || !ctx.initiationStartedAt) return false;
  return Date.now() - ctx.initiationStartedAt > 20 * 60_000;
}

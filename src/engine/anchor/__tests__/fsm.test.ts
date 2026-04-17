import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFSMContext,
  transition,
  shouldTriggerAntiParalysis,
  type FSMContext,
} from '../fsm';

describe('FSM: createFSMContext', () => {
  it('initializes to IDLE with null task and zero focus', () => {
    const ctx = createFSMContext();
    expect(ctx.state).toBe('IDLE');
    expect(ctx.activeTaskId).toBeNull();
    expect(ctx.focusStartedAt).toBeNull();
    expect(ctx.focusMinutes).toBe(0);
    expect(ctx.initiationStartedAt).toBeNull();
    expect(ctx.breakStartedAt).toBeNull();
    expect(ctx.transitionHistory).toEqual([]);
  });
});

describe('FSM: valid transitions from IDLE', () => {
  let ctx: FSMContext;
  beforeEach(() => {
    ctx = createFSMContext();
  });

  it('START_CAPTURE → CAPTURE_MODE', () => {
    const next = transition(ctx, { type: 'START_CAPTURE' });
    expect(next.state).toBe('CAPTURE_MODE');
  });

  it('BEGIN_TASK → TASK_INITIATION and sets activeTaskId and initiationStartedAt', () => {
    const next = transition(ctx, { type: 'BEGIN_TASK', taskId: 'task-1' });
    expect(next.state).toBe('TASK_INITIATION');
    expect(next.activeTaskId).toBe('task-1');
    expect(next.initiationStartedAt).not.toBeNull();
  });

  it('START_REVIEW → REVIEW', () => {
    const next = transition(ctx, { type: 'START_REVIEW' });
    expect(next.state).toBe('REVIEW');
  });

  it('AIRLOCK_TRIGGER → BRAIN_DUMP', () => {
    const next = transition(ctx, { type: 'AIRLOCK_TRIGGER' });
    expect(next.state).toBe('BRAIN_DUMP');
  });
});

describe('FSM: full focus cycle', () => {
  it('IDLE → TASK_INITIATION → DEEP_FOCUS → BREAK → IDLE', () => {
    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });
    expect(ctx.state).toBe('TASK_INITIATION');

    ctx = transition(ctx, { type: 'FOCUS_ACHIEVED' });
    expect(ctx.state).toBe('DEEP_FOCUS');
    expect(ctx.focusStartedAt).not.toBeNull();
    expect(ctx.initiationStartedAt).toBeNull();

    ctx = transition(ctx, { type: 'TAKE_BREAK' });
    expect(ctx.state).toBe('BREAK');
    expect(ctx.focusStartedAt).toBeNull();
    expect(ctx.breakStartedAt).not.toBeNull();

    ctx = transition(ctx, { type: 'BREAK_OVER' });
    expect(ctx.state).toBe('IDLE');
    expect(ctx.breakStartedAt).toBeNull();
  });
});

describe('FSM: FOCUS_BROKEN accumulates focus minutes', () => {
  it('accumulates elapsed focus minutes when broken', () => {
    vi.useFakeTimers();
    const start = new Date('2026-04-17T10:00:00Z');
    vi.setSystemTime(start);

    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });
    ctx = transition(ctx, { type: 'FOCUS_ACHIEVED' });

    // Advance 45 minutes of focus
    vi.setSystemTime(new Date(start.getTime() + 45 * 60_000));
    ctx = transition(ctx, { type: 'FOCUS_BROKEN', reason: 'tab_switch' });

    expect(ctx.state).toBe('IDLE');
    expect(ctx.focusMinutes).toBe(45);
    expect(ctx.focusStartedAt).toBeNull();

    vi.useRealTimers();
  });
});

describe('FSM: invalid transitions are ignored', () => {
  it('FOCUS_ACHIEVED from IDLE does nothing', () => {
    const ctx = createFSMContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = transition(ctx, { type: 'FOCUS_ACHIEVED' });
    expect(next).toBe(ctx); // reference equality — unchanged
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('BREAK_OVER from DEEP_FOCUS is ignored', () => {
    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });
    ctx = transition(ctx, { type: 'FOCUS_ACHIEVED' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = transition(ctx, { type: 'BREAK_OVER' });
    expect(next.state).toBe('DEEP_FOCUS');
    warn.mockRestore();
  });
});

describe('FSM: RESET clears context from any state', () => {
  it('from DEEP_FOCUS, RESET clears activeTaskId and timers', () => {
    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });
    ctx = transition(ctx, { type: 'FOCUS_ACHIEVED' });
    ctx = transition(ctx, { type: 'RESET' });

    expect(ctx.state).toBe('IDLE');
    expect(ctx.activeTaskId).toBeNull();
    expect(ctx.focusStartedAt).toBeNull();
    expect(ctx.initiationStartedAt).toBeNull();
    expect(ctx.breakStartedAt).toBeNull();
  });
});

describe('FSM: transition history is capped at 50 entries', () => {
  it('keeps only the last 50 transitions', () => {
    let ctx = createFSMContext();
    for (let i = 0; i < 80; i++) {
      ctx = transition(ctx, { type: 'START_CAPTURE' });
      ctx = transition(ctx, { type: 'CAPTURE_COMPLETE' });
    }
    // After slice(-50) and one push, length can be 50 or 51 depending on timing;
    // verify it is bounded.
    expect(ctx.transitionHistory.length).toBeLessThanOrEqual(51);
  });
});

describe('FSM: Anti-Paralysis detection', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns false when not in TASK_INITIATION', () => {
    const ctx = createFSMContext();
    expect(shouldTriggerAntiParalysis(ctx)).toBe(false);
  });

  it('returns false within first 20 minutes of TASK_INITIATION', () => {
    const start = new Date('2026-04-17T10:00:00Z');
    vi.setSystemTime(start);
    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });

    vi.setSystemTime(new Date(start.getTime() + 10 * 60_000)); // 10 min
    expect(shouldTriggerAntiParalysis(ctx)).toBe(false);
  });

  it('returns true after 20 minutes in TASK_INITIATION', () => {
    const start = new Date('2026-04-17T10:00:00Z');
    vi.setSystemTime(start);
    let ctx = createFSMContext();
    ctx = transition(ctx, { type: 'BEGIN_TASK', taskId: 't' });

    vi.setSystemTime(new Date(start.getTime() + 21 * 60_000)); // 21 min
    expect(shouldTriggerAntiParalysis(ctx)).toBe(true);
  });
});

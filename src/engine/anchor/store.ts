'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type FSMState,
  type FSMEvent,
  type FSMContext,
  createFSMContext,
  transition,
  shouldTriggerAntiParalysis,
} from './fsm';

/**
 * The Anchor Store — deterministic state management.
 *
 * This is the single source of truth for the app's cognitive state.
 * The LLM (Translator) can suggest changes, but only the Anchor
 * can write them after schema validation.
 */

interface MentalSnapshot {
  id: string;
  text: string;
  taskId: string | null;
  at: number;
}

interface ReviewFlag {
  id: string;
  source: 'llm_output' | 'schema_violation' | 'unknown_tool';
  message: string;
  data: Record<string, unknown>;
  at: number;
  resolved: boolean;
}

interface AnchorState {
  fsm: FSMContext;
  snapshots: MentalSnapshot[];
  reviewFlags: ReviewFlag[];
  focusStreak: number; // consecutive days with 25+ focus minutes
  dailyFocusMinutes: number;
  // Body Double nudge: counter increments on each nudge event,
  // components subscribe to it to show a transient overlay.
  bodyDoubleNudgeCount: number;

  // Actions
  dispatch: (event: FSMEvent) => void;
  addSnapshot: (text: string, taskId: string | null) => void;
  addReviewFlag: (flag: Omit<ReviewFlag, 'id' | 'at' | 'resolved'>) => void;
  resolveFlag: (id: string) => void;
  checkAntiParalysis: () => boolean;
  getCurrentState: () => FSMState;
  resetDaily: () => void;
  triggerBodyDoubleNudge: () => void;
}

export const useAnchorStore = create<AnchorState>()(
  persist(
    (set, get) => ({
      fsm: createFSMContext(),
      snapshots: [],
      reviewFlags: [],
      focusStreak: 0,
      dailyFocusMinutes: 0,
      bodyDoubleNudgeCount: 0,

      dispatch: (event) =>
        set((s) => {
          const next = transition(s.fsm, event);
          return {
            fsm: next,
            dailyFocusMinutes: next.focusMinutes,
          };
        }),

      addSnapshot: (text, taskId) =>
        set((s) => ({
          snapshots: [
            ...s.snapshots.slice(-100), // keep last 100
            {
              id: crypto.randomUUID(),
              text,
              taskId,
              at: Date.now(),
            },
          ],
        })),

      addReviewFlag: (flag) =>
        set((s) => ({
          reviewFlags: [
            ...s.reviewFlags,
            {
              ...flag,
              id: crypto.randomUUID(),
              at: Date.now(),
              resolved: false,
            },
          ],
        })),

      resolveFlag: (id) =>
        set((s) => ({
          reviewFlags: s.reviewFlags.map((f) =>
            f.id === id ? { ...f, resolved: true } : f
          ),
        })),

      checkAntiParalysis: () => {
        return shouldTriggerAntiParalysis(get().fsm);
      },

      getCurrentState: () => get().fsm.state,

      resetDaily: () =>
        set((s) => ({
          fsm: { ...s.fsm, focusMinutes: 0 },
          dailyFocusMinutes: 0,
          snapshots: [],
        })),

      triggerBodyDoubleNudge: () =>
        set((s) => ({ bodyDoubleNudgeCount: s.bodyDoubleNudgeCount + 1 })),
    }),
    {
      name: 'external-lobe-anchor',
    }
  )
);

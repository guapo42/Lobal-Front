'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UndoEntry {
  timestamp: number;
  action: string;
  snapshot: string; // JSON snapshot of the changed data
  undone: boolean;
}

interface UndoState {
  history: UndoEntry[];
  pushUndo: (action: string, snapshot: string) => void;
  undoTo: (timestamp: number) => void;
  clearOld: () => void;
}

const ONE_HOUR = 60 * 60 * 1000;

export const useUndoHistory = create<UndoState>()(
  persist(
    (set) => ({
      history: [],

      pushUndo: (action, snapshot) =>
        set((s) => ({
          history: [
            ...s.history,
            { timestamp: Date.now(), action, snapshot, undone: false },
          ].slice(-200), // cap at 200 entries
        })),

      undoTo: (timestamp) =>
        set((s) => ({
          history: s.history.map((h) =>
            h.timestamp >= timestamp ? { ...h, undone: true } : h
          ),
        })),

      clearOld: () =>
        set((s) => ({
          history: s.history.filter(
            (h) => Date.now() - h.timestamp < ONE_HOUR
          ),
        })),
    }),
    { name: 'external-lobe-undo' }
  )
);

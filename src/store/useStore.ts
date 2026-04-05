'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, CapturedThought } from '@/types';

interface AppState {
  tasks: Task[];
  captures: CapturedThought[];
  selectedTaskId: string | null;
  captureOverlayOpen: boolean;
  hasCapturedToday: boolean;

  // Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addCapture: (capture: CapturedThought) => void;
  setSelectedTask: (id: string | null) => void;
  setCaptureOverlayOpen: (open: boolean) => void;
  setHasCapturedToday: (value: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: [],
      captures: [],
      selectedTaskId: null,
      captureOverlayOpen: false,
      hasCapturedToday: false,

      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      addCapture: (capture) =>
        set((state) => ({
          captures: [...state.captures, capture],
          hasCapturedToday: true,
        })),

      setSelectedTask: (id) => set({ selectedTaskId: id }),

      setCaptureOverlayOpen: (open) => set({ captureOverlayOpen: open }),

      setHasCapturedToday: (value) => set({ hasCapturedToday: value }),
    }),
    {
      name: 'external-lobe-storage',
    }
  )
);

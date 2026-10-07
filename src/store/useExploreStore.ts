'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CaptureVariation = '1.1-modal' | '1.2-command-line' | '1.3-gesture-canvas';
export type TimeVariation = '2.1-radial' | '2.2-linear-flow' | '2.3-stacked-blocks';
export type BrainVariation = '3.1-split-screen' | '3.2-infinite-notebook' | '3.3-terminal';

interface ExploreNote {
  id: string;
  text: string;
  x?: number;
  y?: number;
  linkedTo?: string[];
  tags?: string[];
  created_at: string;
}

interface ExploreState {
  // Active variations
  captureVariation: CaptureVariation;
  timeVariation: TimeVariation;
  brainVariation: BrainVariation;

  // Shared captured items
  captures: { id: string; text: string; captured_at: string; category?: string }[];
  notes: ExploreNote[];

  // Actions
  setCaptureVariation: (v: CaptureVariation) => void;
  setTimeVariation: (v: TimeVariation) => void;
  setBrainVariation: (v: BrainVariation) => void;
  addCapture: (text: string, category?: string) => void;
  addNote: (note: ExploreNote) => void;
  updateNote: (id: string, updates: Partial<ExploreNote>) => void;
  linkNotes: (fromId: string, toId: string) => void;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set) => ({
      captureVariation: '1.1-modal',
      timeVariation: '2.1-radial',
      brainVariation: '3.1-split-screen',
      captures: [],
      notes: [],

      setCaptureVariation: (v) => set({ captureVariation: v }),
      setTimeVariation: (v) => set({ timeVariation: v }),
      setBrainVariation: (v) => set({ brainVariation: v }),

      addCapture: (text, category) =>
        set((s) => ({
          captures: [
            ...s.captures,
            {
              id: crypto.randomUUID(),
              text,
              captured_at: new Date().toISOString(),
              category,
            },
          ],
        })),

      addNote: (note) =>
        set((s) => ({ notes: [...s.notes, note] })),

      updateNote: (id, updates) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

      linkNotes: (fromId, toId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === fromId
              ? { ...n, linkedTo: [...(n.linkedTo || []), toId] }
              : n
          ),
        })),
    }),
    { name: 'external-lobe-explore' }
  )
);

'use client';

import { useEffect } from 'react';
import type { Task } from '@/types';
import { useAnchorStore } from '@/engine/anchor/store';
import type { FSMState } from '@/engine/anchor/fsm';
import {
  startBodyDouble,
  stopBodyDouble,
  startSnapshotTimer,
  stopSnapshotTimer,
} from '@/engine/anchor/guardrails';

interface Capture {
  id: string;
  text: string;
  captured_at: string;
}

interface DashboardEffectsArgs {
  fsmState: FSMState;
  tasks: Task[];
  activeTask: Task | null;
  captures: Capture[];
  setShowAntiParalysis: (show: boolean) => void;
  saveContext: (lastText: string, activeTaskTitle: string, openLoops: string[]) => void;
}

/**
 * Orchestrates the dashboard's four cross-cutting side-effects so
 * the main Home component stays focused on data flow + layout:
 *
 * 1. Body Double Protocol — tab-switch nudge during DEEP_FOCUS
 * 2. Mental Snapshot Timer — breadcrumbs every 15 min during focus
 * 3. Anti-Paralysis Check — surfaces overlay if stuck > 20 min
 * 4. Resumption Context Save — persists on tab hidden
 */
export function useDashboardEffects({
  fsmState,
  tasks,
  activeTask,
  captures,
  setShowAntiParalysis,
  saveContext,
}: DashboardEffectsArgs) {
  const triggerBodyDoubleNudge = useAnchorStore((s) => s.triggerBodyDoubleNudge);
  const addSnapshot = useAnchorStore((s) => s.addSnapshot);
  const checkAntiParalysis = useAnchorStore((s) => s.checkAntiParalysis);

  // 1. Body Double — tab-switch nudge during DEEP_FOCUS
  useEffect(() => {
    if (fsmState !== 'DEEP_FOCUS') return;
    startBodyDouble(triggerBodyDoubleNudge);
    return () => stopBodyDouble();
  }, [fsmState, triggerBodyDoubleNudge]);

  // 2. Mental Snapshot Timer during focus / initiation
  useEffect(() => {
    if (fsmState !== 'DEEP_FOCUS' && fsmState !== 'TASK_INITIATION') return;
    startSnapshotTimer(
      (taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        addSnapshot(
          task ? `Working on: ${task.title}` : 'Focused session in progress',
          taskId
        );
      },
      () => useAnchorStore.getState().fsm.activeTaskId
    );
    return () => stopSnapshotTimer();
  }, [fsmState, tasks, addSnapshot]);

  // 3. Anti-Paralysis check on a 30s cadence while in TASK_INITIATION
  useEffect(() => {
    if (fsmState !== 'TASK_INITIATION') {
      setShowAntiParalysis(false);
      return;
    }
    const interval = setInterval(() => {
      if (checkAntiParalysis()) setShowAntiParalysis(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fsmState, checkAntiParalysis, setShowAntiParalysis]);

  // 4. Save resumption context whenever the tab becomes hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) return;
      const lastCapture = captures[captures.length - 1];
      saveContext(
        lastCapture?.text || '',
        activeTask?.title || '',
        tasks.filter((t) => t.status === 'active').map((t) => t.title)
      );
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [captures, activeTask, tasks, saveContext]);
}

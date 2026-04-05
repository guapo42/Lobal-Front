'use client';

import { useEffect, useState, useCallback } from 'react';

interface ResumptionContext {
  lastText: string;        // Last 50 chars typed
  activeTaskTitle: string; // One-sentence intent
  openLoops: string[];     // Unresolved sub-tasks from last 5 min
  leftAt: number;          // Timestamp when user left
}

const STORAGE_KEY = 'external-lobe-resumption';
const ABSENCE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Tracks user departure and returns resumption context
 * when they come back after 10+ minutes.
 */
export function useResumption() {
  const [showResumption, setShowResumption] = useState(false);
  const [context, setContext] = useState<ResumptionContext | null>(null);

  // On mount, check if we have a saved departure context
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ResumptionContext = JSON.parse(stored);
        const absenceMs = Date.now() - parsed.leftAt;
        if (absenceMs >= ABSENCE_THRESHOLD_MS) {
          setContext(parsed);
          setShowResumption(true);
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save departure context when tab becomes hidden
  const saveContext = useCallback(
    (lastText: string, activeTaskTitle: string, openLoops: string[]) => {
      const ctx: ResumptionContext = {
        lastText: lastText.slice(-50),
        activeTaskTitle,
        openLoops,
        leftAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    },
    []
  );

  const dismiss = useCallback(() => {
    setShowResumption(false);
    setContext(null);
  }, []);

  return { showResumption, context, saveContext, dismiss };
}

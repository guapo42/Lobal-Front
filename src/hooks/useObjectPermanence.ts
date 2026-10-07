'use client';

import { useEffect, useRef, useState } from 'react';

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Detects user inactivity and triggers a pulse state
 * for the "Object Permanence" fix on active tasks.
 */
export function useObjectPermanence(): boolean {
  const [shouldPulse, setShouldPulse] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      setShouldPulse(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShouldPulse(true);
      }, INACTIVITY_THRESHOLD_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return shouldPulse;
}

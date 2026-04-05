'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FocusSession {
  startedAt: number;
  totalFocusMs: number;
  isActive: boolean;
}

/**
 * Tracks continuous focus time (tab visible, no switching).
 * Returns focus minutes and a normalized "ember" intensity (0-1).
 */
export function useFocusEmber() {
  const [focusMs, setFocusMs] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const sessionRef = useRef<FocusSession>({
    startedAt: Date.now(),
    totalFocusMs: 0,
    isActive: true,
  });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTracking = useCallback(() => {
    sessionRef.current.startedAt = Date.now();
    sessionRef.current.isActive = true;
    setIsActive(true);
  }, []);

  const pauseTracking = useCallback(() => {
    if (sessionRef.current.isActive) {
      sessionRef.current.totalFocusMs += Date.now() - sessionRef.current.startedAt;
      sessionRef.current.isActive = false;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        pauseTracking();
      } else {
        startTracking();
      }
    };

    const handleBlur = () => pauseTracking();
    const handleFocus = () => startTracking();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Tick every second to update displayed time
    tickRef.current = setInterval(() => {
      const current = sessionRef.current.isActive
        ? sessionRef.current.totalFocusMs + (Date.now() - sessionRef.current.startedAt)
        : sessionRef.current.totalFocusMs;
      setFocusMs(current);
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [startTracking, pauseTracking]);

  const focusMinutes = Math.floor(focusMs / 60_000);
  // Ember intensity: ramps from 0 to 1 over 30 minutes, stays at 1
  const emberIntensity = Math.min(1, focusMs / (30 * 60_000));

  return { focusMinutes, focusMs, emberIntensity, isActive };
}

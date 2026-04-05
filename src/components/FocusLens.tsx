'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Focus Lens — press Z to zoom into the main content area.
 * Everything else (graph, sidebar, clock) fades to 5% opacity.
 * Press Z again or Escape to exit.
 */
export default function FocusLens({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => setActive((a) => !a), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && active) {
        setActive(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, toggle]);

  return (
    <div className="relative">
      {/* Dimming overlay for everything outside the lens target */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.92)' }}
          />
        )}
      </AnimatePresence>

      {/* Children get elevated above the overlay when lens is active */}
      <div className={active ? 'relative z-40' : ''}>
        {children}
      </div>

      {/* Indicator */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-400 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Focus Mode — press Z or Esc to exit
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

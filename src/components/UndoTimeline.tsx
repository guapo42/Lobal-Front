'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndoHistory } from '@/store/useUndoHistory';
import { springs } from '@/lib/springs';

/**
 * Scrubbable timeline of all changes in the last hour.
 * Allows instant recovery from "rabbit hole" distractions.
 * Toggle with Ctrl+Z (shows panel) or use the button.
 */
export default function UndoTimeline() {
  const [open, setOpen] = useState(false);
  const { history, undoTo } = useUndoHistory();

  // Only show last hour, non-undone first
  const recent = history
    .filter((h) => Date.now() - h.timestamp < 60 * 60 * 1000)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (recent.length === 0 && !open) return null;

  return (
    <>
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={springs.snap}
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 left-4 z-40 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        {open ? 'Close' : `History (${recent.length})`}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={springs.medium}
            className="fixed bottom-12 left-4 z-40 w-72 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
          >
            <div className="px-3 py-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <span className="text-xs font-medium text-zinc-400">
                Undo Timeline — last hour
              </span>
            </div>
            <div className="p-2 space-y-1">
              {recent.length === 0 && (
                <div className="text-xs text-zinc-600 text-center py-3">
                  No changes recorded yet
                </div>
              )}
              {recent.map((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                return (
                  <div
                    key={entry.timestamp}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                      entry.undone
                        ? 'bg-zinc-800/50 text-zinc-600 line-through'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!entry.undone) undoTo(entry.timestamp);
                    }}
                  >
                    <span className="text-zinc-500 shrink-0">{time}</span>
                    <span className="truncate">{entry.action}</span>
                    {!entry.undone && (
                      <span className="ml-auto text-[9px] text-indigo-400 shrink-0">
                        undo
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

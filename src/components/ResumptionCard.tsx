'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/springs';

interface ResumptionContext {
  lastText: string;
  activeTaskTitle: string;
  openLoops: string[];
  leftAt: number;
}

interface ResumptionCardProps {
  show: boolean;
  context: ResumptionContext | null;
  onDismiss: () => void;
}

function formatAbsence(leftAt: number): string {
  const mins = Math.round((Date.now() - leftAt) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

/**
 * "Context Snapshot" — shown when user returns after 10+ minutes.
 * Displays last text, active task intent, and open loops to
 * restore working memory context.
 */
export default function ResumptionCard({ show, context, onDismiss }: ResumptionCardProps) {
  return (
    <AnimatePresence>
      {show && context && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={springs.medium}
            className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Welcome back</h2>
                <span className="text-xs text-zinc-500">
                  Left {formatAbsence(context.leftAt)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Here&apos;s where you left off
              </p>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4">
              {/* The Intent */}
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Active Task
                </div>
                <div className="text-sm text-white font-medium" style={{ fontWeight: 600 }}>
                  {context.activeTaskTitle || 'No active task'}
                </div>
              </div>

              {/* The Last Line */}
              {context.lastText && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Last thing typed
                  </div>
                  <div className="text-sm text-zinc-300 font-mono bg-zinc-800 px-3 py-2 rounded-lg truncate">
                    ...{context.lastText}
                  </div>
                </div>
              )}

              {/* Open Loops */}
              {context.openLoops.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Open Loops
                  </div>
                  <ul className="space-y-1">
                    {context.openLoops.map((loop, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-amber-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {loop}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.snap}
                onClick={onDismiss}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm rounded-xl transition-colors"
              >
                Resume Working
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

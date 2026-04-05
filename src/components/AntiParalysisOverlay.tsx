'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/springs';
import { generateAntiParalysisEntries } from '@/engine/anchor/guardrails';

/**
 * Anti-Paralysis Overlay — appears when a task has been stuck
 * in TASK_INITIATION for >20 minutes.
 *
 * Shows three trivially easy micro-entry actions designed to
 * bypass the "Wall of Awful" with minimal activation energy.
 */
interface AntiParalysisOverlayProps {
  show: boolean;
  taskTitle: string;
  onDismiss: () => void;
  onStartAction: (text: string) => void;
}

export default function AntiParalysisOverlay({
  show,
  taskTitle,
  onDismiss,
  onStartAction,
}: AntiParalysisOverlayProps) {
  const entries = generateAntiParalysisEntries(taskTitle);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={springs.medium}
            className="w-full max-w-sm bg-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-amber-500/5">
              <h2 className="text-base font-wt-active text-white">
                Stuck? Start tiny.
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                &quot;{taskTitle}&quot; has been waiting 20+ minutes. Pick one:
              </p>
            </div>

            {/* Micro-entry actions */}
            <div className="p-4 space-y-2">
              {entries.map((entry, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springs.snap, delay: i * 0.1 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onStartAction(entry.text)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left transition-colors"
                >
                  <span className="text-lg">
                    {i === 0 ? '👆' : i === 1 ? '✏️' : '⏱'}
                  </span>
                  <div>
                    <p className="text-sm text-white font-wt-normal">{entry.text}</p>
                    <p className="text-[10px] text-zinc-500">
                      ~{entry.estimatedMinutes} min
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Dismiss */}
            <div className="px-4 pb-4">
              <button
                onClick={onDismiss}
                className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                I&apos;ll figure it out myself
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, BREATH_CYCLE } from '@/lib/springs';
import type { Task } from '@/types';

/**
 * The Activation Bridge — lowers the "Wall of Awful" using B=MAP.
 *
 * When a task is selected for focus:
 * 1. Everything else VANISHES (UI lock)
 * 2. Only 3 micro-entry tasks are visible (< 2 min each)
 * 3. User must complete all 3 before Deep Focus timer starts
 * 4. Momentum from completing micro-tasks carries into real work
 */

interface MicroEntry {
  id: string;
  text: string;
  done: boolean;
}

interface ActivationBridgeProps {
  active: boolean;
  task: Task;
  microEntries: MicroEntry[];
  onComplete: () => void; // All 3 done → unlock full UI
  onAbort: () => void;
  onToggleEntry: (id: string) => void;
}

export default function ActivationBridge({
  active,
  task,
  microEntries,
  onComplete,
  onAbort,
  onToggleEntry,
}: ActivationBridgeProps) {
  const doneCount = microEntries.filter((e) => e.done).length;
  const allDone = doneCount === microEntries.length && microEntries.length > 0;
  const [showUnlock, setShowUnlock] = useState(false);

  // When all micro-tasks done, show unlock animation then fire onComplete
  useEffect(() => {
    if (allDone) {
      setShowUnlock(true);
      const timer = setTimeout(() => {
        onComplete();
        setShowUnlock(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allDone, onComplete]);

  // Find the next undone entry (the only one that should be emphasized)
  const nextIndex = microEntries.findIndex((e) => !e.done);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center"
        >
          {/* Unlock celebration */}
          <AnimatePresence>
            {showUnlock && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={springs.bounce}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl mb-4"
                  >
                    🚀
                  </motion.div>
                  <p className="text-xl font-wt-active text-white">
                    Momentum built. Entering Deep Focus.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content — only visible when not unlocking */}
          {!showUnlock && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.smooth}
              className="w-full max-w-md px-6"
            >
              {/* Task title */}
              <div className="text-center mb-8">
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">
                  Activation Bridge
                </p>
                <h1 className="text-2xl font-wt-active text-white mb-1">
                  {task.title}
                </h1>
                <p className="text-sm text-zinc-500">
                  Complete these 3 micro-actions to begin. Each takes &lt; 2 minutes.
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-6">
                <motion.div
                  className="h-full bg-indigo-500 rounded-full"
                  animate={{ width: `${(doneCount / Math.max(1, microEntries.length)) * 100}%` }}
                  transition={springs.medium}
                />
              </div>

              {/* Micro-entry list */}
              <div className="space-y-3">
                {microEntries.map((entry, i) => {
                  const isCurrent = i === nextIndex;
                  const isFuture = !entry.done && i > nextIndex;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: isFuture ? 0.3 : 1,
                        x: 0,
                      }}
                      transition={{ ...springs.snap, delay: i * 0.1 }}
                      onClick={() => {
                        if (isCurrent || entry.done) onToggleEntry(entry.id);
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                        entry.done
                          ? 'bg-green-500/10 border border-green-500/20'
                          : isCurrent
                            ? 'bg-zinc-800 border border-indigo-500/30'
                            : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      {/* Checkbox */}
                      <motion.div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          entry.done
                            ? 'bg-green-500 border-green-500'
                            : isCurrent
                              ? 'border-indigo-400'
                              : 'border-zinc-700'
                        }`}
                        animate={entry.done ? { scale: [1, 1.3, 1] } : {}}
                        transition={springs.bounce}
                      >
                        {entry.done && (
                          <motion.svg
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                          >
                            <motion.path
                              d="M2 6L5 9L10 3"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </motion.svg>
                        )}
                        {!entry.done && (
                          <span className="text-[10px] text-zinc-600 font-bold">
                            {i + 1}
                          </span>
                        )}
                      </motion.div>

                      {/* Text */}
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            entry.done
                              ? 'text-green-400/70 line-through font-wt-background'
                              : isCurrent
                                ? 'text-white font-wt-active'
                                : 'text-zinc-600 font-wt-background'
                          }`}
                        >
                          {entry.text}
                        </p>
                        {isCurrent && (
                          <p className="text-[10px] text-indigo-400 mt-0.5">
                            Click to complete — &lt; 2 min
                          </p>
                        )}
                      </div>

                      {/* Current indicator */}
                      {isCurrent && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={BREATH_CYCLE}
                          className="w-2 h-2 rounded-full bg-indigo-400"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Abort button */}
              <div className="mt-8 text-center">
                <button
                  onClick={onAbort}
                  className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
                >
                  Not now — go back
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

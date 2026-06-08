'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { springs } from '@/lib/springs';
import type { Task } from '@/types';

/**
 * Micro-Action List — breaks a task into tiny sub-steps
 * to lower the "activation energy" for starting (the Wall of Awful).
 *
 * In production this would be LLM-generated; here we use a
 * deterministic decomposition heuristic.
 */

interface SubStep {
  id: string;
  text: string;
  done: boolean;
}

function generateSubSteps(task: Task): SubStep[] {
  // Simple heuristic: break any task into manageable micro-actions
  const steps: string[] = [];

  steps.push(`Open ${task.title} workspace`);
  steps.push('Review where you left off (2 min max)');

  if (task.icnu_score.challenge >= 7) {
    steps.push('Identify the single hardest part');
    steps.push('Write one sentence about how to approach it');
  }

  steps.push('Do the smallest possible first action');
  steps.push('Set a 15-minute timer and just start');

  if (task.icnu_score.urgency >= 7) {
    steps.push('Flag any blockers immediately');
  }

  if (task.duration && task.duration > 60) {
    steps.push('Take a 5-min break at the halfway mark');
    steps.push('Review progress and adjust plan');
  }

  steps.push(`Mark "${task.title}" complete or note remaining work`);

  return steps.map((text, i) => ({
    id: `step-${task.id}-${i}`,
    text,
    done: false,
  }));
}

interface MicroActionListProps {
  task: Task;
}

export default function MicroActionList({ task }: MicroActionListProps) {
  const initial = useMemo(() => generateSubSteps(task), [task]);
  const [steps, setSteps] = useState<SubStep[]>(initial);

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  };

  const doneCount = steps.filter((s) => s.done).length;
  const progress = steps.length > 0 ? doneCount / steps.length : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header with progress */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Micro-Actions
          </h3>
          <span className="text-[10px] text-zinc-500">
            {doneCount}/{steps.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${progress * 100}%` }}
            transition={springs.medium}
          />
        </div>
      </div>

      {/* Steps */}
      <Reorder.Group
        axis="y"
        values={steps}
        onReorder={setSteps}
        className="px-2 py-2 space-y-0.5"
      >
        <AnimatePresence initial={false}>
          {steps.map((step, i) => (
            <Reorder.Item
              key={step.id}
              value={step}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={springs.snap}
            >
              <motion.div
                className={`flex items-start gap-2.5 px-2 py-2 rounded-lg cursor-pointer select-none group ${
                  step.done ? 'opacity-50' : 'hover:bg-zinc-800/50'
                }`}
                onClick={() => toggleStep(step.id)}
                whileTap={{ scale: 0.98 }}
                transition={springs.snap}
              >
                {/* Checkbox */}
                <motion.div
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-zinc-600 group-hover:border-zinc-500'
                  }`}
                  animate={step.done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={springs.bounce}
                >
                  {step.done && (
                    <motion.svg
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.2 }}
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                    >
                      <motion.path
                        d="M2 5L4 7L8 3"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  )}
                </motion.div>

                {/* Step text */}
                <span
                  className={`text-sm leading-tight ${
                    step.done
                      ? 'text-zinc-600 line-through'
                      : i === 0 || (i > 0 && steps[i - 1].done && !step.done)
                        ? 'text-white font-medium'
                        : 'text-zinc-400'
                  }`}
                  style={{
                    fontWeight:
                      !step.done && (i === 0 || (i > 0 && steps[i - 1].done))
                        ? 600
                        : 400,
                  }}
                >
                  {step.text}
                </span>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}

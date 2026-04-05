'use client';

import { motion } from 'framer-motion';
import type { Task } from '@/types';
import { useObjectPermanence } from '@/hooks/useObjectPermanence';

interface FocusCardProps {
  task: Task | null;
}

function icnuTotal(task: Task): number {
  const { interest, challenge, novelty, urgency } = task.icnu_score;
  return interest + challenge + novelty + urgency;
}

export default function FocusCard({ task }: FocusCardProps) {
  const shouldPulse = useObjectPermanence();

  if (!task) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
        Click a segment on the dial to view task details
      </div>
    );
  }

  const isActive = task.status === 'active';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow:
          isActive && shouldPulse
            ? [
                '0 0 0px rgba(129,140,248,0)',
                '0 0 20px rgba(129,140,248,0.6)',
                '0 0 0px rgba(129,140,248,0)',
              ]
            : '0 0 0px rgba(129,140,248,0)',
      }}
      transition={
        isActive && shouldPulse
          ? { boxShadow: { duration: 2, repeat: Infinity } }
          : { duration: 0.2 }
      }
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-bold text-white">{task.title}</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            task.status === 'active'
              ? 'bg-green-500/20 text-green-400'
              : task.status === 'done'
                ? 'bg-zinc-700 text-zinc-400'
                : 'bg-indigo-500/20 text-indigo-400'
          }`}
        >
          {task.status}
        </span>
      </div>

      {/* ICNU Score */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['interest', 'challenge', 'novelty', 'urgency'] as const).map((key) => (
          <div key={key} className="text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">{key[0]}</div>
            <div className="text-lg font-semibold text-white">{task.icnu_score[key]}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>ICNU Total: {icnuTotal(task)}</span>
        <span>
          Dopamine:{' '}
          {'★'.repeat(task.dopamine_rating) + '☆'.repeat(5 - task.dopamine_rating)}
        </span>
      </div>

      {task.duration && (
        <div className="mt-3 text-sm text-zinc-500">
          Duration: {task.duration} min
        </div>
      )}

      {isActive && shouldPulse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-amber-400 text-center"
        >
          ⚡ Still working on this? You&apos;ve been quiet for a while.
        </motion.div>
      )}
    </motion.div>
  );
}

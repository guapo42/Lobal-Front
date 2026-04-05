'use client';

import { motion } from 'framer-motion';
import { springs } from '@/lib/springs';
import { completedTaskOpacity } from '@/engine/anchor/guardrails';
import type { Task } from '@/types';

/**
 * Visual Decay Task — completed tasks fade over 24 hours
 * instead of disappearing, providing a "wins" record.
 */
interface VisualDecayTaskProps {
  task: Task;
  completedAt: number;
  onClick?: () => void;
}

export default function VisualDecayTask({
  task,
  completedAt,
  onClick,
}: VisualDecayTaskProps) {
  const opacity = completedTaskOpacity(completedAt);
  const hoursAgo = Math.round((Date.now() - completedAt) / (60 * 60 * 1000));

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity }}
      transition={{ duration: 1 }}
      whileHover={{ opacity: Math.min(1, opacity + 0.3) }}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group"
    >
      {/* Completed checkmark with bounce */}
      <motion.div
        className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0"
        whileHover={{ scale: 1.1 }}
        transition={springs.bounce}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M2 5L4 7L8 3"
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      <div className="flex-1 min-w-0">
        <span className="text-sm text-zinc-500 line-through font-wt-background block truncate">
          {task.title}
        </span>
      </div>

      <span className="text-[9px] text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {hoursAgo === 0 ? 'just now' : `${hoursAgo}h ago`}
      </span>
    </motion.div>
  );
}

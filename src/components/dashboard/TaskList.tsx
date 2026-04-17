'use client';

import { motion } from 'framer-motion';
import type { Task } from '@/types';
import { springs, urgencyColor } from '@/lib/springs';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
}

export default function TaskList({ tasks, selectedTaskId, onSelect }: TaskListProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
        Today&apos;s Tasks
      </h2>
      <ul className="space-y-1">
        {tasks.map((task) => (
          <motion.li
            key={task.id}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snap}
            onClick={() => onSelect(task.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              selectedTaskId === task.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor:
                  task.status === 'done'
                    ? '#52525b'
                    : urgencyColor(task.icnu_score.urgency),
              }}
            />
            <span
              className={`text-sm ${
                task.status === 'done'
                  ? 'text-zinc-500 line-through font-wt-background'
                  : task.status === 'active'
                    ? 'text-white font-wt-active'
                    : 'text-zinc-300 font-wt-normal'
              }`}
            >
              {task.title}
            </span>
            {task.status === 'active' && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded"
              >
                active
              </motion.span>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

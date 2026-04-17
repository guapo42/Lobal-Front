'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';
import { DEMO_TIME_TASKS as DEMO_TASKS } from '@/lib/demo-data';

/**
 * Variation 2.3 — The Stacked Blocks
 * Tasks are uniform rectangular blocks stacking vertically.
 * A glowing indicator "melts" blocks from the top as time passes.
 * Empty space below = the future.
 */

const BLOCK_HEIGHT = 64;

export default function TimeStackedBlocks() {
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const perf = measureRender('TimeStackedBlocks');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  const nowH = now.getHours() + now.getMinutes() / 60;

  // Sort tasks by start_hour
  const sorted = [...DEMO_TASKS].sort((a, b) => a.start_hour - b.start_hour);

  // Find where "now" falls
  const nowIndex = sorted.findIndex((t) => t.start_hour + t.duration_hours > nowH);

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto px-2">
      <div className="text-xs text-zinc-500 mb-2">
        Time melts downward · Future is below
      </div>

      <div className="relative space-y-1.5">
        {sorted.map((task, i) => {
          const isPast = task.start_hour + task.duration_hours <= nowH;
          const isCurrent = task.start_hour <= nowH && task.start_hour + task.duration_hours > nowH;
          const isSelected = selected === task.id;

          // Calculate "melt" progress for current block
          let meltPct = 0;
          if (isCurrent) {
            meltPct = ((nowH - task.start_hour) / task.duration_hours) * 100;
          }

          return (
            <div key={task.id} className="relative">
              {/* "Now" glow line between blocks */}
              {i === nowIndex && (
                <motion.div
                  className="absolute -top-1 left-0 right-0 h-0.5 z-10"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              <motion.div
                className="relative rounded-xl cursor-pointer overflow-hidden"
                style={{
                  height: BLOCK_HEIGHT,
                  border: isSelected ? '2px solid #fff' : '1px solid #27272a',
                }}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  const s = performance.now();
                  setSelected(isSelected ? null : task.id);
                  requestAnimationFrame(() =>
                    logInteractionLatency('TimeStackedBlocks', 'select-task', performance.now() - s)
                  );
                }}
              >
                {/* Background */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: isPast
                      ? '#18181b'
                      : isCurrent
                        ? `linear-gradient(180deg, #18181b ${meltPct}%, ${task.color}30 ${meltPct}%)`
                        : `${task.color}20`,
                  }}
                />

                {/* Melted overlay for past blocks */}
                {isPast && (
                  <div className="absolute inset-0 bg-zinc-900/60" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(63,63,70,0.2) 4px, rgba(63,63,70,0.2) 8px)',
                  }} />
                )}

                {/* Content */}
                <div className="relative flex items-center h-full px-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-3 shrink-0"
                    style={{
                      background: isPast ? '#52525b' : task.color,
                      boxShadow: isCurrent ? `0 0 8px ${task.color}` : 'none',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isPast ? 'text-zinc-600 line-through' : 'text-white'}`}>
                      {task.title}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {Math.floor(task.start_hour)}:{String(Math.round((task.start_hour % 1) * 60)).padStart(2, '0')}
                      {' — '}
                      {task.duration_hours}h
                    </div>
                  </div>

                  {isCurrent && (
                    <motion.span
                      className="text-[10px] font-bold text-amber-400 uppercase tracking-wider"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Now
                    </motion.span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* The Future — empty space */}
        <div className="flex items-center justify-center h-32 border border-dashed border-zinc-800 rounded-xl mt-2">
          <span className="text-zinc-700 text-sm">The future is unwritten</span>
        </div>
      </div>
    </div>
  );
}

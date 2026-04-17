'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';
import { DEMO_TIME_TASKS as DEMO_TASKS } from '@/lib/demo-data';

/**
 * Variation 2.2 — The Linear "Flow"
 * Horizontally scrolling timeline. Tasks are variable-width "islands"
 * in an ocean of free time.
 */

const HOUR_WIDTH = 100; // px per hour
const TOTAL_WIDTH = 24 * HOUR_WIDTH;
const TRACK_HEIGHT = 80;

export default function TimeLinearFlow() {
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const perf = measureRender('TimeLinearFlow');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const nowH = now.getHours() + now.getMinutes() / 60;
      scrollRef.current.scrollLeft = nowH * HOUR_WIDTH - scrollRef.current.clientWidth / 2;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowX = nowH * HOUR_WIDTH;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="text-xs text-zinc-500 px-2">Scroll horizontally · Click an island to select</div>

      <div ref={scrollRef} className="overflow-x-auto flex-1 relative" style={{ scrollBehavior: 'smooth' }}>
        <div className="relative" style={{ width: TOTAL_WIDTH, height: TRACK_HEIGHT + 60 }}>
          {/* Hour markers */}
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className="absolute top-0" style={{ left: i * HOUR_WIDTH }}>
              <div className="h-full border-l border-zinc-800/60" style={{ height: TRACK_HEIGHT + 40 }} />
              <span className="absolute top-0 -translate-x-1/2 text-[10px] text-zinc-600 select-none">
                {i === 0 ? '12a' : i === 12 ? '12p' : i < 12 ? `${i}a` : `${i - 12}p`}
              </span>
            </div>
          ))}

          {/* "Ocean" — water-like gradient for free time */}
          <div
            className="absolute rounded-lg"
            style={{
              top: 20,
              left: 0,
              width: TOTAL_WIDTH,
              height: TRACK_HEIGHT,
              background: 'linear-gradient(180deg, #0c1425 0%, #0f172a 100%)',
              border: '1px solid #1e293b',
            }}
          />

          {/* Past overlay */}
          <div
            className="absolute rounded-l-lg"
            style={{
              top: 20,
              left: 0,
              width: nowX,
              height: TRACK_HEIGHT,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(63,63,70,0.15) 4px, rgba(63,63,70,0.15) 8px)',
            }}
          />

          {/* Task islands */}
          {DEMO_TASKS.map((t) => {
            const left = t.start_hour * HOUR_WIDTH;
            const width = t.duration_hours * HOUR_WIDTH;
            const isSelected = selected === t.id;
            return (
              <motion.div
                key={t.id}
                className="absolute cursor-pointer flex items-center justify-center px-3 rounded-xl text-xs font-medium text-white/90 shadow-lg"
                style={{
                  top: 30,
                  left,
                  width,
                  height: TRACK_HEIGHT - 20,
                  background: t.color,
                  border: isSelected ? '2px solid #fff' : '2px solid transparent',
                }}
                whileHover={{ y: -2, boxShadow: `0 8px 20px ${t.color}40` }}
                animate={{ y: isSelected ? -4 : 0 }}
                onClick={() => {
                  const s = performance.now();
                  setSelected(isSelected ? null : t.id);
                  requestAnimationFrame(() => logInteractionLatency('TimeLinearFlow', 'select-task', performance.now() - s));
                }}
              >
                <span className="truncate">{t.title}</span>
                <span className="ml-1 opacity-60">{t.duration_hours}h</span>
              </motion.div>
            );
          })}

          {/* Now indicator */}
          <motion.div
            className="absolute top-3 w-0.5 bg-amber-400 z-10"
            style={{ left: nowX, height: TRACK_HEIGHT + 24 }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div
            className="absolute text-[10px] text-amber-400 font-bold z-10 -translate-x-1/2 select-none"
            style={{ left: nowX, top: TRACK_HEIGHT + 46 }}
          >
            NOW
          </div>
        </div>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm">
          <span className="text-white font-medium">{DEMO_TASKS.find((t) => t.id === selected)?.title}</span>
        </motion.div>
      )}
    </div>
  );
}

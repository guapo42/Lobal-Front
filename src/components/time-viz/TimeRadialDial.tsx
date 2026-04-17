'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';
import { polarToCartesian, timeToAngle, describeArc } from '@/lib/svg-math';
import { DEMO_TIME_TASKS as DEMO_TASKS } from '@/lib/demo-data';

/**
 * Variation 2.1 — The Radial Dial (Baseline)
 * Circular SVG 24-hour clock with task arcs, hatch past, glowing "now".
 */

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OR = 155;
const IR = 95;

// Local helpers that pre-bind the center + radii for this dial.
const hourToAngle = (h: number) => timeToAngle(h);
const polar = (cx: number, cy: number, r: number, deg: number) => polarToCartesian(cx, cy, r, deg);
const arc = (startDeg: number, endDeg: number) =>
  describeArc(CX, CY, OR, IR, startDeg, endDeg);

export default function TimeRadialDial() {
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const perf = measureRender('TimeRadialDial');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowAngle = hourToAngle(nowH);
  const nowPos = polar(CX, CY, OR + 10, nowAngle);
  const pastPath = arc(hourToAngle(0), nowAngle);

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const a = hourToAngle(i);
        const p = polar(CX, CY, OR + 18, a);
        const tick = polar(CX, CY, OR + 3, a);
        return { i, p, tick, a };
      }),
    []
  );

  const selectedTask = DEMO_TASKS.find((t) => t.id === selected);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[360px]">
        <defs>
          <pattern id="hatch2" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3f3f46" strokeWidth="1.5" />
          </pattern>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="3" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r={OR} fill="none" stroke="#27272a" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={IR} fill="none" stroke="#27272a" strokeWidth="1" />

        <path d={pastPath} fill="url(#hatch2)" opacity="0.35" />

        {DEMO_TASKS.map((t) => {
          const sa = hourToAngle(t.start_hour);
          const ea = hourToAngle(t.start_hour + t.duration_hours);
          return (
            <motion.path
              key={t.id}
              d={arc(sa, ea)}
              fill={t.color}
              opacity={selected === t.id ? 1 : 0.65}
              stroke={selected === t.id ? '#fff' : 'none'}
              strokeWidth={selected === t.id ? 2 : 0}
              className="cursor-pointer"
              whileHover={{ opacity: 0.85 }}
              onClick={() => {
                const s = performance.now();
                setSelected(selected === t.id ? null : t.id);
                requestAnimationFrame(() => logInteractionLatency('TimeRadialDial', 'select-task', performance.now() - s));
              }}
            />
          );
        })}

        {hours.map(({ i, p, tick, a }) => (
          <g key={i}>
            <line x1={polar(CX, CY, OR + 1, a).x} y1={polar(CX, CY, OR + 1, a).y} x2={tick.x} y2={tick.y} stroke="#52525b" strokeWidth={i % 6 === 0 ? 2 : 0.8} />
            {i % 3 === 0 && (
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-[9px] select-none">
                {i === 0 ? '12a' : i === 12 ? '12p' : i < 12 ? `${i}a` : `${i - 12}p`}
              </text>
            )}
          </g>
        ))}

        <motion.circle cx={nowPos.x} cy={nowPos.y} r="5" fill="#f59e0b" filter="url(#glow2)" animate={{ r: [4, 6, 4] }} transition={{ duration: 2, repeat: Infinity }} />

        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle" className="fill-white text-base font-bold select-none">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-[9px] select-none">
          Radial · 24h
        </text>
      </svg>

      {/* Selection card */}
      {selectedTask && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 w-full max-w-[360px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedTask.color }} />
            <span className="text-white font-medium">{selectedTask.title}</span>
            <span className="ml-auto text-xs text-zinc-500">{selectedTask.duration_hours}h</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';

/**
 * Variation 2.1 — The Radial Dial (Baseline)
 * Circular SVG 24-hour clock with task arcs, hatch past, glowing "now".
 */

interface TimeTask {
  id: string;
  title: string;
  start_hour: number; // 0-23.99
  duration_hours: number;
  color: string;
}

const DEMO_TASKS: TimeTask[] = [
  { id: 't1', title: 'Deep Work', start_hour: 9, duration_hours: 2, color: '#6366f1' },
  { id: 't2', title: 'Lunch', start_hour: 12, duration_hours: 1, color: '#22c55e' },
  { id: 't3', title: 'Meetings', start_hour: 14, duration_hours: 1.5, color: '#f59e0b' },
  { id: 't4', title: 'Creative Time', start_hour: 16, duration_hours: 1.5, color: '#ec4899' },
  { id: 't5', title: 'Wind Down', start_hour: 19, duration_hours: 0.5, color: '#8b5cf6' },
];

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OR = 155;
const IR = 95;

function hourToAngle(h: number): number {
  return (h / 24) * 360 - 90;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(startDeg: number, endDeg: number): string {
  const s1 = polar(CX, CY, OR, startDeg);
  const s2 = polar(CX, CY, OR, endDeg);
  const s3 = polar(CX, CY, IR, endDeg);
  const s4 = polar(CX, CY, IR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${s1.x},${s1.y} A${OR},${OR} 0 ${large} 1 ${s2.x},${s2.y} L${s3.x},${s3.y} A${IR},${IR} 0 ${large} 0 ${s4.x},${s4.y}Z`;
}

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

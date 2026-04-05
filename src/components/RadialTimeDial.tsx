'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Task } from '@/types';

interface RadialTimeDialProps {
  tasks: Task[];
  onSelectTask: (id: string | null) => void;
  selectedTaskId: string | null;
}

const SIZE = 400;
const CENTER = SIZE / 2;
const OUTER_R = 170;
const INNER_R = 100;
const HOUR_MARKS_R = 180;

function timeToAngle(hours: number, minutes: number = 0): number {
  // 0 degrees = 12:00 (top), clockwise
  const totalHours = hours + minutes / 60;
  return (totalHours / 24) * 360 - 90; // -90 to rotate so 0h is at top
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = degToRad(angleDeg);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export default function RadialTimeDial({
  tasks,
  onSelectTask,
  selectedTaskId,
}: RadialTimeDialProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const nowAngle = useMemo(() => {
    return timeToAngle(now.getHours(), now.getMinutes());
  }, [now]);

  // "Past" arc: from midnight to now
  const pastArc = useMemo(() => {
    const startAngle = timeToAngle(0);
    return describeArc(CENTER, CENTER, OUTER_R, INNER_R, startAngle, nowAngle);
  }, [nowAngle]);

  // Task arcs
  const taskArcs = useMemo(() => {
    return tasks
      .filter((t) => t.start_time && t.duration)
      .map((task) => {
        const start = new Date(task.start_time!);
        const startAngle = timeToAngle(start.getHours(), start.getMinutes());
        const durationDegrees = (task.duration! / (24 * 60)) * 360;
        const endAngle = startAngle + durationDegrees;
        const path = describeArc(CENTER, CENTER, OUTER_R, INNER_R, startAngle, endAngle);
        return { task, path, startAngle, endAngle };
      });
  }, [tasks]);

  // Hour markers
  const hourMarkers = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = timeToAngle(i);
      const outer = polarToCartesian(CENTER, CENTER, HOUR_MARKS_R, angle);
      const inner = polarToCartesian(CENTER, CENTER, OUTER_R + 2, angle);
      const label = polarToCartesian(CENTER, CENTER, HOUR_MARKS_R + 12, angle);
      return { i, outer, inner, label };
    });
  }, []);

  // "Now" indicator position
  const nowPos = polarToCartesian(CENTER, CENTER, OUTER_R + 8, nowAngle);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[400px] mx-auto"
      role="img"
      aria-label="24-hour radial time dial"
    >
      <defs>
        {/* Hatch pattern for past time */}
        <pattern
          id="pastHatch"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#3f3f46" strokeWidth="1.5" />
        </pattern>
        {/* Glow filter for "now" indicator */}
        <filter id="nowGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background ring */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={OUTER_R}
        fill="none"
        stroke="#27272a"
        strokeWidth="1"
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R}
        fill="none"
        stroke="#27272a"
        strokeWidth="1"
      />

      {/* Past arc with hatch */}
      <path d={pastArc} fill="url(#pastHatch)" opacity="0.4" />

      {/* Task arcs */}
      {taskArcs.map(({ task, path }) => (
        <motion.path
          key={task.id}
          d={path}
          fill={task.color_hex || '#6366f1'}
          opacity={selectedTaskId === task.id ? 1 : 0.7}
          stroke={selectedTaskId === task.id ? '#fff' : 'none'}
          strokeWidth={selectedTaskId === task.id ? 2 : 0}
          className="cursor-pointer"
          whileHover={{ opacity: 0.9 }}
          onClick={() =>
            onSelectTask(selectedTaskId === task.id ? null : task.id)
          }
        />
      ))}

      {/* Hour markers */}
      {hourMarkers.map(({ i, outer, inner, label }) => (
        <g key={i}>
          <line
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#52525b"
            strokeWidth={i % 6 === 0 ? 2 : 1}
          />
          {i % 3 === 0 && (
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-500 text-[10px] select-none"
            >
              {i === 0 ? '12a' : i === 12 ? '12p' : i < 12 ? `${i}a` : `${i - 12}p`}
            </text>
          )}
        </g>
      ))}

      {/* "Now" glowing indicator */}
      <motion.circle
        cx={nowPos.x}
        cy={nowPos.y}
        r="6"
        fill="#f59e0b"
        filter="url(#nowGlow)"
        animate={{ r: [5, 7, 5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Center time display */}
      <text
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-lg font-bold select-none"
      >
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-zinc-500 text-[10px] select-none"
      >
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

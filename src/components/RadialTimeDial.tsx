'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Task } from '@/types';
import { urgencyColor, BREATH_CYCLE, springs } from '@/lib/springs';
import { polarToCartesian, timeToAngle, describeArc } from '@/lib/svg-math';
import {
  type EnergyLevel,
  calculateFocusScore,
  wedgeExpansion,
} from '@/engine/anchor/icnu-engine';

interface RadialTimeDialProps {
  tasks: Task[];
  onSelectTask: (id: string | null) => void;
  selectedTaskId: string | null;
  energyLevel?: EnergyLevel;
  onStartTask?: (taskId: string) => void;
}

const SIZE = 400;
const CENTER = SIZE / 2;
const OUTER_R = 170;
const INNER_R = 100;
const HOUR_MARKS_R = 180;

export default function RadialTimeDial({
  tasks,
  onSelectTask,
  selectedTaskId,
  energyLevel = 3,
  onStartTask,
}: RadialTimeDialProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowAngle = useMemo(() => {
    return timeToAngle(now.getHours(), now.getMinutes());
  }, [now]);

  const pastArc = useMemo(() => {
    const startAngle = timeToAngle(0);
    return describeArc(CENTER, CENTER, OUTER_R, INNER_R, startAngle, nowAngle);
  }, [nowAngle]);

  const taskArcs = useMemo(() => {
    return tasks
      .filter((t) => t.start_time && t.duration)
      .map((task) => {
        const start = new Date(task.start_time!);
        const startAngle = timeToAngle(start.getHours(), start.getMinutes());
        // Focus Score drives wedge expansion — high-score tasks get wider
        const focusScore = calculateFocusScore(task.icnu_score, energyLevel);
        const expansion = wedgeExpansion(focusScore);
        const baseDegrees = (task.duration! / (24 * 60)) * 360;
        const durationDegrees = baseDegrees * expansion;
        const endAngle = startAngle + durationDegrees;
        const path = describeArc(CENTER, CENTER, OUTER_R, INNER_R, startAngle, endAngle);
        const color = task.color_hex || urgencyColor(task.icnu_score.urgency);
        return { task, path, startAngle, endAngle, color, focusScore };
      });
  }, [tasks, energyLevel]);

  const hourMarkers = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = timeToAngle(i);
      const outer = polarToCartesian(CENTER, CENTER, HOUR_MARKS_R, angle);
      const inner = polarToCartesian(CENTER, CENTER, OUTER_R + 2, angle);
      const label = polarToCartesian(CENTER, CENTER, HOUR_MARKS_R + 12, angle);
      return { i, outer, inner, label };
    });
  }, []);

  const nowPos = polarToCartesian(CENTER, CENTER, OUTER_R + 8, nowAngle);

  // Find the most urgent upcoming task for ambient urgency cue
  const maxUpcomingUrgency = useMemo(() => {
    const nowH = now.getHours() + now.getMinutes() / 60;
    return Math.max(
      0,
      ...tasks
        .filter((t) => {
          if (!t.start_time) return false;
          const s = new Date(t.start_time);
          const sh = s.getHours() + s.getMinutes() / 60;
          return sh > nowH && sh - nowH < 2; // within 2 hours
        })
        .map((t) => t.icnu_score.urgency)
    );
  }, [tasks, now]);

  // Ambient urgency ring color
  const ambientColor = urgencyColor(maxUpcomingUrgency);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[400px] mx-auto"
      role="img"
      aria-label="24-hour radial time dial"
    >
      <defs>
        <pattern
          id="pastHatch"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#3f3f46" strokeWidth="1.5" />
        </pattern>
        <filter id="nowGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Breathing glow for the dial ring — ambient urgency */}
        <filter id="dialBreath" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient urgency breathing ring — peripheral cue */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={OUTER_R + 1}
        fill="none"
        stroke={ambientColor}
        strokeWidth="1.5"
        filter="url(#dialBreath)"
        animate={{
          opacity: maxUpcomingUrgency > 3 ? [0.15, 0.35, 0.15] : [0.05, 0.1, 0.05],
          strokeWidth: maxUpcomingUrgency > 7 ? [1.5, 3, 1.5] : [1, 1.5, 1],
        }}
        transition={BREATH_CYCLE}
      />

      {/* Background rings */}
      <circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="#27272a" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="#27272a" strokeWidth="1" />

      {/* Past arc with hatch */}
      <path d={pastArc} fill="url(#pastHatch)" opacity="0.4" />

      {/* Task arcs — with urgency color fallback and spring interaction */}
      {taskArcs.map(({ task, path, color, focusScore }) => (
        <motion.path
          key={task.id}
          d={path}
          fill={color}
          opacity={selectedTaskId === task.id ? 1 : 0.4 + focusScore * 0.5}
          stroke={selectedTaskId === task.id ? '#fff' : 'none'}
          strokeWidth={selectedTaskId === task.id ? 2 : 0}
          className="cursor-pointer"
          whileHover={{ opacity: 0.95, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={springs.snap}
          onClick={() =>
            onSelectTask(selectedTaskId === task.id ? null : task.id)
          }
          onDoubleClick={() => onStartTask?.(task.id)}
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

      {/* "Now" indicator — 60bpm breathing pulse anchored to present */}
      <motion.circle
        cx={nowPos.x}
        cy={nowPos.y}
        r="6"
        fill="#f59e0b"
        filter="url(#nowGlow)"
        animate={{
          r: [5, 8, 5],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: BREATH_CYCLE.duration,
          repeat: Infinity,
          ease: BREATH_CYCLE.ease,
        }}
      />
      {/* Secondary breathing ring around "Now" */}
      <motion.circle
        cx={nowPos.x}
        cy={nowPos.y}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1"
        animate={{
          r: [10, 16, 10],
          opacity: [0.4, 0.1, 0.4],
        }}
        transition={{
          duration: BREATH_CYCLE.duration,
          repeat: Infinity,
          ease: BREATH_CYCLE.ease,
        }}
      />

      {/* Center time display */}
      <text
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-lg font-bold select-none"
        style={{ fontWeight: 600, fontVariationSettings: "'wght' 600" }}
      >
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-zinc-500 text-[10px] select-none"
        style={{ fontWeight: 300, fontVariationSettings: "'wght' 300" }}
      >
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { springs } from '@/lib/springs';
import {
  type EnergyLevel,
  getWeightProfile,
} from '@/engine/anchor/icnu-engine';

/**
 * Dopamine/Energy Slider — sets the user's current brain-state.
 *
 * Instead of asking "what's important?" it asks
 * "what can your brain handle right now?"
 *
 * Energy 1: Survival — only urgent, simple tasks
 * Energy 2: Low battery — urgent + easy
 * Energy 3: Balanced — all tasks visible
 * Energy 4: High gear — interest + challenge lead
 * Energy 5: Hyperfocus — novelty + challenge peak
 */

const ENERGY_META: Record<EnergyLevel, { label: string; emoji: string; desc: string; color: string }> = {
  1: { label: 'Survival', emoji: '🔋', desc: 'Urgent + simple only', color: '#ef4444' },
  2: { label: 'Low', emoji: '🪫', desc: 'Urgent + slightly interesting', color: '#f97316' },
  3: { label: 'Balanced', emoji: '⚡', desc: 'All tasks visible', color: '#f59e0b' },
  4: { label: 'High', emoji: '🔥', desc: 'Interest + challenge lead', color: '#22c55e' },
  5: { label: 'Hyperfocus', emoji: '💎', desc: 'Novelty + challenge peak', color: '#6366f1' },
};

interface EnergySliderProps {
  value: EnergyLevel;
  onChange: (level: EnergyLevel) => void;
}

export default function EnergySlider({ value, onChange }: EnergySliderProps) {
  const [hovered, setHovered] = useState<EnergyLevel | null>(null);
  const displayLevel = hovered ?? value;
  const meta = ENERGY_META[displayLevel];
  const weights = getWeightProfile(displayLevel);

  const handleClick = useCallback(
    (level: EnergyLevel) => {
      onChange(level);
    },
    [onChange]
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Brain State
        </h2>
        <span className="text-xs text-zinc-600">
          What can you handle right now?
        </span>
      </div>

      {/* Slider track */}
      <div className="flex items-center gap-1.5 mb-3">
        {([1, 2, 3, 4, 5] as EnergyLevel[]).map((level) => {
          const isActive = level <= value;
          const levelMeta = ENERGY_META[level];

          return (
            <motion.button
              key={level}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.92 }}
              transition={springs.snap}
              onClick={() => handleClick(level)}
              onMouseEnter={() => setHovered(level)}
              onMouseLeave={() => setHovered(null)}
              className="flex-1 relative"
            >
              <motion.div
                animate={{
                  backgroundColor: isActive ? levelMeta.color : '#27272a',
                  height: 8 + level * 4,
                }}
                transition={springs.snap}
                className="w-full rounded-full"
                style={{ minHeight: 12 }}
              />
              {level === value && (
                <motion.div
                  layoutId="energy-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: levelMeta.color }}
                  transition={springs.medium}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Current state display */}
      <motion.div
        key={displayLevel}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.snap}
        className="flex items-center gap-3"
      >
        <span className="text-lg">{meta.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-wt-active"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-xs text-zinc-600">{meta.desc}</span>
          </div>

          {/* Weight visualization */}
          <div className="flex gap-1 mt-1.5">
            {[
              { key: 'I', val: weights.wI, label: 'Interest' },
              { key: 'C', val: weights.wC, label: 'Challenge' },
              { key: 'N', val: weights.wN, label: 'Novelty' },
              { key: 'U', val: weights.wU, label: 'Urgency' },
            ].map(({ key, val, label }) => (
              <div key={key} className="flex-1" title={`${label}: ${Math.round(val * 100)}%`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-zinc-600">{key}</span>
                  <span className="text-[9px] text-zinc-700">{Math.round(val * 100)}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: meta.color }}
                    animate={{ width: `${val * 100}%` }}
                    transition={springs.medium}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

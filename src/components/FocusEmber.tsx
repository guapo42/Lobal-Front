'use client';

import { motion } from 'framer-motion';
import { useFocusEmber } from '@/hooks/useFocusEmber';
import { BREATH_CYCLE } from '@/lib/springs';

/**
 * A small "Focus Ember" in the corner that grows brighter
 * as the user maintains continuous focus (tab visible, no switching).
 * Gamifies Focus Minutes instead of days.
 */
export default function FocusEmber() {
  const { focusMinutes, emberIntensity, isActive } = useFocusEmber();

  // Don't show until at least 1 minute of focus
  if (focusMinutes < 1) return null;

  // Color transitions: dim amber → bright orange → white-hot
  const hue = 30 + emberIntensity * 10; // 30-40
  const sat = 80 + emberIntensity * 20; // 80-100%
  const light = 40 + emberIntensity * 25; // 40-65%
  const glowColor = `hsl(${hue}, ${sat}%, ${light}%)`;
  const glowSpread = 4 + emberIntensity * 16; // 4-20px

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2"
    >
      {/* The ember */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{
          boxShadow: isActive
            ? [
                `0 0 ${glowSpread}px ${glowColor}`,
                `0 0 ${glowSpread + 8}px ${glowColor}`,
                `0 0 ${glowSpread}px ${glowColor}`,
              ]
            : `0 0 2px ${glowColor}`,
        }}
        transition={isActive ? { ...BREATH_CYCLE } : { duration: 0.3 }}
        style={{
          width: 32 + emberIntensity * 12,
          height: 32 + emberIntensity * 12,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0.3) 70%)`,
          border: `1px solid ${glowColor}`,
        }}
      >
        <span
          className="text-[10px] font-bold select-none"
          style={{ color: emberIntensity > 0.5 ? '#fff' : '#fbbf24' }}
        >
          {focusMinutes}
        </span>
      </motion.div>

      {/* Label */}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium" style={{ color: glowColor }}>
          {focusMinutes} min focus
        </span>
        {!isActive && (
          <span className="text-[9px] text-zinc-600">paused</span>
        )}
      </div>
    </motion.div>
  );
}

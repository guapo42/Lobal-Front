'use client';

import { motion } from 'framer-motion';
import { springs } from '@/lib/springs';

interface DashboardHeaderProps {
  captureCount: number;
  onCapture: () => void;
}

export default function DashboardHeader({
  captureCount,
  onCapture,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div>
        <h1 className="text-xl font-wt-active text-white tracking-tight">
          The External Lobe
        </h1>
        <p className="text-xs text-zinc-500 font-wt-background">
          Triple-Engine Productivity · Pilot + Translator + Anchor
        </p>
      </div>
      <div className="flex items-center gap-3">
        {captureCount > 0 && (
          <span className="text-xs text-zinc-500 font-wt-background">
            {captureCount} capture{captureCount !== 1 ? 's' : ''} today
          </span>
        )}
        <a
          href="/explore"
          className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg transition-colors"
        >
          Explore
        </a>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snap}
          onClick={onCapture}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-full transition-colors"
        >
          Capture
        </motion.button>
      </div>
    </header>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAnchorStore } from '@/engine/anchor/store';
import { springs } from '@/lib/springs';

/**
 * Review Flag Banner — shows when the Anchor's schema validator
 * has flagged LLM outputs for human review.
 *
 * The "Hallucination Filter" UI — lets the user approve, edit,
 * or reject flagged items.
 */
export default function ReviewFlagBanner() {
  const flags = useAnchorStore((s) => s.reviewFlags.filter((f) => !f.resolved));
  const resolveFlag = useAnchorStore((s) => s.resolveFlag);

  if (flags.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="border-b border-amber-500/20 bg-amber-500/5"
      >
        <div className="px-6 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <span className="text-xs text-amber-400 font-wt-active">
            {flags.length} item{flags.length !== 1 ? 's' : ''} flagged for review
          </span>

          <div className="flex-1" />

          {/* Quick-resolve the most recent flag */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snap}
            onClick={() => resolveFlag(flags[0].id)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition-colors"
          >
            Dismiss
          </motion.button>
        </div>

        {/* Expandable detail */}
        {flags.slice(0, 3).map((flag) => (
          <div
            key={flag.id}
            className="px-6 py-2 border-t border-amber-500/10 flex items-start gap-2"
          >
            <span className="text-[10px] text-amber-500/60 uppercase shrink-0 mt-0.5">
              {flag.source.replace('_', ' ')}
            </span>
            <span className="text-xs text-zinc-400 flex-1">{flag.message}</span>
            <button
              onClick={() => resolveFlag(flag.id)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 shrink-0"
            >
              resolve
            </button>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

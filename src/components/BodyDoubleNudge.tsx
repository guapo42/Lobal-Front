'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs, BREATH_CYCLE } from '@/lib/springs';
import { useAnchorStore } from '@/engine/anchor/store';

/**
 * Body Double Nudge — subtle visual pulse when user
 * returns from a tab switch during DEEP_FOCUS.
 *
 * Subscribes to the Anchor store's bodyDoubleNudgeCount; each
 * increment triggers a transient overlay.
 */
export default function BodyDoubleNudge() {
  const nudgeCount = useAnchorStore((s) => s.bodyDoubleNudgeCount);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (nudgeCount === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [nudgeCount]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={springs.smooth}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0px rgba(99,102,241,0)',
                '0 0 20px rgba(99,102,241,0.3)',
                '0 0 0px rgba(99,102,241,0)',
              ],
            }}
            transition={{ ...BREATH_CYCLE, duration: 1.5 }}
            className="bg-zinc-900 border border-indigo-500/30 rounded-xl px-5 py-3 flex items-center gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ ...BREATH_CYCLE, duration: 1 }}
              className="w-3 h-3 rounded-full bg-indigo-400"
            />
            <div>
              <p className="text-sm text-white font-wt-active">Welcome back</p>
              <p className="text-[10px] text-zinc-500">
                {nudgeCount === 1
                  ? 'You switched away briefly — refocusing.'
                  : `${nudgeCount} tab switches this session — stay here.`}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

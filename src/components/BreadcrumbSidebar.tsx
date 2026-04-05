'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAnchorStore } from '@/engine/anchor/store';
import { springs } from '@/lib/springs';

/**
 * Breadcrumb Sidebar — Vertical feed of "Mental Snapshots"
 *
 * Shows one-sentence summaries of what was being done at
 * 15-minute intervals. Facilitates interruption recovery by
 * externalizing the "where was I?" question.
 */
export default function BreadcrumbSidebar() {
  const snapshots = useAnchorStore((s) => s.snapshots);

  // Show last 8 snapshots, newest first
  const recent = snapshots.slice(-8).reverse();

  if (recent.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Breadcrumbs
        </h2>
        <p className="text-xs text-zinc-600 font-wt-background">
          Mental snapshots will appear here every 15 minutes during focus sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Breadcrumbs
      </h2>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {recent.map((snap) => {
            const time = new Date(snap.at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const minutesAgo = Math.round((Date.now() - snap.at) / 60_000);

            return (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={springs.snap}
                className="flex items-start gap-2"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                  <div className="w-px h-full bg-zinc-800 min-h-[16px]" />
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-zinc-600">{time}</span>
                    <span className="text-[10px] text-zinc-700">
                      {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-wt-normal leading-relaxed">
                    {snap.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

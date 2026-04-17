'use client';

import { motion } from 'framer-motion';
import { springs } from '@/lib/springs';

interface Capture {
  id: string;
  text: string;
  captured_at: string;
}

interface RecentCapturesProps {
  captures: Capture[];
}

export default function RecentCaptures({ captures }: RecentCapturesProps) {
  if (captures.length === 0) return null;

  const recent = captures.slice(-5).reverse();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
        Recent Captures
      </h2>
      <ul className="space-y-2">
        {recent.map((c) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springs.snap}
            className="text-sm text-zinc-300"
          >
            <span className="text-zinc-600 text-xs mr-2">
              {new Date(c.captured_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {c.text}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/springs';

/**
 * Detail Scents HUD — Focus Mode sidebar panel.
 *
 * Shows the 3 most relevant Knowledge Graph nodes for the
 * current task. Nodes are BLURRED by default — active friction
 * requires the user to click to reveal, preventing link-hopping
 * distractions.
 *
 * Only visible during DEEP_FOCUS state.
 */

interface ScentNode {
  id: string;
  label: string;
  type: 'snippet' | 'note' | 'task' | 'idea';
  preview: string;
  relevance: number; // 0-1
  color: string;
}

interface DetailScentsHUDProps {
  visible: boolean;
  taskTitle: string;
  nodes?: ScentNode[];
}

// Demo nodes for when no real graph data is available
function getDemoNodes(taskTitle: string): ScentNode[] {
  const title = taskTitle.toLowerCase();

  if (title.includes('api') || title.includes('pipeline') || title.includes('data')) {
    return [
      { id: 's1', label: 'GraphQL Schema', type: 'snippet', preview: 'type Query { tasks(filter: TaskFilter): [Task!]! }', relevance: 0.92, color: '#22c55e' },
      { id: 's2', label: 'Auth Flow Notes', type: 'note', preview: 'OAuth2 + PKCE for SPA. httpOnly refresh tokens.', relevance: 0.78, color: '#f59e0b' },
      { id: 's3', label: 'Edge Function Pattern', type: 'snippet', preview: 'export const config = { runtime: "edge" };', relevance: 0.65, color: '#22c55e' },
    ];
  }

  return [
    { id: 's1', label: 'ADHD UX Principles', type: 'note', preview: 'Zero-friction input, visual time, object permanence cues', relevance: 0.88, color: '#f59e0b' },
    { id: 's2', label: 'Zustand Persist Pattern', type: 'snippet', preview: "create<State>()(persist((set) => ({ ... }), { name: 'key' }))", relevance: 0.75, color: '#22c55e' },
    { id: 's3', label: 'SVG Arc Math', type: 'snippet', preview: 'function describeArc(cx, cy, r, start, end) { ... }', relevance: 0.62, color: '#22c55e' },
  ];
}

export default function DetailScentsHUD({
  visible,
  taskTitle,
  nodes,
}: DetailScentsHUDProps) {
  const displayNodes = useMemo(
    () => nodes || getDemoNodes(taskTitle),
    [nodes, taskTitle]
  );

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={springs.smooth}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Detail Scents
        </h2>
        <span className="text-[9px] text-zinc-700">
          Click to reveal — resist link-hopping
        </span>
      </div>

      <div className="space-y-2">
        {displayNodes.map((node, i) => (
          <ScentCard key={node.id} node={node} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function ScentCard({ node, index }: { node: ScentNode; index: number }) {
  const [revealed, setRevealed] = useState(false);

  const typeIcon: Record<string, string> = {
    snippet: '</>',
    note: 'N',
    task: 'T',
    idea: '!',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.snap, delay: index * 0.1 }}
      onClick={() => setRevealed(!revealed)}
      className="cursor-pointer group"
    >
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
        {/* Type badge */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{
            backgroundColor: `${node.color}20`,
            color: node.color,
          }}
        >
          {typeIcon[node.type] || '?'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Label — always visible */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-300 font-wt-normal truncate">
              {node.label}
            </span>
            {/* Relevance bar */}
            <div className="w-8 h-1 bg-zinc-700 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${node.relevance * 100}%`,
                  backgroundColor: node.color,
                }}
              />
            </div>
          </div>

          {/* Content — blurred until clicked (active friction) */}
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-zinc-400 font-mono leading-relaxed"
              >
                {node.preview}
              </motion.div>
            ) : (
              <motion.div
                key="blurred"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-zinc-600 leading-relaxed select-none"
                style={{ filter: 'blur(4px)', WebkitUserSelect: 'none' }}
              >
                {node.preview}
              </motion.div>
            )}
          </AnimatePresence>

          {!revealed && (
            <p className="text-[9px] text-zinc-700 mt-1 group-hover:text-zinc-500 transition-colors">
              Click to reveal
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

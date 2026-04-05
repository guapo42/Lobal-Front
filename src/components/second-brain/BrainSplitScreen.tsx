'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';

/**
 * Variation 3.1 — The Associative Split Screen (Baseline)
 * Document editor on the left; interactive node-link diagram on the right.
 */

interface NoteNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  links: string[];
  content: string;
}

const DEMO_NODES: NoteNode[] = [
  { id: 'n1', label: 'Project Omega', x: 200, y: 80, color: '#6366f1', links: ['n2', 'n3'], content: '# Project Omega\n\nMain initiative for Q2. Integrates the new API layer with the existing frontend.\n\n## Key Goals\n- Reduce latency by 40%\n- Migrate to edge functions\n- Ship by April 30' },
  { id: 'n2', label: 'API Design', x: 80, y: 200, color: '#22c55e', links: ['n4'], content: '# API Design Notes\n\nREST → GraphQL migration.\n\n```graphql\ntype Query {\n  tasks(filter: TaskFilter): [Task!]!\n  captures(limit: Int): [Capture!]!\n}\n```\n\nNeed to handle pagination and real-time subscriptions.' },
  { id: 'n3', label: 'Frontend Arch', x: 320, y: 200, color: '#f59e0b', links: ['n5'], content: '# Frontend Architecture\n\nLocal-first with Zustand + persist.\nSync layer via WebSocket (non-blocking).\n\n## Stack\n- Next.js 16 App Router\n- Tailwind CSS\n- Framer Motion\n- Zustand' },
  { id: 'n4', label: 'Auth Flow', x: 60, y: 320, color: '#ec4899', links: [], content: '# Auth Flow\n\nOAuth2 + PKCE for SPA.\nRefresh tokens stored in httpOnly cookies.\nSession timeout: 24h rolling.' },
  { id: 'n5', label: 'Components', x: 340, y: 320, color: '#8b5cf6', links: [], content: '# Component Library\n\n- RadialDial (SVG)\n- LightningCapture (Modal)\n- FocusCard (Task detail)\n- AirlockGatekeeper (Conditional route)' },
];

export default function BrainSplitScreen() {
  const [selectedId, setSelectedId] = useState<string>('n1');
  const [editorContent, setEditorContent] = useState(DEMO_NODES[0].content);
  const perf = measureRender('BrainSplitScreen');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectNode = useCallback((id: string) => {
    const s = performance.now();
    setSelectedId(id);
    const node = DEMO_NODES.find((n) => n.id === id);
    if (node) setEditorContent(node.content);
    requestAnimationFrame(() => logInteractionLatency('BrainSplitScreen', 'select-node', performance.now() - s));
  }, []);

  const selectedNode = DEMO_NODES.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full border border-zinc-800 rounded-xl overflow-hidden">
      {/* Left: Document Editor */}
      <div className="flex-1 flex flex-col border-r border-zinc-800">
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
          {selectedNode && (
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedNode.color }} />
          )}
          <span className="text-sm font-medium text-white">{selectedNode?.label || 'Select a node'}</span>
        </div>
        <textarea
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          className="flex-1 bg-transparent p-4 text-sm text-zinc-300 font-mono resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Right: Node Graph */}
      <div className="w-[420px] bg-zinc-950 relative">
        <svg className="w-full h-full" viewBox="0 0 420 400">
          {/* Links */}
          {DEMO_NODES.flatMap((node) =>
            node.links.map((targetId) => {
              const target = DEMO_NODES.find((n) => n.id === targetId);
              if (!target) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#3f3f46"
                  strokeWidth="1.5"
                  strokeDasharray={selectedId === node.id || selectedId === targetId ? 'none' : '4 4'}
                  opacity={selectedId === node.id || selectedId === targetId ? 0.8 : 0.3}
                />
              );
            })
          )}

          {/* Nodes */}
          {DEMO_NODES.map((node) => {
            const isSelected = selectedId === node.id;
            const isLinked = selectedNode?.links.includes(node.id) || node.links.includes(selectedId);
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node.id)}>
                {isSelected && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r="28"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="2"
                    opacity={0.4}
                    animate={{ r: [28, 32, 28] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="20"
                  fill={isSelected ? node.color : isLinked ? `${node.color}80` : '#27272a'}
                  stroke={node.color}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + 34}
                  textAnchor="middle"
                  className={`text-[10px] select-none ${isSelected ? 'fill-white font-medium' : 'fill-zinc-500'}`}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

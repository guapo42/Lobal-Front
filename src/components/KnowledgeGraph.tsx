'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { springs } from '@/lib/springs';
import { logInteractionLatency, measureRender } from '@/lib/perf';

// Threshold below which we consider the simulation "settled" and
// halt the animation loop until a user interaction wakes it.
const SETTLED_VELOCITY_SQ = 0.01;

/**
 * Knowledge Graph with:
 * - Recency/Frequency node scaling (more touched = larger/brighter)
 * - Visual proximity via gravity simulation (related items cluster)
 * - Dynamic node selection with spring physics
 */

interface KGNode {
  id: string;
  label: string;
  type: 'project' | 'snippet' | 'note' | 'task' | 'idea';
  content: string;
  color: string;
  links: string[];
  tags: string[];
  // Recency/frequency data
  accessCount: number;
  lastAccessed: number; // timestamp
  // Physics state (mutable during simulation)
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const INITIAL_NODES: KGNode[] = [
  { id: 'p1', label: 'Project Omega', type: 'project', content: 'Main Q2 initiative — edge-first architecture', color: '#6366f1', links: ['s1', 'n1', 't1'], tags: ['project', 'q2'], accessCount: 12, lastAccessed: Date.now() - 5 * 60_000, x: 300, y: 200, vx: 0, vy: 0 },
  { id: 's1', label: 'GraphQL Schema', type: 'snippet', content: 'type Query { tasks(filter: TaskFilter): [Task!]! }', color: '#22c55e', links: ['p1', 't1'], tags: ['graphql', 'api'], accessCount: 8, lastAccessed: Date.now() - 15 * 60_000, x: 180, y: 120, vx: 0, vy: 0 },
  { id: 'n1', label: 'ADHD UX Principles', type: 'note', content: 'Zero-friction input, visual time, object permanence cues', color: '#f59e0b', links: ['p1', 'i1'], tags: ['ux', 'adhd'], accessCount: 15, lastAccessed: Date.now() - 2 * 60_000, x: 420, y: 120, vx: 0, vy: 0 },
  { id: 't1', label: 'Migrate Auth', type: 'task', content: 'OAuth2 + PKCE for SPA, httpOnly refresh tokens', color: '#ef4444', links: ['p1', 's1'], tags: ['auth', 'security'], accessCount: 4, lastAccessed: Date.now() - 60 * 60_000, x: 150, y: 280, vx: 0, vy: 0 },
  { id: 'i1', label: 'WebGPU Graphs', type: 'idea', content: 'Use WebGPU compute shaders for 10k+ node force layout', color: '#8b5cf6', links: ['n1'], tags: ['performance', 'graph'], accessCount: 2, lastAccessed: Date.now() - 2 * 60 * 60_000, x: 480, y: 280, vx: 0, vy: 0 },
  { id: 's2', label: 'SVG Arc Math', type: 'snippet', content: 'function describeArc(cx, cy, r, start, end) { ... }', color: '#22c55e', links: ['p1'], tags: ['svg', 'math'], accessCount: 6, lastAccessed: Date.now() - 30 * 60_000, x: 100, y: 200, vx: 0, vy: 0 },
  { id: 'n2', label: 'Sprint Retro Notes', type: 'note', content: 'Latency improvements needed. Zustand persist working well.', color: '#f59e0b', links: ['p1'], tags: ['retro', 'sprint'], accessCount: 3, lastAccessed: Date.now() - 3 * 60 * 60_000, x: 380, y: 330, vx: 0, vy: 0 },
];

function recencyScore(lastAccessed: number): number {
  const minutesAgo = (Date.now() - lastAccessed) / 60_000;
  return Math.max(0, 1 - minutesAgo / (12 * 60)); // decay over 12 hours
}

function nodeImportance(node: KGNode): number {
  const freq = Math.min(1, node.accessCount / 20);
  const recency = recencyScore(node.lastAccessed);
  return 0.4 * freq + 0.6 * recency;
}

const WIDTH = 600;
const HEIGHT = 420;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

export default function KnowledgeGraph() {
  const [nodes, setNodes] = useState<KGNode[]>(INITIAL_NODES);
  const [selected, setSelected] = useState<string | null>(null);
  const nodesRef = useRef<KGNode[]>(INITIAL_NODES);
  const animRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const visibleRef = useRef<boolean>(true);
  const perf = measureRender('KnowledgeGraph');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gravity simulation — halts when settled, visibility changes, or off-screen.
  const runSimulation = useCallback(() => {
    if (!visibleRef.current) {
      runningRef.current = false;
      return;
    }

    const nodes = nodesRef.current;
    const LINK_DISTANCE = 100;
    const REPULSION = 2000;
    const ATTRACTION = 0.005;
    const CENTER_GRAVITY = 0.01;
    const DAMPING = 0.85;

    let totalVelocitySq = 0;

    for (let i = 0; i < nodes.length; i++) {
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      for (const linkId of nodes[i].links) {
        const target = nodes.find((n) => n.id === linkId);
        if (!target) continue;
        const dx = target.x - nodes[i].x;
        const dy = target.y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - LINK_DISTANCE) * ATTRACTION;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      fx += (CENTER_X - nodes[i].x) * CENTER_GRAVITY;
      fy += (CENTER_Y - nodes[i].y) * CENTER_GRAVITY;

      nodes[i].vx = (nodes[i].vx + fx) * DAMPING;
      nodes[i].vy = (nodes[i].vy + fy) * DAMPING;
      nodes[i].x = Math.max(40, Math.min(WIDTH - 40, nodes[i].x + nodes[i].vx));
      nodes[i].y = Math.max(40, Math.min(HEIGHT - 40, nodes[i].y + nodes[i].vy));

      totalVelocitySq += nodes[i].vx * nodes[i].vx + nodes[i].vy * nodes[i].vy;
    }

    setNodes([...nodes]);

    // Halt when the graph has settled — avoids wasteful continuous renders.
    if (totalVelocitySq < SETTLED_VELOCITY_SQ) {
      runningRef.current = false;
      return;
    }

    animRef.current = requestAnimationFrame(runSimulation);
  }, []);

  const startSimulation = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    animRef.current = requestAnimationFrame(runSimulation);
  }, [runSimulation]);

  // Lifecycle: start simulation + bind visibility and intersection observers.
  useEffect(() => {
    startSimulation();

    const onVisibilityChange = () => {
      visibleRef.current = !document.hidden;
      if (!document.hidden) startSimulation();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let observer: IntersectionObserver | null = null;
    if (svgRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const nowVisible = entry.isIntersecting;
            visibleRef.current = nowVisible && !document.hidden;
            if (nowVisible && !document.hidden) startSimulation();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(svgRef.current);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer?.disconnect();
      cancelAnimationFrame(animRef.current);
      runningRef.current = false;
    };
  }, [startSimulation]);

  // Clicking a node bumps its access count (recency/frequency) and wakes sim.
  const selectNode = useCallback(
    (id: string) => {
      const s = performance.now();
      setSelected((prev) => (prev === id ? null : id));
      nodesRef.current = nodesRef.current.map((n) =>
        n.id === id
          ? { ...n, accessCount: n.accessCount + 1, lastAccessed: Date.now() }
          : n
      );
      // Wake the simulation so nodes can re-cluster around the newly-selected.
      startSimulation();
      requestAnimationFrame(() =>
        logInteractionLatency('KnowledgeGraph', 'select-node', performance.now() - s)
      );
    },
    [startSimulation]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selected),
    [nodes, selected]
  );

  const typeIcon: Record<string, string> = {
    project: 'P',
    snippet: '</>',
    note: 'N',
    task: 'T',
    idea: '!',
  };

  return (
    <div className="flex flex-col gap-3">
      <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-xl border border-zinc-800 bg-zinc-950">
        <defs>
          <filter id="kgGlow">
            <feGaussianBlur stdDeviation="4" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Links */}
        {nodes.flatMap((node) =>
          node.links.map((targetId) => {
            const target = nodes.find((n) => n.id === targetId);
            if (!target) return null;
            const isHighlighted = selected === node.id || selected === targetId;
            return (
              <line
                key={`${node.id}-${targetId}`}
                x1={node.x}
                y1={node.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? '#a1a1aa' : '#27272a'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={isHighlighted ? 0.8 : 0.4}
              />
            );
          })
        )}

        {/* Nodes — sized by importance */}
        {nodes.map((node) => {
          const importance = nodeImportance(node);
          const radius = 14 + importance * 18; // 14-32px
          const brightness = 0.3 + importance * 0.7; // 0.3-1.0
          const isSelected = selected === node.id;
          const isLinked = selectedNode?.links.includes(node.id);

          return (
            <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node.id)}>
              {/* Glow ring for high-importance nodes */}
              {importance > 0.5 && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 6}
                  fill="none"
                  stroke={node.color}
                  strokeWidth="1"
                  opacity={importance * 0.3}
                  filter="url(#kgGlow)"
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 4}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  animate={{ r: [radius + 4, radius + 7, radius + 4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={isSelected ? node.color : `${node.color}${Math.round(brightness * 255).toString(16).padStart(2, '0')}`}
                stroke={isSelected ? '#fff' : isLinked ? node.color : '#27272a'}
                strokeWidth={isSelected ? 2 : 1}
              />

              {/* Type icon */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[9px] font-bold select-none pointer-events-none"
                opacity={brightness}
              >
                {typeIcon[node.type] || '?'}
              </text>

              {/* Label */}
              <text
                x={node.x}
                y={node.y + radius + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-[9px] select-none pointer-events-none ${isSelected ? 'fill-white font-medium' : 'fill-zinc-500'}`}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail panel */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.snap}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedNode.color }} />
            <span className="text-sm font-semibold text-white">{selectedNode.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {selectedNode.type}
            </span>
            <span className="ml-auto text-[10px] text-zinc-600">
              touched {selectedNode.accessCount}× · {Math.round((Date.now() - selectedNode.lastAccessed) / 60_000)}m ago
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">{selectedNode.content}</p>
          <div className="mt-2 flex gap-1">
            {selectedNode.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

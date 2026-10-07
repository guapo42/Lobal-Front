'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { measureRender, logInteractionLatency } from '@/lib/perf';

/**
 * Variation 3.2 — The "Infinite Notebook"
 * A vast, zoomable, pannable canvas (Figma-like).
 * Notes and tasks are objects linked by visual arrows.
 */

interface CanvasNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  color: string;
  links: string[];
}

const DEMO_NOTES: CanvasNote[] = [
  { id: 'c1', text: 'Project Omega\n\nMain Q2 initiative. Edge-first architecture.', x: 100, y: 100, width: 220, color: '#6366f1', links: ['c2', 'c3'] },
  { id: 'c2', text: 'API Layer\n\nGraphQL gateway\nEdge functions\nReal-time subs', x: 400, y: 60, width: 180, color: '#22c55e', links: ['c4'] },
  { id: 'c3', text: 'Frontend\n\nNext.js + Zustand\nLocal-first state\nFramer Motion', x: 400, y: 260, width: 180, color: '#f59e0b', links: ['c5'] },
  { id: 'c4', text: 'Auth: OAuth2 + PKCE\nhttpOnly refresh tokens', x: 660, y: 40, width: 200, color: '#ec4899', links: [] },
  { id: 'c5', text: 'Components:\n- RadialDial\n- LightningCapture\n- FocusCard', x: 660, y: 240, width: 180, color: '#8b5cf6', links: [] },
  { id: 'c6', text: '💡 Idea: Use WebGPU for graph rendering?', x: 200, y: 350, width: 240, color: '#14b8a6', links: ['c3'] },
];

export default function BrainInfiniteNotebook() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const perf = measureRender('BrainInfiniteNotebook');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan with mouse drag on background
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.noteId) return;
    setDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // Get center of a note
  const noteCenter = (note: CanvasNote) => ({
    x: note.x + note.width / 2,
    y: note.y + 30,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-zinc-950"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Zoom indicator */}
      <div className="absolute top-3 right-3 z-10 text-[10px] text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
        {Math.round(zoom * 100)}% · Scroll to zoom · Drag to pan
      </div>

      {/* Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          width: 1200,
          height: 600,
        }}
      >
        {/* Grid dots */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]">
          <defs>
            <pattern id="notebookDots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#notebookDots)" />
        </svg>

        {/* Connection arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#52525b" />
            </marker>
          </defs>
          {DEMO_NOTES.flatMap((note) =>
            note.links.map((targetId) => {
              const target = DEMO_NOTES.find((n) => n.id === targetId);
              if (!target) return null;
              const from = noteCenter(note);
              const to = noteCenter(target);
              const isHighlighted = selected === note.id || selected === targetId;
              return (
                <line
                  key={`${note.id}-${targetId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isHighlighted ? '#a1a1aa' : '#3f3f46'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  markerEnd="url(#arrowhead)"
                />
              );
            })
          )}
        </svg>

        {/* Note cards */}
        {DEMO_NOTES.map((note) => {
          const isSelected = selected === note.id;
          return (
            <motion.div
              key={note.id}
              data-note-id={note.id}
              className="absolute rounded-lg cursor-pointer select-none"
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                border: isSelected ? `2px solid ${note.color}` : '1px solid #27272a',
                background: isSelected ? `${note.color}15` : '#18181b',
              }}
              whileHover={{ boxShadow: `0 4px 16px ${note.color}20` }}
              onClick={(e) => {
                e.stopPropagation();
                const s = performance.now();
                setSelected(isSelected ? null : note.id);
                requestAnimationFrame(() =>
                  logInteractionLatency('BrainInfiniteNotebook', 'select-note', performance.now() - s)
                );
              }}
            >
              <div className="px-3 py-2 border-b border-zinc-800/50">
                <div className="w-2 h-2 rounded-full inline-block mr-2" style={{ background: note.color }} />
                <span className="text-xs text-zinc-400">{note.id}</span>
              </div>
              <div className="px-3 py-2 text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                {note.text}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

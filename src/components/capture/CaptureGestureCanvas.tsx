'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExploreStore } from '@/store/useExploreStore';
import { logInteractionLatency, logCaptureClicks, measureRender } from '@/lib/perf';

/**
 * Variation 1.3 — The Gesture Canvas
 * Full-screen invisible canvas. Click anywhere to start typing.
 * No UI elements visible until input is detected.
 */

interface FloatingCapture {
  id: string;
  text: string;
  x: number;
  y: number;
}

export default function CaptureGestureCanvas() {
  const [active, setActive] = useState(false);
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState<FloatingCapture[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const addCapture = useExploreStore((s) => s.addCapture);
  const interactionStart = useRef(0);
  const perf = measureRender('CaptureGestureCanvas');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus when active
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 20);
  }, [active]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (active) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setActive(true);
    interactionStart.current = performance.now();
  }, [active]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setActive(false);
      return;
    }

    logCaptureClicks('1.3-GestureCanvas', 2); // click + enter
    logInteractionLatency('CaptureGestureCanvas', 'full-capture', performance.now() - interactionStart.current);

    addCapture(trimmed);
    setPlaced((p) => [
      ...p,
      { id: crypto.randomUUID(), text: trimmed, x: cursorPos.x, y: cursorPos.y },
    ]);
    setText('');
    setActive(false);
  }, [text, cursorPos, addCapture]);

  return (
    <div
      className="relative w-full h-full cursor-crosshair select-none overflow-hidden"
      onClick={handleCanvasClick}
    >
      {/* Subtle grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none">
        <defs>
          <pattern id="canvasGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvasGrid)" />
      </svg>

      {/* Placed captures */}
      {placed.map((cap) => (
        <motion.div
          key={cap.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-zinc-300 pointer-events-none max-w-xs"
          style={{ left: cap.x, top: cap.y, transform: 'translate(-50%, -50%)' }}
        >
          {cap.text}
        </motion.div>
      ))}

      {/* Active input at click position */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.08 }}
            className="absolute z-10"
            style={{ left: cursorPos.x, top: cursorPos.y, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900 border border-indigo-500/50 rounded-xl shadow-lg shadow-indigo-500/10 overflow-hidden">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  if (e.key === 'Escape') {
                    setActive(false);
                    setText('');
                  }
                }}
                onBlur={() => {
                  if (!text.trim()) {
                    setActive(false);
                    setText('');
                  }
                }}
                placeholder="type here..."
                className="w-64 bg-transparent px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none text-sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint text — fades out when captures exist */}
      {!active && placed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-700 text-lg">Click anywhere to capture a thought</p>
        </div>
      )}
    </div>
  );
}

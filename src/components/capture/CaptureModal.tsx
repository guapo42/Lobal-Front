'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExploreStore } from '@/store/useExploreStore';
import { logInteractionLatency, logCaptureClicks, measureRender } from '@/lib/perf';

/**
 * Variation 1.1 — The Modal (Cmd+K style)
 * Minimalist overlay that auto-focuses input and hides all app context.
 */
export default function CaptureModal() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addCapture = useExploreStore((s) => s.addCapture);
  const clickCount = useRef(0);
  const openTimestamp = useRef(0);
  const perf = measureRender('CaptureModal');

  // Measure render
  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        openTimestamp.current = performance.now();
        clickCount.current = 1; // opening counts as 1 interaction
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    clickCount.current += 1; // submit = another interaction
    logCaptureClicks('1.1-Modal', clickCount.current);
    logInteractionLatency('CaptureModal', 'full-capture', performance.now() - openTimestamp.current);

    addCapture(trimmed);
    setText('');
    setOpen(false);
    clickCount.current = 0;
  }, [text, addCapture]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => {
          setOpen(true);
          openTimestamp.current = performance.now();
          clickCount.current = 1;
        }}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg border border-zinc-700 transition-colors"
      >
        <span className="opacity-60 mr-2">⌘K</span> Quick Capture
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.12 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            >
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Capture a thought..."
                className="w-full bg-transparent px-5 py-4 text-white text-lg placeholder-zinc-500 focus:outline-none"
              />
              <div className="flex items-center justify-between px-5 py-2 border-t border-zinc-800 text-xs text-zinc-500">
                <span>Enter to save · Esc to close</span>
                <span>{text.length > 0 ? `${text.length} chars` : ''}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

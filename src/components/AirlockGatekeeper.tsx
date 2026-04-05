'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export default function AirlockGatekeeper({ children }: { children: React.ReactNode }) {
  const { hasCapturedToday, addCapture } = useStore();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const captureStartRef = useRef<number>(performance.now());

  const now = new Date();
  const hour = now.getHours();
  const isAirlockTime = hour >= 7 && hour < 9;

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const elapsed = performance.now() - captureStartRef.current;

    if (elapsed > 5000) {
      console.warn(
        `[Friction Log] Airlock capture took ${(elapsed / 1000).toFixed(1)}s — exceeds 5s target.`
      );
    }

    addCapture({
      id: crypto.randomUUID(),
      text: trimmed,
      captured_at: new Date().toISOString(),
      time_to_capture_ms: Math.round(elapsed),
    });

    setText('');
    captureStartRef.current = performance.now();
  }, [text, addCapture]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // If outside airlock window or already captured, show normal content
  if (!isAirlockTime || hasCapturedToday) {
    return <>{children}</>;
  }

  // Airlock mode: Brain Dump only
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Good Morning</h1>
        <p className="text-zinc-400 mb-8">
          Before anything else — dump what&apos;s in your head.
        </p>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's floating around in your brain right now?"
          rows={4}
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-4 w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors"
        >
          Capture & Continue
        </motion.button>

        <p className="mt-4 text-zinc-600 text-xs">
          Airlock active 7:00–9:00 AM · Enter to save
        </p>
      </motion.div>
    </div>
  );
}

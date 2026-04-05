'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useExploreStore } from '@/store/useExploreStore';
import { logInteractionLatency, logCaptureClicks, measureRender } from '@/lib/perf';

/**
 * Variation 1.2 — The Command Line
 * Persistent narrow input bar that acts like a terminal.
 * Supports /task, /note, /idea prefixes for auto-categorization.
 */

function parseCommand(input: string): { category: string; text: string } {
  const prefixes: Record<string, string> = {
    '/task': 'task',
    '/note': 'note',
    '/idea': 'idea',
    '/bug': 'bug',
    '/q': 'question',
  };

  for (const [prefix, category] of Object.entries(prefixes)) {
    if (input.startsWith(prefix + ' ')) {
      return { category, text: input.slice(prefix.length + 1).trim() };
    }
  }
  return { category: 'thought', text: input.trim() };
}

export default function CaptureCommandLine() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ text: string; category: string; time: string }[]>([]);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addCapture = useExploreStore((s) => s.addCapture);
  const interactionStart = useRef(0);
  const perf = measureRender('CaptureCommandLine');

  useEffect(() => {
    const start = perf.markStart();
    requestAnimationFrame(() => perf.markEnd(start));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus on / key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;

    const { category, text } = parseCommand(input);
    const now = new Date();

    // 1 click/enter = full capture cycle
    logCaptureClicks('1.2-CommandLine', 1);
    if (interactionStart.current > 0) {
      logInteractionLatency('CaptureCommandLine', 'full-capture', performance.now() - interactionStart.current);
    }

    addCapture(text, category);
    setHistory((h) => [
      { text, category, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...h.slice(0, 9),
    ]);
    setInput('');
    interactionStart.current = 0;
  }, [input, addCapture]);

  const categoryColor: Record<string, string> = {
    task: 'text-blue-400',
    note: 'text-green-400',
    idea: 'text-amber-400',
    bug: 'text-red-400',
    question: 'text-purple-400',
    thought: 'text-zinc-400',
  };

  return (
    <div className="flex flex-col h-full">
      {/* History feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 font-mono text-sm">
        {history.length === 0 && (
          <div className="text-zinc-600 text-center py-8">
            Type below to capture. Use /task, /note, /idea, /bug, /q prefixes.
          </div>
        )}
        {history.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2"
          >
            <span className="text-zinc-600 shrink-0">{entry.time}</span>
            <span className={`shrink-0 ${categoryColor[entry.category] || 'text-zinc-400'}`}>
              [{entry.category}]
            </span>
            <span className="text-zinc-200">{entry.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Command line input */}
      <div className="border-t border-zinc-800 bg-zinc-900/80">
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800 font-mono"
          >
            /task · /note · /idea · /bug · /q — or just type freely
          </motion.div>
        )}
        <div className="flex items-center px-4 py-3">
          <span className="text-indigo-400 font-mono mr-2 select-none">›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (interactionStart.current === 0) interactionStart.current = performance.now();
              setShowHint(e.target.value.startsWith('/'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="capture anything... (press / to focus)"
            className="flex-1 bg-transparent text-white font-mono placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

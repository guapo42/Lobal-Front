'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { springs, BREATH_CYCLE } from '@/lib/springs';

export default function LightningCapture() {
  const { captureOverlayOpen, setCaptureOverlayOpen, addCapture } = useStore();
  const { transcript, isListening, volume, startListening, stopListening, resetTranscript } =
    useVoiceCapture();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const captureStartRef = useRef<number>(0);

  useEffect(() => {
    if (captureOverlayOpen) {
      captureStartRef.current = performance.now();
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 100);
      // Auto-start voice
      startListening();
    } else {
      stopListening();
    }
  }, [captureOverlayOpen, startListening, stopListening]);

  // Sync voice transcript into text
  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  const handleDone = useCallback(() => {
    const finalText = text.trim();
    if (!finalText) {
      setCaptureOverlayOpen(false);
      return;
    }

    const elapsed = performance.now() - captureStartRef.current;

    // Friction logging
    if (elapsed > 5000) {
      console.warn(
        `[Friction Log] Capture took ${(elapsed / 1000).toFixed(1)}s — exceeds 5s target. UX optimization needed.`
      );
    }

    addCapture({
      id: crypto.randomUUID(),
      text: finalText,
      captured_at: new Date().toISOString(),
      time_to_capture_ms: Math.round(elapsed),
    });

    setText('');
    resetTranscript();
    setCaptureOverlayOpen(false);
  }, [text, addCapture, setCaptureOverlayOpen, resetTranscript]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDone();
    }
    if (e.key === 'Escape') {
      setCaptureOverlayOpen(false);
    }
  };

  // Pulse scale: base 1.0, up to 1.35 with volume
  const pulseScale = 1 + volume * 0.35;

  return (
    <AnimatePresence>
      {captureOverlayOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCaptureOverlayOpen(false);
          }}
        >
          {/* Pulsing Circle */}
          <motion.svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            className="mb-8"
            animate={{ scale: isListening ? pulseScale : 1 }}
            transition={springs.medium}
          >
            <defs>
              <radialGradient id="captureGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
              </radialGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="url(#captureGlow)"
              stroke="#818cf8"
              strokeWidth="2"
            />
            {isListening && (
              <motion.circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="3"
                animate={{ r: [90, 95, 90], opacity: [0.6, 0.2, 0.6] }}
                transition={BREATH_CYCLE}
              />
            )}
          </motion.svg>

          <p className="text-white/60 text-sm mb-4">
            {isListening ? 'Listening... speak or type' : 'Type your thought'}
          </p>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />

          {/* Done button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={springs.snap}
            onClick={handleDone}
            className="mt-6 px-12 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-lg rounded-full transition-colors"
          >
            DONE
          </motion.button>

          <p className="mt-3 text-white/30 text-xs">
            Press Enter to save · Esc to cancel
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

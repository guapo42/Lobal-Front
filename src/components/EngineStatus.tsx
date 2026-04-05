'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAnchorStore } from '@/engine/anchor/store';
import { isOllamaAvailable } from '@/engine/translator/llm-client';
import { springs } from '@/lib/springs';

/**
 * Engine Status Panel — shows the state of all three engines.
 * Pilot (user), Translator (LLM), Anchor (FSM state).
 */

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  IDLE: { label: 'Ready', color: '#52525b' },
  CAPTURE_MODE: { label: 'Capturing', color: '#6366f1' },
  TASK_INITIATION: { label: 'Starting Up', color: '#f59e0b' },
  DEEP_FOCUS: { label: 'Deep Focus', color: '#22c55e' },
  BREAK: { label: 'Break', color: '#8b5cf6' },
  REVIEW: { label: 'Reviewing', color: '#3b82f6' },
  BRAIN_DUMP: { label: 'Brain Dump', color: '#ec4899' },
};

export default function EngineStatus() {
  const fsmState = useAnchorStore((s) => s.fsm.state);
  const focusMinutes = useAnchorStore((s) => s.dailyFocusMinutes);
  const activeTaskId = useAnchorStore((s) => s.fsm.activeTaskId);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    isOllamaAvailable().then((ok) => setOllamaStatus(ok ? 'online' : 'offline'));
    // Re-check every 30s
    const interval = setInterval(() => {
      isOllamaAvailable().then((ok) => setOllamaStatus(ok ? 'online' : 'offline'));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const stateInfo = STATE_LABELS[fsmState] || { label: fsmState, color: '#52525b' };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Triple Engine
      </h2>

      <div className="space-y-3">
        {/* Anchor (FSM) */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stateInfo.color }}
            animate={
              fsmState === 'DEEP_FOCUS'
                ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                : {}
            }
            transition={fsmState === 'DEEP_FOCUS' ? { duration: 2, repeat: Infinity } : {}}
          />
          <div className="flex-1">
            <div className="text-xs font-wt-active text-white">
              Anchor: {stateInfo.label}
            </div>
            <div className="text-[10px] text-zinc-600">
              {focusMinutes}min focused today
              {activeTaskId ? ` · Task: ${activeTaskId.slice(0, 8)}` : ''}
            </div>
          </div>
        </div>

        {/* Translator (LLM) */}
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor:
                ollamaStatus === 'online'
                  ? '#22c55e'
                  : ollamaStatus === 'offline'
                    ? '#ef4444'
                    : '#f59e0b',
            }}
          />
          <div className="flex-1">
            <div className="text-xs text-white">
              Translator:{' '}
              {ollamaStatus === 'online'
                ? 'LLM Online'
                : ollamaStatus === 'offline'
                  ? 'Heuristic Mode'
                  : 'Connecting...'}
            </div>
            <div className="text-[10px] text-zinc-600">
              {ollamaStatus === 'online'
                ? 'Local Ollama — data stays private'
                : 'Using deterministic fallbacks'}
            </div>
          </div>
        </div>

        {/* Pilot (User) */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-white">Pilot: You</div>
            <div className="text-[10px] text-zinc-600">
              Strategy, intent, creative sparks
            </div>
          </div>
        </div>
      </div>

      {/* FSM state transition shortcut buttons */}
      <div className="mt-3 pt-3 border-t border-zinc-800 flex gap-1.5 flex-wrap">
        <FSMButton
          label="Capture"
          event="START_CAPTURE"
          currentState={fsmState}
          disabled={fsmState === 'CAPTURE_MODE'}
        />
        <FSMButton
          label="Focus"
          event="FOCUS_ACHIEVED"
          currentState={fsmState}
          disabled={fsmState !== 'TASK_INITIATION'}
        />
        <FSMButton
          label="Break"
          event="TAKE_BREAK"
          currentState={fsmState}
          disabled={fsmState !== 'DEEP_FOCUS'}
        />
        <FSMButton
          label="Reset"
          event="RESET"
          currentState={fsmState}
          disabled={fsmState === 'IDLE'}
        />
      </div>
    </div>
  );
}

function FSMButton({
  label,
  event,
  disabled,
}: {
  label: string;
  event: string;
  currentState: string;
  disabled: boolean;
}) {
  const dispatch = useAnchorStore((s) => s.dispatch);

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={springs.snap}
      onClick={() => {
        if (!disabled) {
          dispatch({ type: event } as Parameters<typeof dispatch>[0]);
        }
      }}
      disabled={disabled}
      className={`px-2.5 py-1 text-[10px] rounded-lg border transition-colors ${
        disabled
          ? 'border-zinc-800 text-zinc-700 cursor-not-allowed'
          : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 cursor-pointer'
      }`}
    >
      {label}
    </motion.button>
  );
}

'use client';

import { useCallback, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAnchorStore } from '@/engine/anchor/store';
import { useResumption } from '@/hooks/useResumption';
import { springs, urgencyColor } from '@/lib/springs';
import {
  startBodyDouble,
  stopBodyDouble,
  startSnapshotTimer,
  stopSnapshotTimer,
} from '@/engine/anchor/guardrails';
import AirlockGatekeeper from '@/components/AirlockGatekeeper';
import LightningCapture from '@/components/LightningCapture';
import RadialTimeDial from '@/components/RadialTimeDial';
import FocusCard from '@/components/FocusCard';
import FocusEmber from '@/components/FocusEmber';
import FocusLens from '@/components/FocusLens';
import ResumptionCard from '@/components/ResumptionCard';
import UndoTimeline from '@/components/UndoTimeline';
import MicroActionList from '@/components/MicroActionList';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import EngineStatus from '@/components/EngineStatus';
import BreadcrumbSidebar from '@/components/BreadcrumbSidebar';
import BodyDoubleNudge from '@/components/BodyDoubleNudge';
import AntiParalysisOverlay from '@/components/AntiParalysisOverlay';
import ReviewFlagBanner from '@/components/ReviewFlagBanner';

// Seed demo tasks so the dial isn't empty on first load
const DEMO_TASKS = [
  {
    id: 'demo-1',
    title: 'Deep Work: Project Sprint',
    icnu_score: { interest: 8, challenge: 7, novelty: 5, urgency: 9 },
    dopamine_rating: 4 as const,
    status: 'active' as const,
    start_time: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    duration: 120,
    color_hex: '#6366f1',
  },
  {
    id: 'demo-2',
    title: 'Lunch Break',
    icnu_score: { interest: 3, challenge: 1, novelty: 2, urgency: 3 },
    dopamine_rating: 2 as const,
    status: 'todo' as const,
    start_time: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    duration: 60,
    color_hex: '#22c55e',
  },
  {
    id: 'demo-3',
    title: 'Review & Respond to Messages',
    icnu_score: { interest: 4, challenge: 3, novelty: 3, urgency: 7 },
    dopamine_rating: 2 as const,
    status: 'todo' as const,
    start_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    duration: 45,
    color_hex: '#f59e0b',
  },
  {
    id: 'demo-4',
    title: 'Creative Exploration',
    icnu_score: { interest: 9, challenge: 6, novelty: 9, urgency: 2 },
    dopamine_rating: 5 as const,
    status: 'todo' as const,
    start_time: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    duration: 90,
    color_hex: '#ec4899',
  },
  {
    id: 'demo-5',
    title: 'Wind Down & Plan Tomorrow',
    icnu_score: { interest: 5, challenge: 2, novelty: 3, urgency: 5 },
    dopamine_rating: 3 as const,
    status: 'todo' as const,
    start_time: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    duration: 30,
    color_hex: '#8b5cf6',
  },
];

export default function Home() {
  const {
    tasks: storedTasks,
    selectedTaskId,
    setSelectedTask,
    setCaptureOverlayOpen,
    captures,
  } = useStore();

  const { showResumption, context, saveContext, dismiss } = useResumption();
  const fsmState = useAnchorStore((s) => s.fsm.state);
  const dispatch = useAnchorStore((s) => s.dispatch);
  const addSnapshot = useAnchorStore((s) => s.addSnapshot);
  const checkAntiParalysis = useAnchorStore((s) => s.checkAntiParalysis);
  const [showAntiParalysis, setShowAntiParalysis] = useState(false);

  const tasks = storedTasks.length > 0 ? storedTasks : DEMO_TASKS;

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.status === 'active') ?? null,
    [tasks]
  );

  const handleSelectTask = useCallback(
    (id: string | null) => setSelectedTask(id),
    [setSelectedTask]
  );

  // ── Body Double Protocol ──
  useEffect(() => {
    if (fsmState === 'DEEP_FOCUS') {
      startBodyDouble(() => {
        const nudge = (window as unknown as Record<string, unknown>).__bodyDoubleNudge as
          | ((count: number) => void)
          | undefined;
        nudge?.(1);
      });
      return () => stopBodyDouble();
    }
  }, [fsmState]);

  // ── Mental Snapshot Timer ──
  useEffect(() => {
    if (fsmState === 'DEEP_FOCUS' || fsmState === 'TASK_INITIATION') {
      startSnapshotTimer(
        (taskId) => {
          const task = tasks.find((t) => t.id === taskId);
          addSnapshot(
            task ? `Working on: ${task.title}` : 'Focused session in progress',
            taskId
          );
        },
        () => useAnchorStore.getState().fsm.activeTaskId
      );
      return () => stopSnapshotTimer();
    }
  }, [fsmState, tasks, addSnapshot]);

  // ── Anti-Paralysis Check ──
  useEffect(() => {
    if (fsmState !== 'TASK_INITIATION') {
      setShowAntiParalysis(false);
      return;
    }
    const interval = setInterval(() => {
      if (checkAntiParalysis()) {
        setShowAntiParalysis(true);
      }
    }, 30_000); // check every 30s
    return () => clearInterval(interval);
  }, [fsmState, checkAntiParalysis]);

  // ── Resumption context save on departure ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const lastCapture = captures[captures.length - 1];
        saveContext(
          lastCapture?.text || '',
          activeTask?.title || '',
          tasks.filter((t) => t.status === 'active').map((t) => t.title)
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [captures, activeTask, tasks, saveContext]);

  return (
    <AirlockGatekeeper>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Review Flag Banner */}
        <ReviewFlagBanner />

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl font-wt-active text-white tracking-tight">
              The External Lobe
            </h1>
            <p className="text-xs text-zinc-500 font-wt-background">
              Triple-Engine Productivity · Pilot + Translator + Anchor
            </p>
          </div>
          <div className="flex items-center gap-3">
            {captures.length > 0 && (
              <span className="text-xs text-zinc-500 font-wt-background">
                {captures.length} capture{captures.length !== 1 ? 's' : ''} today
              </span>
            )}
            <a
              href="/explore"
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg transition-colors"
            >
              Explore
            </a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={springs.snap}
              onClick={() => {
                setCaptureOverlayOpen(true);
                dispatch({ type: 'START_CAPTURE' });
              }}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-full transition-colors"
            >
              Capture
            </motion.button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
          {/* Left: Dial + Graph */}
          <FocusLens>
            <div className="flex-1 flex flex-col items-center justify-start gap-6">
              <RadialTimeDial
                tasks={tasks}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTaskId}
              />
              <div className="w-full max-w-[600px]">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                  Knowledge Graph
                </h2>
                <KnowledgeGraph />
              </div>
            </div>
          </FocusLens>

          {/* Right: Sidebar */}
          <aside className="w-full lg:w-96 flex flex-col gap-4">
            {/* Engine Status */}
            <EngineStatus />

            {/* Focus Card */}
            <FocusCard task={selectedTask} />

            {/* Micro-Actions for active task */}
            {activeTask && <MicroActionList task={activeTask} />}

            {/* Task List with urgency colors and variable font weights */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                Today&apos;s Tasks
              </h2>
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <motion.li
                    key={task.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springs.snap}
                    onClick={() => handleSelectTask(task.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedTaskId === task.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          task.status === 'done'
                            ? '#52525b'
                            : urgencyColor(task.icnu_score.urgency),
                      }}
                    />
                    <span
                      className={`text-sm ${
                        task.status === 'done'
                          ? 'text-zinc-500 line-through font-wt-background'
                          : task.status === 'active'
                            ? 'text-white font-wt-active'
                            : 'text-zinc-300 font-wt-normal'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.status === 'active' && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded"
                      >
                        active
                      </motion.span>
                    )}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Breadcrumb Sidebar */}
            <BreadcrumbSidebar />

            {/* Recent Captures */}
            {captures.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                  Recent Captures
                </h2>
                <ul className="space-y-2">
                  {captures
                    .slice(-5)
                    .reverse()
                    .map((c) => (
                      <motion.li
                        key={c.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={springs.snap}
                        className="text-sm text-zinc-300"
                      >
                        <span className="text-zinc-600 text-xs mr-2">
                          {new Date(c.captured_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {c.text}
                      </motion.li>
                    ))}
                </ul>
              </div>
            )}
          </aside>
        </main>

        {/* Overlays & Global Components */}
        <LightningCapture />
        <FocusEmber />
        <UndoTimeline />
        <BodyDoubleNudge />
        <ResumptionCard show={showResumption} context={context} onDismiss={dismiss} />
        <AntiParalysisOverlay
          show={showAntiParalysis}
          taskTitle={activeTask?.title || ''}
          onDismiss={() => setShowAntiParalysis(false)}
          onStartAction={(text) => {
            console.log(`[Anti-Paralysis] Starting: ${text}`);
            dispatch({ type: 'FOCUS_ACHIEVED' });
            setShowAntiParalysis(false);
          }}
        />
      </div>
    </AirlockGatekeeper>
  );
}

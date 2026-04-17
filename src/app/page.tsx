'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Task } from '@/types';
import { useStore } from '@/store/useStore';
import { useAnchorStore } from '@/engine/anchor/store';
import { useResumption } from '@/hooks/useResumption';
import { useDashboardEffects } from '@/hooks/useDashboardEffects';
import {
  type EnergyLevel,
  rankTasks,
  filterByEnergy,
} from '@/engine/anchor/icnu-engine';
import { buildDemoTasks } from '@/lib/demo-data';

import AirlockGatekeeper from '@/components/AirlockGatekeeper';
import FocusLens from '@/components/FocusLens';
import RadialTimeDial from '@/components/RadialTimeDial';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ReviewFlagBanner from '@/components/ReviewFlagBanner';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SidebarPanel from '@/components/dashboard/SidebarPanel';
import OverlayManager from '@/components/dashboard/OverlayManager';

interface BridgeEntry {
  id: string;
  text: string;
  done: boolean;
}

interface ActivationBridgeState {
  active: boolean;
  taskId: string;
  entries: BridgeEntry[];
}

function buildMicroEntries(task: Task): BridgeEntry[] {
  return [
    { id: `${task.id}-e1`, text: `Open workspace for "${task.title}"`, done: false },
    { id: `${task.id}-e2`, text: 'Scan where you left off — find the first thing to change', done: false },
    { id: `${task.id}-e3`, text: 'Make one small edit or write one sentence', done: false },
  ];
}

export default function Home() {
  // Data sources ─────────────────────────────────────────────
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

  // Local UI state ───────────────────────────────────────────
  const [showAntiParalysis, setShowAntiParalysis] = useState(false);
  const [energy, setEnergy] = useState<EnergyLevel>(3);
  const [bridge, setBridge] = useState<ActivationBridgeState>({
    active: false,
    taskId: '',
    entries: [],
  });

  // Demo fallback — memoize so buildDemoTasks runs once
  const demoTasks = useMemo(() => buildDemoTasks(), []);
  const allTasks = storedTasks.length > 0 ? storedTasks : demoTasks;

  // Energy-filtered + Focus-Score-ranked task list
  const tasks = useMemo(
    () => rankTasks(filterByEnergy(allTasks, energy), energy),
    [allTasks, energy]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.status === 'active') ?? null,
    [tasks]
  );

  // Handlers ─────────────────────────────────────────────────
  const handleSelectTask = useCallback(
    (id: string) => setSelectedTask(id),
    [setSelectedTask]
  );

  const handleStartTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;
      setBridge({ active: true, taskId, entries: buildMicroEntries(task) });
      dispatch({ type: 'BEGIN_TASK', taskId });
    },
    [allTasks, dispatch]
  );

  const handleToggleBridgeEntry = useCallback((entryId: string) => {
    setBridge((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === entryId ? { ...e, done: !e.done } : e
      ),
    }));
  }, []);

  const handleBridgeComplete = useCallback(() => {
    setBridge((prev) => ({ ...prev, active: false }));
    dispatch({ type: 'FOCUS_ACHIEVED' });
  }, [dispatch]);

  const handleBridgeAbort = useCallback(() => {
    setBridge((prev) => ({ ...prev, active: false }));
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleCapture = useCallback(() => {
    setCaptureOverlayOpen(true);
    dispatch({ type: 'START_CAPTURE' });
  }, [setCaptureOverlayOpen, dispatch]);

  const handleAntiParalysisAction = useCallback(
    (text: string) => {
      console.log(`[Anti-Paralysis] Starting: ${text}`);
      dispatch({ type: 'FOCUS_ACHIEVED' });
      setShowAntiParalysis(false);
    },
    [dispatch]
  );

  // Side-effects (body double, snapshots, anti-paralysis, resumption save)
  useDashboardEffects({
    fsmState,
    tasks,
    activeTask,
    captures,
    setShowAntiParalysis,
    saveContext,
  });

  const bridgeTask =
    bridge.active ? allTasks.find((t) => t.id === bridge.taskId) ?? null : null;

  return (
    <AirlockGatekeeper>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <ReviewFlagBanner />

        <DashboardHeader
          captureCount={captures.length}
          onCapture={handleCapture}
        />

        <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
          <FocusLens>
            <div className="flex-1 flex flex-col items-center justify-start gap-6">
              <RadialTimeDial
                tasks={tasks}
                onSelectTask={setSelectedTask}
                selectedTaskId={selectedTaskId}
                energyLevel={energy}
                onStartTask={handleStartTask}
              />
              {fsmState !== 'DEEP_FOCUS' && (
                <div className="w-full max-w-[600px]">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                    Knowledge Graph
                  </h2>
                  <KnowledgeGraph />
                </div>
              )}
            </div>
          </FocusLens>

          <SidebarPanel
            energy={energy}
            onEnergyChange={setEnergy}
            fsmState={fsmState}
            selectedTask={selectedTask}
            activeTask={activeTask}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            onStartTask={handleStartTask}
            captures={captures}
          />
        </main>

        <OverlayManager
          showResumption={showResumption}
          resumptionContext={context}
          onDismissResumption={dismiss}
          showAntiParalysis={showAntiParalysis}
          activeTaskTitle={activeTask?.title || ''}
          onDismissAntiParalysis={() => setShowAntiParalysis(false)}
          onStartAntiParalysisAction={handleAntiParalysisAction}
          bridge={bridge}
          bridgeTask={bridgeTask}
          onBridgeComplete={handleBridgeComplete}
          onBridgeAbort={handleBridgeAbort}
          onBridgeToggleEntry={handleToggleBridgeEntry}
        />
      </div>
    </AirlockGatekeeper>
  );
}

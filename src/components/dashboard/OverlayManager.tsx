'use client';

import type { Task } from '@/types';
import LightningCapture from '@/components/LightningCapture';
import FocusEmber from '@/components/FocusEmber';
import UndoTimeline from '@/components/UndoTimeline';
import BodyDoubleNudge from '@/components/BodyDoubleNudge';
import ResumptionCard from '@/components/ResumptionCard';
import AntiParalysisOverlay from '@/components/AntiParalysisOverlay';
import ActivationBridge from '@/components/ActivationBridge';

interface ResumptionContext {
  lastText: string;
  activeTaskTitle: string;
  openLoops: string[];
  leftAt: number;
}

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

interface OverlayManagerProps {
  // Resumption
  showResumption: boolean;
  resumptionContext: ResumptionContext | null;
  onDismissResumption: () => void;

  // Anti-Paralysis
  showAntiParalysis: boolean;
  activeTaskTitle: string;
  onDismissAntiParalysis: () => void;
  onStartAntiParalysisAction: (text: string) => void;

  // Activation Bridge
  bridge: ActivationBridgeState;
  bridgeTask: Task | null;
  onBridgeComplete: () => void;
  onBridgeAbort: () => void;
  onBridgeToggleEntry: (id: string) => void;
}

/**
 * Groups all top-level overlay components so the main dashboard
 * doesn't render them inline. Purely presentational — no side effects.
 */
export default function OverlayManager({
  showResumption,
  resumptionContext,
  onDismissResumption,
  showAntiParalysis,
  activeTaskTitle,
  onDismissAntiParalysis,
  onStartAntiParalysisAction,
  bridge,
  bridgeTask,
  onBridgeComplete,
  onBridgeAbort,
  onBridgeToggleEntry,
}: OverlayManagerProps) {
  return (
    <>
      <LightningCapture />
      <FocusEmber />
      <UndoTimeline />
      <BodyDoubleNudge />
      <ResumptionCard
        show={showResumption}
        context={resumptionContext}
        onDismiss={onDismissResumption}
      />
      <AntiParalysisOverlay
        show={showAntiParalysis}
        taskTitle={activeTaskTitle}
        onDismiss={onDismissAntiParalysis}
        onStartAction={onStartAntiParalysisAction}
      />
      {bridge.active && bridgeTask && (
        <ActivationBridge
          active={bridge.active}
          task={bridgeTask}
          microEntries={bridge.entries}
          onComplete={onBridgeComplete}
          onAbort={onBridgeAbort}
          onToggleEntry={onBridgeToggleEntry}
        />
      )}
    </>
  );
}

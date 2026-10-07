'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  useExploreStore,
  type CaptureVariation,
  type TimeVariation,
  type BrainVariation,
} from '@/store/useExploreStore';

// Capture variations
import CaptureModal from '@/components/capture/CaptureModal';
import CaptureCommandLine from '@/components/capture/CaptureCommandLine';
import CaptureGestureCanvas from '@/components/capture/CaptureGestureCanvas';

// Time visualization variations
import TimeRadialDial from '@/components/time-viz/TimeRadialDial';
import TimeLinearFlow from '@/components/time-viz/TimeLinearFlow';
import TimeStackedBlocks from '@/components/time-viz/TimeStackedBlocks';

// Second Brain variations
import BrainSplitScreen from '@/components/second-brain/BrainSplitScreen';
import BrainInfiniteNotebook from '@/components/second-brain/BrainInfiniteNotebook';
import BrainTerminal from '@/components/second-brain/BrainTerminal';

function VariationSelector<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; name: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</h3>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value === opt.id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            }`}
            title={opt.desc}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const CAPTURE_OPTIONS: { id: CaptureVariation; name: string; desc: string }[] = [
  { id: '1.1-modal', name: '1.1 Modal (Cmd+K)', desc: 'Minimalist overlay that auto-focuses input' },
  { id: '1.2-command-line', name: '1.2 Command Line', desc: 'Persistent terminal-style input bar with /prefixes' },
  { id: '1.3-gesture-canvas', name: '1.3 Gesture Canvas', desc: 'Click anywhere on invisible canvas to capture' },
];

const TIME_OPTIONS: { id: TimeVariation; name: string; desc: string }[] = [
  { id: '2.1-radial', name: '2.1 Radial Dial', desc: 'Circular 24-hour SVG clock face' },
  { id: '2.2-linear-flow', name: '2.2 Linear Flow', desc: 'Horizontal scrolling timeline with task islands' },
  { id: '2.3-stacked-blocks', name: '2.3 Stacked Blocks', desc: 'Vertical blocks melting from top as time passes' },
];

const BRAIN_OPTIONS: { id: BrainVariation; name: string; desc: string }[] = [
  { id: '3.1-split-screen', name: '3.1 Split Screen', desc: 'Editor on left, node-link graph on right' },
  { id: '3.2-infinite-notebook', name: '3.2 Infinite Notebook', desc: 'Zoomable pannable canvas like Figma' },
  { id: '3.3-terminal', name: '3.3 Terminal', desc: 'Natural language and SQL-like search interface' },
];

function CapturePanel({ variation }: { variation: CaptureVariation }) {
  switch (variation) {
    case '1.1-modal':
      return (
        <div className="flex items-center justify-center h-full">
          <CaptureModal />
        </div>
      );
    case '1.2-command-line':
      return <CaptureCommandLine />;
    case '1.3-gesture-canvas':
      return <CaptureGestureCanvas />;
  }
}

function TimePanel({ variation }: { variation: TimeVariation }) {
  switch (variation) {
    case '2.1-radial':
      return <TimeRadialDial />;
    case '2.2-linear-flow':
      return <TimeLinearFlow />;
    case '2.3-stacked-blocks':
      return <TimeStackedBlocks />;
  }
}

function BrainPanel({ variation }: { variation: BrainVariation }) {
  switch (variation) {
    case '3.1-split-screen':
      return <BrainSplitScreen />;
    case '3.2-infinite-notebook':
      return <BrainInfiniteNotebook />;
    case '3.3-terminal':
      return <BrainTerminal />;
  }
}

export default function ExplorePage() {
  const {
    captureVariation,
    timeVariation,
    brainVariation,
    setCaptureVariation,
    setTimeVariation,
    setBrainVariation,
    captures,
  } = useExploreStore();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Design Exploration Dashboard</h1>
            <p className="text-xs text-zinc-500">
              The External Lobe · 9 variations across 3 feature areas · Open devtools console for perf metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600">{captures.length} captures this session</span>
            <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300">← Main App</a>
          </div>
        </div>

        {/* Variation Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VariationSelector
            label="Area 1: Capture (Input Friction)"
            options={CAPTURE_OPTIONS}
            value={captureVariation}
            onChange={setCaptureVariation}
          />
          <VariationSelector
            label="Area 2: Time Visualization"
            options={TIME_OPTIONS}
            value={timeVariation}
            onChange={setTimeVariation}
          />
          <VariationSelector
            label="Area 3: Second Brain"
            options={BRAIN_OPTIONS}
            value={brainVariation}
            onChange={setBrainVariation}
          />
        </div>
      </header>

      {/* Panels */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
        {/* Capture */}
        <motion.section
          key={captureVariation}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col"
        >
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-400">
              Capture · {CAPTURE_OPTIONS.find((o) => o.id === captureVariation)?.name}
            </span>
          </div>
          <div className="flex-1 min-h-[300px] lg:min-h-0">
            <Suspense fallback={<div className="p-4 text-zinc-600">Loading...</div>}>
              <CapturePanel variation={captureVariation} />
            </Suspense>
          </div>
        </motion.section>

        {/* Time */}
        <motion.section
          key={timeVariation}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col"
        >
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-400">
              Time · {TIME_OPTIONS.find((o) => o.id === timeVariation)?.name}
            </span>
          </div>
          <div className="flex-1 min-h-[300px] lg:min-h-0 p-4">
            <Suspense fallback={<div className="p-4 text-zinc-600">Loading...</div>}>
              <TimePanel variation={timeVariation} />
            </Suspense>
          </div>
        </motion.section>

        {/* Brain */}
        <motion.section
          key={brainVariation}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col"
        >
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-400">
              Brain · {BRAIN_OPTIONS.find((o) => o.id === brainVariation)?.name}
            </span>
          </div>
          <div className="flex-1 min-h-[400px] lg:min-h-0">
            <Suspense fallback={<div className="p-4 text-zinc-600">Loading...</div>}>
              <BrainPanel variation={brainVariation} />
            </Suspense>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

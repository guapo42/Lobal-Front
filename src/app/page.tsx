'use client';

import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import AirlockGatekeeper from '@/components/AirlockGatekeeper';
import LightningCapture from '@/components/LightningCapture';
import RadialTimeDial from '@/components/RadialTimeDial';
import FocusCard from '@/components/FocusCard';

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

  // Use demo tasks if store is empty
  const tasks = storedTasks.length > 0 ? storedTasks : DEMO_TASKS;

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const handleSelectTask = useCallback(
    (id: string | null) => setSelectedTask(id),
    [setSelectedTask]
  );

  return (
    <AirlockGatekeeper>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              The External Lobe
            </h1>
            <p className="text-xs text-zinc-500">Executive function support</p>
          </div>
          <div className="flex items-center gap-3">
            {captures.length > 0 && (
              <span className="text-xs text-zinc-500">
                {captures.length} capture{captures.length !== 1 ? 's' : ''} today
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCaptureOverlayOpen(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-full transition-colors"
            >
              ⚡ Capture
            </motion.button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
          {/* Dial Column */}
          <div className="flex-1 flex flex-col items-center justify-start">
            <RadialTimeDial
              tasks={tasks}
              onSelectTask={handleSelectTask}
              selectedTaskId={selectedTaskId}
            />
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-96 flex flex-col gap-4">
            {/* Focus Card */}
            <FocusCard task={selectedTask} />

            {/* Task List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                Today&apos;s Tasks
              </h2>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    onClick={() => handleSelectTask(task.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-zinc-800'
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: task.color_hex || '#6366f1' }}
                    />
                    <span
                      className={`text-sm ${
                        task.status === 'done'
                          ? 'text-zinc-500 line-through'
                          : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.status === 'active' && (
                      <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                        active
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

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
                      <li key={c.id} className="text-sm text-zinc-300">
                        <span className="text-zinc-600 text-xs mr-2">
                          {new Date(c.captured_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {c.text}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </aside>
        </main>

        {/* Lightning Capture Overlay */}
        <LightningCapture />
      </div>
    </AirlockGatekeeper>
  );
}

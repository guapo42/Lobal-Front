'use client';

import { motion } from 'framer-motion';
import type { Task } from '@/types';
import type { EnergyLevel } from '@/engine/anchor/icnu-engine';
import type { FSMState } from '@/engine/anchor/fsm';
import { springs } from '@/lib/springs';
import EnergySlider from '@/components/EnergySlider';
import EngineStatus from '@/components/EngineStatus';
import FocusCard from '@/components/FocusCard';
import DetailScentsHUD from '@/components/DetailScentsHUD';
import MicroActionList from '@/components/MicroActionList';
import BreadcrumbSidebar from '@/components/BreadcrumbSidebar';
import TaskList from './TaskList';
import RecentCaptures from './RecentCaptures';

interface Capture {
  id: string;
  text: string;
  captured_at: string;
}

interface SidebarPanelProps {
  energy: EnergyLevel;
  onEnergyChange: (level: EnergyLevel) => void;
  fsmState: FSMState;
  selectedTask: Task | null;
  activeTask: Task | null;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onStartTask: (id: string) => void;
  captures: Capture[];
}

export default function SidebarPanel({
  energy,
  onEnergyChange,
  fsmState,
  selectedTask,
  activeTask,
  tasks,
  selectedTaskId,
  onSelectTask,
  onStartTask,
  captures,
}: SidebarPanelProps) {
  const canStartSelected =
    selectedTask && selectedTask.status !== 'done' && fsmState === 'IDLE';

  return (
    <aside className="w-full lg:w-96 flex flex-col gap-4">
      <EnergySlider value={energy} onChange={onEnergyChange} />
      <EngineStatus />
      <FocusCard task={selectedTask} />

      {canStartSelected && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snap}
          onClick={() => onStartTask(selectedTask.id)}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-wt-active text-sm rounded-xl transition-colors"
        >
          Start → Activation Bridge
        </motion.button>
      )}

      <DetailScentsHUD
        visible={fsmState === 'DEEP_FOCUS'}
        taskTitle={activeTask?.title || ''}
      />

      {activeTask && <MicroActionList task={activeTask} />}

      <TaskList
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        onSelect={onSelectTask}
      />

      <BreadcrumbSidebar />

      <RecentCaptures captures={captures} />
    </aside>
  );
}

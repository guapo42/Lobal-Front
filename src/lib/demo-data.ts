/**
 * Centralized demo data for first-load experience.
 *
 * All demo fixtures live here so that a single edit flows everywhere.
 * Used by the main dashboard seed, the /explore variations, and the
 * Brain/Time demos.
 */

import type { Task } from '@/types';

// ── Main app tasks (full Task shape) ─────────────────────────

/**
 * Build main-app demo tasks with times anchored to "today" so the
 * dial shows a plausible schedule regardless of when the user opens.
 * Called (rather than exported as a const) so start_time is fresh.
 */
export function buildDemoTasks(): Task[] {
  const today = (hour: number, minute: number = 0) =>
    new Date(new Date().setHours(hour, minute, 0, 0)).toISOString();

  return [
    {
      id: 'demo-1',
      title: 'Deep Work: Project Sprint',
      icnu_score: { interest: 8, challenge: 7, novelty: 5, urgency: 9 },
      dopamine_rating: 4,
      status: 'active',
      start_time: today(9),
      duration: 120,
      color_hex: '#6366f1',
    },
    {
      id: 'demo-2',
      title: 'Lunch Break',
      icnu_score: { interest: 3, challenge: 1, novelty: 2, urgency: 3 },
      dopamine_rating: 2,
      status: 'todo',
      start_time: today(12),
      duration: 60,
      color_hex: '#22c55e',
    },
    {
      id: 'demo-3',
      title: 'Review & Respond to Messages',
      icnu_score: { interest: 4, challenge: 3, novelty: 3, urgency: 7 },
      dopamine_rating: 2,
      status: 'todo',
      start_time: today(14),
      duration: 45,
      color_hex: '#f59e0b',
    },
    {
      id: 'demo-4',
      title: 'Creative Exploration',
      icnu_score: { interest: 9, challenge: 6, novelty: 9, urgency: 2 },
      dopamine_rating: 5,
      status: 'todo',
      start_time: today(16),
      duration: 90,
      color_hex: '#ec4899',
    },
    {
      id: 'demo-5',
      title: 'Wind Down & Plan Tomorrow',
      icnu_score: { interest: 5, challenge: 2, novelty: 3, urgency: 5 },
      dopamine_rating: 3,
      status: 'todo',
      start_time: today(19),
      duration: 30,
      color_hex: '#8b5cf6',
    },
  ];
}

// ── Time-viz variations (lightweight shape) ──────────────────

export interface DemoTimeTask {
  id: string;
  title: string;
  start_hour: number;
  duration_hours: number;
  color: string;
}

export const DEMO_TIME_TASKS: DemoTimeTask[] = [
  { id: 't1', title: 'Deep Work', start_hour: 9, duration_hours: 2, color: '#6366f1' },
  { id: 't2', title: 'Lunch', start_hour: 12, duration_hours: 1, color: '#22c55e' },
  { id: 't3', title: 'Meetings', start_hour: 14, duration_hours: 1.5, color: '#f59e0b' },
  { id: 't4', title: 'Creative Time', start_hour: 16, duration_hours: 1.5, color: '#ec4899' },
  { id: 't5', title: 'Wind Down', start_hour: 19, duration_hours: 0.5, color: '#8b5cf6' },
];

/**
 * The Three-Stage Pipeline: Capture → Transform → Lock
 *
 * This is the core data flow of the Triple-Engine system:
 *
 * 1. CAPTURE (Pilot): Raw audio/text → string
 * 2. TRANSFORM (Translator): String → validated Task schema
 * 3. LOCK (Anchor): Task schema → state update + FSM transition + UI update
 *
 * Each stage is isolated. The pipeline is non-blocking and fails
 * gracefully at each stage (heuristic fallbacks if LLM is down).
 */

import { parseIntent, type ParsedIntent } from '../translator/intent-parser';
import { validateLLMOutput } from '../anchor/schema-validator';
import type { Task } from '@/types';

// ── Stage types ──

export interface CaptureInput {
  raw: string;
  source: 'voice' | 'text' | 'command_line' | 'gesture';
  captured_at: string;
}

export interface TransformResult {
  intent: ParsedIntent;
  fromLLM: boolean;
  validationErrors: string[];
  transformLatencyMs: number;
}

export interface LockResult {
  task: Task;
  locked: boolean;
  reviewRequired: boolean;
  lockLatencyMs: number;
}

export interface PipelineResult {
  capture: CaptureInput;
  transform: TransformResult;
  lock: LockResult;
  totalLatencyMs: number;
}

// ── Pipeline execution ──

/**
 * Execute the full Capture → Transform → Lock pipeline.
 *
 * Returns the created Task if successful, or a partially
 * completed result with error details at whatever stage failed.
 */
export async function executePipeline(
  input: CaptureInput
): Promise<PipelineResult> {
  const pipelineStart = performance.now();

  // ── Stage 1: Capture (already done — input is the capture) ──
  console.log(`[Pipeline:Capture] Source: ${input.source}, Length: ${input.raw.length} chars`);

  // ── Stage 2: Transform ──
  const transformStart = performance.now();
  const { intent, fromLLM, validationErrors } = await parseIntent(input.raw);
  const transformLatencyMs = performance.now() - transformStart;

  console.log(
    `[Pipeline:Transform] ${fromLLM ? 'LLM' : 'Heuristic'} parsed in ${transformLatencyMs.toFixed(0)}ms` +
    (validationErrors.length > 0 ? ` (${validationErrors.length} warnings)` : '')
  );

  const transform: TransformResult = {
    intent,
    fromLLM,
    validationErrors,
    transformLatencyMs,
  };

  // ── Stage 3: Lock ──
  const lockStart = performance.now();

  // Final validation before writing
  const finalValidation = validateLLMOutput('task', intent as unknown as Record<string, unknown>);
  const reviewRequired = finalValidation.flaggedForReview || validationErrors.length > 0;

  // Build the Task object
  const task: Task = {
    id: crypto.randomUUID(),
    title: intent.title,
    icnu_score: {
      interest: intent.icnu_interest,
      challenge: intent.icnu_challenge,
      novelty: intent.icnu_novelty,
      urgency: intent.icnu_urgency,
    },
    dopamine_rating: intent.dopamine_rating,
    status: intent.status,
    start_time: undefined,
    duration: intent.estimated_minutes,
    color_hex: undefined, // will be set by urgency color in the UI
  };

  const lockLatencyMs = performance.now() - lockStart;

  console.log(
    `[Pipeline:Lock] Task "${task.title}" locked in ${lockLatencyMs.toFixed(0)}ms` +
    (reviewRequired ? ' (FLAGGED FOR REVIEW)' : '')
  );

  const lock: LockResult = {
    task,
    locked: true,
    reviewRequired,
    lockLatencyMs,
  };

  return {
    capture: input,
    transform,
    lock,
    totalLatencyMs: performance.now() - pipelineStart,
  };
}

/**
 * Quick capture — minimal pipeline for < 3s captures.
 * Skips LLM entirely, uses only heuristic parsing.
 * Designed for the Pilot's "lightning capture" moments.
 */
export function quickCapture(raw: string): Task {
  const words = raw.trim().split(/\s+/);
  const title =
    raw.length > 60 ? raw.substring(0, 57) + '...' : raw;

  return {
    id: crypto.randomUUID(),
    title,
    icnu_score: { interest: 5, challenge: 5, novelty: 5, urgency: 5 },
    dopamine_rating: 3,
    status: 'todo',
    duration: Math.max(15, words.length * 3),
  };
}

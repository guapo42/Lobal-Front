/**
 * Type guards for LLM output validation.
 *
 * Runtime checks to safely narrow `Record<string, unknown>` into
 * typed interfaces. These are the final safety gate after schema
 * validation — they prove at runtime that the shape matches the
 * TypeScript type, so we never need `as unknown as` casts.
 */

import type { ParsedIntent, MicroAction, ExpandedThought } from '../translator/intent-parser';

const VALID_DOPAMINE_RATINGS = new Set([1, 2, 3, 4, 5]);
const VALID_STATUSES = new Set(['todo', 'active', 'done']);

export function isParsedIntent(data: unknown): data is ParsedIntent {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.title === 'string' &&
    (d.project_id === null || typeof d.project_id === 'string' || d.project_id === undefined) &&
    typeof d.priority_weight === 'number' &&
    typeof d.estimated_minutes === 'number' &&
    typeof d.icnu_interest === 'number' &&
    typeof d.icnu_challenge === 'number' &&
    typeof d.icnu_novelty === 'number' &&
    typeof d.icnu_urgency === 'number' &&
    typeof d.dopamine_rating === 'number' &&
    VALID_DOPAMINE_RATINGS.has(d.dopamine_rating as number) &&
    typeof d.status === 'string' &&
    VALID_STATUSES.has(d.status) &&
    Array.isArray(d.suggested_tools) &&
    d.suggested_tools.every((t) => typeof t === 'string')
  );
}

export function isMicroAction(data: unknown): data is MicroAction {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.text === 'string' &&
    typeof d.estimated_minutes === 'number' &&
    typeof d.order === 'number'
  );
}

export function isExpandedThought(data: unknown): data is ExpandedThought {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.expanded_text === 'string' &&
    (d.likely_project === null || typeof d.likely_project === 'string') &&
    Array.isArray(d.related_topics) &&
    d.related_topics.every((t) => typeof t === 'string') &&
    typeof d.suggested_next_action === 'string'
  );
}

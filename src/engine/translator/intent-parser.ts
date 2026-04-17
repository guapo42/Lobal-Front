/**
 * Intent Parser — Transforms messy Pilot input into structured data.
 *
 * The core Capture→Transform flow. Takes raw voice/text dump and
 * extracts:
 * - Project ID association
 * - ICNU priority weights
 * - Estimated duration
 * - Task title (cleaned)
 * - Sub-task suggestions
 *
 * Uses LLM for semantic parsing, then validates through the
 * Anchor's schema validator before writing to state.
 */

import { requestLLM } from './llm-client';
import { validateLLMOutput } from '../anchor/schema-validator';
import { isParsedIntent, isMicroAction, isExpandedThought } from '../anchor/type-guards';

// ── Prompt templates ──

const INTENT_SYSTEM_PROMPT = `You are the Translator engine of "The External Lobe," a productivity system for ADHD professionals.

Your job is to parse messy, stream-of-consciousness input into structured task data.

RULES:
- Extract the core actionable intent from rambling input
- Infer ICNU scores (Interest, Challenge, Novelty, Urgency) on a 0-10 scale based on language cues
- Estimate duration in minutes (be conservative — ADHD time blindness means users underestimate)
- If the input mentions a project name, extract it as project_id (lowercase, hyphenated)
- Suggest 1-3 tools the user likely needs (only common dev/productivity tools)
- Generate a clean, concise title (max 60 chars)

RESPOND WITH ONLY A JSON OBJECT matching this exact shape:
{
  "title": "string",
  "project_id": "string or null",
  "priority_weight": number (0-100),
  "estimated_minutes": number,
  "icnu_interest": number (0-10),
  "icnu_challenge": number (0-10),
  "icnu_novelty": number (0-10),
  "icnu_urgency": number (0-10),
  "dopamine_rating": number (1-5),
  "status": "todo",
  "suggested_tools": ["string"]
}`;

const MICRO_ACTION_SYSTEM_PROMPT = `You are the Translator engine generating "Micro-Actions" to break the Wall of Awful.

Given a task, generate 3-7 tiny, concrete steps that each take under 5 minutes.
The first step should be trivially easy (e.g., "Open the file", "Write one sentence").

RULES:
- Each step must be a single physical or cognitive action
- Avoid vague steps like "think about" or "plan" — be concrete
- Order from easiest to hardest
- Include estimated_minutes for each (1-5)

RESPOND WITH ONLY A JSON ARRAY of objects:
[{"text": "string", "estimated_minutes": number, "order": number}]`;

const EXPAND_THOUGHT_SYSTEM_PROMPT = `You are the Translator engine helping an ADHD professional recover context.

Given a fragment of text (possibly captured at 2am, mid-thought, or during hyperfocus), expand it into a full structured note.

Use the surrounding context (if provided) to infer what the user was thinking about.

RESPOND WITH ONLY A JSON OBJECT:
{
  "expanded_text": "string (2-4 sentences expanding the thought)",
  "likely_project": "string or null",
  "related_topics": ["string"],
  "suggested_next_action": "string"
}`;

// ── Public API ──

export interface ParsedIntent {
  title: string;
  project_id: string | null;
  priority_weight: number;
  estimated_minutes: number;
  icnu_interest: number;
  icnu_challenge: number;
  icnu_novelty: number;
  icnu_urgency: number;
  dopamine_rating: 1 | 2 | 3 | 4 | 5;
  status: 'todo';
  suggested_tools: string[];
}

export interface MicroAction {
  text: string;
  estimated_minutes: number;
  order: number;
}

export interface ExpandedThought {
  expanded_text: string;
  likely_project: string | null;
  related_topics: string[];
  suggested_next_action: string;
}

/**
 * Parse raw messy input into a structured task.
 * Falls back to heuristic parsing if LLM is unavailable.
 */
export async function parseIntent(rawInput: string): Promise<{
  intent: ParsedIntent;
  fromLLM: boolean;
  validationErrors: string[];
}> {
  try {
    const response = await requestLLM({
      prompt: `Parse this input into a task:\n\n"${rawInput}"`,
      systemPrompt: INTENT_SYSTEM_PROMPT,
      schema: 'task',
      temperature: 0.2,
    });

    if (response.parsed && response.validation?.valid && response.validation.sanitized) {
      // Runtime type guard — prove the sanitized data matches ParsedIntent
      if (isParsedIntent(response.validation.sanitized)) {
        return {
          intent: response.validation.sanitized,
          fromLLM: true,
          validationErrors: [],
        };
      }
      // Passed schema but failed shape check — this shouldn't happen
      // but fall through to heuristic rather than unsafe cast
      return {
        intent: heuristicParse(rawInput),
        fromLLM: false,
        validationErrors: ['LLM output passed schema but failed type guard'],
      };
    }

    // LLM responded but validation failed — use fallback + report errors
    return {
      intent: heuristicParse(rawInput),
      fromLLM: false,
      validationErrors: response.validation?.errors || ['Failed to parse LLM response'],
    };
  } catch {
    // LLM unavailable — fall back to heuristic
    return {
      intent: heuristicParse(rawInput),
      fromLLM: false,
      validationErrors: ['LLM unavailable, using heuristic parsing'],
    };
  }
}

/**
 * Generate micro-actions to break the Wall of Awful.
 * Falls back to template if LLM unavailable.
 */
export async function generateMicroActions(
  taskTitle: string,
  taskContext?: string
): Promise<{ actions: MicroAction[]; fromLLM: boolean }> {
  try {
    const response = await requestLLM({
      prompt: `Generate micro-actions for this task:\n\nTitle: "${taskTitle}"\n${taskContext ? `Context: ${taskContext}` : ''}`,
      systemPrompt: MICRO_ACTION_SYSTEM_PROMPT,
      temperature: 0.4,
    });

    if (response.raw) {
      try {
        const jsonMatch = response.raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed: unknown = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            // Runtime type guard each element before trusting it
            const valid = parsed.every((a) => {
              if (!isMicroAction(a)) return false;
              const v = validateLLMOutput(
                'micro_action',
                a as unknown as Record<string, unknown>
              );
              return v.valid;
            });
            if (valid) {
              return { actions: parsed as MicroAction[], fromLLM: true };
            }
          }
        }
      } catch {
        // Parse failed, fall through to template
      }
    }
  } catch {
    // LLM unavailable
  }

  return {
    actions: templateMicroActions(taskTitle),
    fromLLM: false,
  };
}

/**
 * Expand a half-formed thought into a structured note.
 * "What did I mean?" feature.
 */
export async function expandThought(
  fragment: string,
  recentContext?: string[]
): Promise<{ expanded: ExpandedThought; fromLLM: boolean }> {
  try {
    const contextStr = recentContext?.length
      ? `\nRecent context:\n${recentContext.map((c) => `- ${c}`).join('\n')}`
      : '';

    const response = await requestLLM({
      prompt: `Expand this thought fragment:\n\n"${fragment}"${contextStr}`,
      systemPrompt: EXPAND_THOUGHT_SYSTEM_PROMPT,
      temperature: 0.5,
    });

    if (response.parsed && isExpandedThought(response.parsed)) {
      return {
        expanded: response.parsed,
        fromLLM: true,
      };
    }
  } catch {
    // LLM unavailable
  }

  return {
    expanded: {
      expanded_text: fragment,
      likely_project: null,
      related_topics: [],
      suggested_next_action: 'Review and expand this thought manually',
    },
    fromLLM: false,
  };
}

// ── Heuristic fallbacks (no LLM needed) ──

function heuristicParse(input: string): ParsedIntent {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);

  // Extract project mention (e.g., "project omega" or "#omega")
  const projectMatch = trimmed.match(/(?:project[:\s]+|#)(\w+)/i);
  const project_id = projectMatch ? projectMatch[1].toLowerCase() : null;

  // Urgency cues
  const urgencyWords = ['urgent', 'asap', 'deadline', 'today', 'now', 'critical', 'blocking'];
  const urgency = Math.min(
    10,
    urgencyWords.filter((w) => trimmed.toLowerCase().includes(w)).length * 3 + 3
  );

  // Interest cues
  const interestWords = ['cool', 'interesting', 'want', 'love', 'excited', 'fun', 'explore'];
  const interest = Math.min(
    10,
    interestWords.filter((w) => trimmed.toLowerCase().includes(w)).length * 2 + 4
  );

  // Estimate duration from word count (rough heuristic)
  const estimated_minutes = Math.max(15, Math.min(120, words.length * 3));

  // Clean title: first sentence or first 60 chars
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  const title =
    firstSentence.length > 60
      ? firstSentence.substring(0, 57) + '...'
      : firstSentence;

  return {
    title,
    project_id,
    priority_weight: urgency * 5 + interest * 3,
    estimated_minutes,
    icnu_interest: interest,
    icnu_challenge: 5,
    icnu_novelty: 5,
    icnu_urgency: urgency,
    dopamine_rating: Math.min(5, Math.max(1, Math.round(interest / 2))) as 1 | 2 | 3 | 4 | 5,
    status: 'todo',
    suggested_tools: [],
  };
}

function templateMicroActions(taskTitle: string): MicroAction[] {
  return [
    { text: `Open workspace for "${taskTitle}"`, estimated_minutes: 1, order: 0 },
    { text: 'Review where you left off (2 min max)', estimated_minutes: 2, order: 1 },
    { text: 'Write one sentence about your approach', estimated_minutes: 2, order: 2 },
    { text: 'Do the single smallest action', estimated_minutes: 3, order: 3 },
    { text: 'Set a 15-minute timer and work', estimated_minutes: 5, order: 4 },
    { text: `Check progress on "${taskTitle}"`, estimated_minutes: 2, order: 5 },
  ];
}

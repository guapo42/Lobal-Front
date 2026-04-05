/**
 * The Triple-Engine Ecosystem
 *
 * ┌─────────────────────────────────────────────────┐
 * │  PILOT (You)                                    │
 * │  Strategy · Intent · Creative Sparks            │
 * │  Voice/Text Capture → Raw String                │
 * └─────────────┬───────────────────────────────────┘
 *               │ Capture
 *               ▼
 * ┌─────────────────────────────────────────────────┐
 * │  TRANSLATOR (LLM)                               │
 * │  Intent Parsing · Sub-tasking · RAG             │
 * │  Raw String → Validated Task Schema             │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
 * │  │ Scrubber  │  │ Parser   │  │ Micro-Action │  │
 * │  │ (PII)     │  │ (Intent) │  │ Generator    │  │
 * │  └──────────┘  └──────────┘  └──────────────┘  │
 * └─────────────┬───────────────────────────────────┘
 *               │ Transform
 *               ▼
 * ┌─────────────────────────────────────────────────┐
 * │  ANCHOR (Deterministic Code)                    │
 * │  FSM · Schema Validation · Guardrails           │
 * │  Task Schema → State + UI Update                │
 * │  ┌──────┐  ┌───────────┐  ┌──────────────────┐ │
 * │  │ FSM  │  │ Validator │  │ Guardrails        │ │
 * │  │      │  │ (Filter)  │  │ Body Double       │ │
 * │  │      │  │           │  │ Anti-Paralysis    │ │
 * │  │      │  │           │  │ Visual Decay      │ │
 * │  └──────┘  └───────────┘  └──────────────────┘ │
 * └─────────────────────────────────────────────────┘
 */

// Anchor Engine
export { transition, createFSMContext, shouldTriggerAntiParalysis } from './anchor/fsm';
export type { FSMState, FSMEvent, FSMContext } from './anchor/fsm';
export { validateLLMOutput, isKnownTool, registerTool } from './anchor/schema-validator';
export { useAnchorStore } from './anchor/store';
export {
  startBodyDouble,
  stopBodyDouble,
  generateAntiParalysisEntries,
  completedTaskOpacity,
  isCompletedTaskVisible,
  shouldSuggestBreak,
  startSnapshotTimer,
  stopSnapshotTimer,
} from './anchor/guardrails';

// Translator Engine
export { requestLLM, configureLLM, isOllamaAvailable } from './translator/llm-client';
export { parseIntent, generateMicroActions, expandThought } from './translator/intent-parser';
export { scrub, containsPII, setForbiddenTerms, addForbiddenTerm } from './translator/scrubber';

// Pipeline
export { executePipeline, quickCapture } from './pipeline/capture-transform-lock';

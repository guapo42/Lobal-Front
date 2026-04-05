/**
 * Schema Validator — The "Hallucination Filter"
 *
 * Every LLM output must match a predefined JSON schema before
 * the Anchor engine writes it to state. If validation fails,
 * the output is flagged for human review rather than silently
 * applied.
 *
 * This is the deterministic gate that prevents the LLM from:
 * - Creating tasks with invalid fields
 * - Suggesting non-existent tools
 * - Producing malformed time estimates
 * - Injecting unexpected data shapes
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  flaggedForReview: boolean;
  sanitized?: Record<string, unknown>;
}

// ── Known tool registry (user's actual toolset) ──

const KNOWN_TOOLS = new Set([
  'vscode', 'terminal', 'browser', 'figma', 'notion', 'slack',
  'github', 'linear', 'calendar', 'email', 'obsidian', 'arc',
  'iterm', 'cursor', 'postman', 'docker', 'postgres', 'sqlite',
]);

// ── Schema definitions ──

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: (string | number)[];
  pattern?: RegExp;
}

type SchemaDefinition = Record<string, SchemaField>;

const TASK_SCHEMA: SchemaDefinition = {
  title: { type: 'string', required: true },
  project_id: { type: 'string' },
  priority_weight: { type: 'number', min: 0, max: 100 },
  estimated_minutes: { type: 'number', min: 1, max: 480 },
  icnu_interest: { type: 'number', min: 0, max: 10 },
  icnu_challenge: { type: 'number', min: 0, max: 10 },
  icnu_novelty: { type: 'number', min: 0, max: 10 },
  icnu_urgency: { type: 'number', min: 0, max: 10 },
  dopamine_rating: { type: 'number', min: 1, max: 5, enum: [1, 2, 3, 4, 5] },
  status: { type: 'string', enum: ['todo', 'active', 'done'] },
  suggested_tools: { type: 'array' },
};

const MICRO_ACTION_SCHEMA: SchemaDefinition = {
  text: { type: 'string', required: true },
  estimated_minutes: { type: 'number', min: 1, max: 30 },
  order: { type: 'number', min: 0 },
};

const RAG_RESULT_SCHEMA: SchemaDefinition = {
  summary: { type: 'string', required: true },
  confidence: { type: 'number', min: 0, max: 1 },
  source_ids: { type: 'array' },
  reasoning: { type: 'string' },
};

const SCHEMAS: Record<string, SchemaDefinition> = {
  task: TASK_SCHEMA,
  micro_action: MICRO_ACTION_SCHEMA,
  rag_result: RAG_RESULT_SCHEMA,
};

// ── Validation engine ──

function validateField(
  key: string,
  value: unknown,
  field: SchemaField
): string[] {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    if (field.required) errors.push(`Missing required field: ${key}`);
    return errors;
  }

  // Type check
  if (field.type === 'array') {
    if (!Array.isArray(value)) errors.push(`${key}: expected array, got ${typeof value}`);
  } else if (typeof value !== field.type) {
    errors.push(`${key}: expected ${field.type}, got ${typeof value}`);
    return errors; // can't do range checks on wrong type
  }

  // Range checks
  if (field.type === 'number' && typeof value === 'number') {
    if (field.min !== undefined && value < field.min)
      errors.push(`${key}: ${value} below minimum ${field.min}`);
    if (field.max !== undefined && value > field.max)
      errors.push(`${key}: ${value} above maximum ${field.max}`);
  }

  // Enum check
  if (field.enum && !field.enum.includes(value as string | number)) {
    errors.push(`${key}: "${value}" not in allowed values [${field.enum.join(', ')}]`);
  }

  // Pattern check
  if (field.pattern && typeof value === 'string' && !field.pattern.test(value)) {
    errors.push(`${key}: "${value}" doesn't match required pattern`);
  }

  return errors;
}

/**
 * Validate an LLM output against a named schema.
 * Returns sanitized data if valid, or errors + review flag if not.
 */
export function validateLLMOutput(
  schemaName: string,
  data: Record<string, unknown>
): ValidationResult {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown schema: ${schemaName}`],
      flaggedForReview: true,
    };
  }

  const errors: string[] = [];
  let flaggedForReview = false;

  // Validate each field against schema
  for (const [key, field] of Object.entries(schema)) {
    errors.push(...validateField(key, data[key], field));
  }

  // Check for unknown fields (LLM hallucinating extra data)
  const knownKeys = new Set(Object.keys(schema));
  for (const key of Object.keys(data)) {
    if (!knownKeys.has(key)) {
      errors.push(`Unknown field "${key}" — not in schema, may be hallucinated`);
      flaggedForReview = true;
    }
  }

  // Tool validation: check suggested tools against known registry
  if (Array.isArray(data.suggested_tools)) {
    for (const tool of data.suggested_tools) {
      if (typeof tool === 'string' && !KNOWN_TOOLS.has(tool.toLowerCase())) {
        errors.push(`Unknown tool "${tool}" — not in user's Known Tools registry`);
        flaggedForReview = true;
      }
    }
  }

  if (errors.length > 0) {
    console.warn(`[Anchor:Schema] Validation failed for "${schemaName}":`, errors);
  }

  // Build sanitized output (only known fields, clamped to ranges)
  const sanitized: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    let value = data[key];
    if (value === undefined) continue;

    // Clamp numbers to range
    if (field.type === 'number' && typeof value === 'number') {
      if (field.min !== undefined) value = Math.max(field.min, value as number);
      if (field.max !== undefined) value = Math.min(field.max, value as number);
    }

    sanitized[key] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    flaggedForReview,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Quick check: is a tool in the user's known registry?
 */
export function isKnownTool(tool: string): boolean {
  return KNOWN_TOOLS.has(tool.toLowerCase());
}

/**
 * Add a tool to the known registry at runtime.
 */
export function registerTool(tool: string): void {
  KNOWN_TOOLS.add(tool.toLowerCase());
}

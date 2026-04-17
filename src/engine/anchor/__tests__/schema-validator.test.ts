import { describe, it, expect, beforeEach } from 'vitest';
import { validateLLMOutput, isKnownTool, registerTool } from '../schema-validator';

describe('validateLLMOutput: task schema', () => {
  const validTask = {
    title: 'Write tests',
    project_id: 'external-lobe',
    priority_weight: 50,
    estimated_minutes: 30,
    icnu_interest: 8,
    icnu_challenge: 6,
    icnu_novelty: 4,
    icnu_urgency: 5,
    dopamine_rating: 4,
    status: 'todo',
    suggested_tools: ['vscode'],
  };

  it('accepts a well-formed task', () => {
    const result = validateLLMOutput('task', validTask);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toBeDefined();
    expect(result.sanitized?.title).toBe('Write tests');
  });

  it('rejects missing required field (title)', () => {
    const { title: _t, ...withoutTitle } = validTask;
    void _t;
    const result = validateLLMOutput('task', withoutTitle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('title'))).toBe(true);
  });

  it('rejects wrong type for numeric field', () => {
    const result = validateLLMOutput('task', {
      ...validTask,
      estimated_minutes: 'fifteen' as unknown as number,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('estimated_minutes'))).toBe(true);
  });

  it('rejects value below minimum', () => {
    const result = validateLLMOutput('task', { ...validTask, estimated_minutes: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('below minimum'))).toBe(true);
  });

  it('rejects value above maximum', () => {
    const result = validateLLMOutput('task', { ...validTask, icnu_interest: 15 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('above maximum'))).toBe(true);
  });

  it('rejects dopamine_rating not in enum', () => {
    const result = validateLLMOutput('task', { ...validTask, dopamine_rating: 6 });
    expect(result.valid).toBe(false);
  });

  it('rejects status not in enum', () => {
    const result = validateLLMOutput('task', { ...validTask, status: 'in_progress' });
    expect(result.valid).toBe(false);
  });

  it('flags unknown fields for review (hallucination detection)', () => {
    const result = validateLLMOutput('task', {
      ...validTask,
      mystery_field: 'something the LLM made up',
    });
    expect(result.flaggedForReview).toBe(true);
    expect(result.errors.some((e) => e.includes('mystery_field'))).toBe(true);
  });

  it('flags unknown tools as potential hallucinations', () => {
    const result = validateLLMOutput('task', {
      ...validTask,
      suggested_tools: ['vscode', 'nonexistent-ide-9000'],
    });
    expect(result.flaggedForReview).toBe(true);
    expect(result.errors.some((e) => e.includes('nonexistent-ide-9000'))).toBe(true);
  });

  it('accepts known tools regardless of case', () => {
    const result = validateLLMOutput('task', {
      ...validTask,
      suggested_tools: ['VSCode', 'TERMINAL', 'GitHub'],
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateLLMOutput: micro_action schema', () => {
  it('accepts a valid micro-action', () => {
    const result = validateLLMOutput('micro_action', {
      text: 'Open pipeline.py',
      estimated_minutes: 1,
      order: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects estimated_minutes > 30', () => {
    const result = validateLLMOutput('micro_action', {
      text: 'Too long',
      estimated_minutes: 45,
      order: 0,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateLLMOutput: rag_result schema', () => {
  it('accepts confidence in [0, 1]', () => {
    const result = validateLLMOutput('rag_result', {
      summary: 'Found 3 matches',
      confidence: 0.75,
      source_ids: ['a', 'b', 'c'],
      reasoning: 'High token overlap',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects confidence > 1', () => {
    const result = validateLLMOutput('rag_result', {
      summary: 's',
      confidence: 1.5,
      source_ids: [],
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateLLMOutput: unknown schema', () => {
  it('returns valid=false and flags for review', () => {
    const result = validateLLMOutput('mystery_schema', { x: 1 });
    expect(result.valid).toBe(false);
    expect(result.flaggedForReview).toBe(true);
  });
});

describe('Known Tools registry', () => {
  it('isKnownTool returns true for common tools', () => {
    expect(isKnownTool('vscode')).toBe(true);
    expect(isKnownTool('github')).toBe(true);
    expect(isKnownTool('terminal')).toBe(true);
  });

  it('isKnownTool returns false for unknown tools', () => {
    expect(isKnownTool('magic-compiler-9000')).toBe(false);
  });

  it('registerTool adds to registry', () => {
    expect(isKnownTool('my-custom-tool')).toBe(false);
    registerTool('my-custom-tool');
    expect(isKnownTool('my-custom-tool')).toBe(true);
  });

  it('isKnownTool is case-insensitive', () => {
    expect(isKnownTool('VSCode')).toBe(true);
    expect(isKnownTool('TERMINAL')).toBe(true);
  });
});

describe('Sanitization: clamps out-of-range numbers when valid', () => {
  // Note: current impl rejects out-of-range; clamping only happens on
  // already-valid data. This test verifies that valid data passes through
  // with all fields preserved.
  beforeEach(() => {
    // no-op
  });

  it('returns all original fields for valid input', () => {
    const input = {
      title: 'Test',
      estimated_minutes: 30,
      icnu_interest: 5,
      icnu_challenge: 5,
      icnu_novelty: 5,
      icnu_urgency: 5,
      dopamine_rating: 3,
      status: 'todo',
      priority_weight: 50,
      suggested_tools: [],
    };
    const result = validateLLMOutput('task', input);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toEqual(expect.objectContaining({
      title: 'Test',
      estimated_minutes: 30,
    }));
  });
});

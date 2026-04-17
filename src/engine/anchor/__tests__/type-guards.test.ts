import { describe, it, expect } from 'vitest';
import { isParsedIntent, isMicroAction, isExpandedThought } from '../type-guards';

describe('isParsedIntent', () => {
  const valid = {
    title: 'Do the thing',
    project_id: 'omega',
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

  it('accepts well-formed intent', () => {
    expect(isParsedIntent(valid)).toBe(true);
  });

  it('accepts null project_id', () => {
    expect(isParsedIntent({ ...valid, project_id: null })).toBe(true);
  });

  it('rejects when status is not in the allowed set', () => {
    expect(isParsedIntent({ ...valid, status: 'started' })).toBe(false);
  });

  it('rejects when dopamine_rating is out of range', () => {
    expect(isParsedIntent({ ...valid, dopamine_rating: 7 })).toBe(false);
  });

  it('rejects when suggested_tools contains non-strings', () => {
    expect(isParsedIntent({ ...valid, suggested_tools: ['vscode', 42] })).toBe(false);
  });

  it('rejects when a required string field is missing', () => {
    const { title: _t, ...withoutTitle } = valid;
    void _t;
    expect(isParsedIntent(withoutTitle)).toBe(false);
  });

  it('rejects null, undefined, and primitives', () => {
    expect(isParsedIntent(null)).toBe(false);
    expect(isParsedIntent(undefined)).toBe(false);
    expect(isParsedIntent('string')).toBe(false);
    expect(isParsedIntent(123)).toBe(false);
  });
});

describe('isMicroAction', () => {
  it('accepts well-formed micro-action', () => {
    expect(isMicroAction({ text: 'Open file', estimated_minutes: 1, order: 0 })).toBe(true);
  });

  it('rejects missing text', () => {
    expect(isMicroAction({ estimated_minutes: 1, order: 0 })).toBe(false);
  });

  it('rejects wrong type for estimated_minutes', () => {
    expect(isMicroAction({ text: 'x', estimated_minutes: '1', order: 0 })).toBe(false);
  });
});

describe('isExpandedThought', () => {
  const valid = {
    expanded_text: 'You were thinking about...',
    likely_project: 'omega',
    related_topics: ['auth', 'api'],
    suggested_next_action: 'Open the schema file',
  };

  it('accepts well-formed expanded thought', () => {
    expect(isExpandedThought(valid)).toBe(true);
  });

  it('accepts null likely_project', () => {
    expect(isExpandedThought({ ...valid, likely_project: null })).toBe(true);
  });

  it('rejects when related_topics has non-strings', () => {
    expect(isExpandedThought({ ...valid, related_topics: ['a', 123] })).toBe(false);
  });
});

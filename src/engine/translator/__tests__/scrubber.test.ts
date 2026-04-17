import { describe, it, expect, beforeEach } from 'vitest';
import {
  scrub,
  containsPII,
  setForbiddenTerms,
  addForbiddenTerm,
} from '../scrubber';

describe('scrub: email redaction', () => {
  it('redacts a standard email', () => {
    const result = scrub('Ping alice@example.com about the launch');
    expect(result.scrubbed).toBe('Ping [EMAIL_REDACTED] about the launch');
    expect(result.containedPII).toBe(true);
    expect(result.redactions).toHaveLength(1);
    expect(result.redactions[0].reason).toBe('email address');
  });

  it('redacts multiple emails in one string', () => {
    const result = scrub('cc: a@x.com and b@y.co.uk and c@z.io');
    expect(result.scrubbed).not.toContain('@x.com');
    expect(result.scrubbed).not.toContain('@y.co.uk');
    expect(result.scrubbed).not.toContain('@z.io');
  });
});

describe('scrub: phone, SSN, IP, API key', () => {
  it('redacts phone numbers', () => {
    const result = scrub('Call 555-123-4567 or 555.123.4567');
    expect(result.scrubbed).not.toContain('555-123-4567');
    expect(result.scrubbed).not.toContain('555.123.4567');
  });

  it('redacts SSNs', () => {
    const result = scrub('SSN: 123-45-6789');
    expect(result.scrubbed).toContain('[SSN_REDACTED]');
    expect(result.scrubbed).not.toContain('123-45-6789');
  });

  it('redacts IP addresses', () => {
    const result = scrub('Server at 192.168.1.42');
    expect(result.scrubbed).toContain('[IP_REDACTED]');
  });

  it('redacts bearer/API keys', () => {
    const result = scrub('token-abc123def456ghi789jkl012mno345');
    expect(result.scrubbed).toContain('[API_KEY_REDACTED]');
  });

  it('redacts Visa/Mastercard/Amex card numbers', () => {
    const result = scrub('Card: 4532148803436467');
    expect(result.scrubbed).toContain('[CARD_REDACTED]');
  });
});

describe('scrub: clean input passes through', () => {
  it('leaves a normal task description untouched', () => {
    const input = 'Refactor the radial dial component to use Focus Score';
    const result = scrub(input);
    expect(result.scrubbed).toBe(input);
    expect(result.containedPII).toBe(false);
    expect(result.redactions).toHaveLength(0);
  });
});

describe('containsPII', () => {
  it('returns true when PII is present', () => {
    expect(containsPII('email me at bob@test.com')).toBe(true);
    expect(containsPII('call 555-123-4567')).toBe(true);
  });

  it('returns false on clean input', () => {
    expect(containsPII('just some plain text')).toBe(false);
  });
});

describe('Forbidden terms', () => {
  beforeEach(() => {
    // Reset the forbidden terms between tests
    setForbiddenTerms({});
  });

  it('setForbiddenTerms replaces the entire list', () => {
    setForbiddenTerms({ 'Project Omega': '[PROJECT_REDACTED]' });
    const result = scrub('Working on Project Omega today');
    expect(result.scrubbed).toContain('[PROJECT_REDACTED]');
    expect(result.scrubbed).not.toContain('Project Omega');
  });

  it('addForbiddenTerm is case-insensitive', () => {
    addForbiddenTerm('ClientName', '[REDACTED]');
    const result = scrub('Met with clientname and CLIENTNAME today');
    expect(result.scrubbed).not.toContain('clientname');
    expect(result.scrubbed).not.toContain('CLIENTNAME');
    expect(result.scrubbed).toContain('[REDACTED]');
  });

  it('addForbiddenTerm uses auto-generated replacement when none given', () => {
    addForbiddenTerm('SECRET');
    const result = scrub('The SECRET is out');
    expect(result.scrubbed).toContain('[SECRET_REDACTED]');
  });

  it('addForbiddenTerm uses custom replacement', () => {
    addForbiddenTerm('InternalToolX', '[TOOL]');
    const result = scrub('Deploy with InternalToolX');
    expect(result.scrubbed).toContain('[TOOL]');
  });
});

/**
 * Deterministic PII Scrubber — Security Layer
 *
 * Before any data is sent to a cloud LLM, this module:
 * 1. Strips PII patterns (emails, phone numbers, SSNs, IPs)
 * 2. Replaces forbidden terms from user-configurable blocklist
 * 3. Redacts anything matching project-specific patterns
 *
 * For local LLMs (Ollama), scrubbing can be bypassed.
 */

interface ScrubResult {
  scrubbed: string;
  redactions: { original: string; replacement: string; reason: string }[];
  containedPII: boolean;
}

// ── Pattern definitions ──

const PII_PATTERNS: { pattern: RegExp; replacement: string; reason: string }[] = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
    reason: 'email address',
  },
  {
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
    reason: 'phone number',
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
    reason: 'Social Security Number',
  },
  {
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
    reason: 'IP address',
  },
  {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    replacement: '[CARD_REDACTED]',
    reason: 'credit card number',
  },
  {
    // API keys / tokens (common patterns: long alphanumeric strings with prefixes)
    pattern: /\b(?:sk|pk|api|token|key|secret|bearer)[-_][A-Za-z0-9]{20,}\b/gi,
    replacement: '[API_KEY_REDACTED]',
    reason: 'API key or token',
  },
];

// ── Forbidden terms store ──

let forbiddenTerms: Map<string, string> = new Map();

/**
 * Configure project-specific forbidden terms.
 * Maps the forbidden term to its replacement.
 */
export function setForbiddenTerms(terms: Record<string, string>): void {
  forbiddenTerms = new Map(Object.entries(terms));
}

/**
 * Add a single forbidden term.
 */
export function addForbiddenTerm(term: string, replacement?: string): void {
  forbiddenTerms.set(term, replacement || `[${term.toUpperCase()}_REDACTED]`);
}

/**
 * Scrub a string of PII and forbidden terms.
 */
export function scrub(input: string): ScrubResult {
  let scrubbed = input;
  const redactions: ScrubResult['redactions'] = [];

  // 1. PII pattern scrubbing
  for (const { pattern, replacement, reason } of PII_PATTERNS) {
    const matches = scrubbed.match(pattern);
    if (matches) {
      for (const match of matches) {
        redactions.push({ original: match, replacement, reason });
      }
      scrubbed = scrubbed.replace(pattern, replacement);
    }
  }

  // 2. Forbidden terms scrubbing (case-insensitive)
  for (const [term, replacement] of forbiddenTerms) {
    const regex = new RegExp(escapeRegex(term), 'gi');
    const matches = scrubbed.match(regex);
    if (matches) {
      for (const match of matches) {
        redactions.push({ original: match, replacement, reason: 'forbidden term' });
      }
      scrubbed = scrubbed.replace(regex, replacement);
    }
  }

  return {
    scrubbed,
    redactions,
    containedPII: redactions.length > 0,
  };
}

/**
 * Check if a string contains PII without modifying it.
 */
export function containsPII(input: string): boolean {
  for (const { pattern } of PII_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(input)) return true;
  }
  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

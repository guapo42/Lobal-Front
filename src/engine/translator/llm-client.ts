/**
 * Translator Engine — LLM Client
 *
 * Abstracts LLM communication for both local (Ollama) and cloud
 * (Gemini, Claude, etc.) providers. The client handles:
 * - Provider selection (prefer local for sensitive data)
 * - PII scrubbing before cloud requests
 * - Response parsing and schema validation
 * - Retry logic with exponential backoff
 *
 * All LLM responses are passed through the Anchor's schema
 * validator before reaching the UI.
 */

import { scrub, containsPII } from './scrubber';
import { validateLLMOutput, type ValidationResult } from '../anchor/schema-validator';

export type LLMProvider = 'ollama' | 'cloud';

export interface LLMConfig {
  provider: LLMProvider;
  ollamaUrl: string;
  ollamaModel: string;
  cloudApiUrl?: string;
  cloudApiKey?: string;
  cloudModel?: string;
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  maxRetries: 2,
  timeoutMs: 30_000,
};

let config: LLMConfig = { ...DEFAULT_CONFIG };

export function configureLLM(updates: Partial<LLMConfig>): void {
  config = { ...config, ...updates };
}

export function getLLMConfig(): Readonly<LLMConfig> {
  return config;
}

// ── Core request types ──

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  schema?: string; // schema name for validation
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  raw: string;
  parsed: Record<string, unknown> | null;
  validation: ValidationResult | null;
  provider: LLMProvider;
  latencyMs: number;
  scrubbed: boolean;
}

// ── Provider implementations ──

async function callOllama(
  prompt: string,
  systemPrompt?: string,
  temperature?: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: temperature ?? 0.3,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  } finally {
    clearTimeout(timeout);
  }
}

async function callCloud(
  prompt: string,
  systemPrompt?: string,
  temperature?: number
): Promise<string> {
  if (!config.cloudApiUrl || !config.cloudApiKey) {
    throw new Error('Cloud LLM not configured — set cloudApiUrl and cloudApiKey');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.cloudApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.cloudApiKey}`,
      },
      body: JSON.stringify({
        model: config.cloudModel || 'gemini-1.5-pro',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: temperature ?? 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Cloud LLM error: ${response.status}`);
    }

    const data = await response.json();
    // Handle common response formats
    return (
      data.choices?.[0]?.message?.content ||
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.response ||
      ''
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ── Main request function ──

/**
 * Send a request to the LLM, with automatic:
 * - PII scrubbing for cloud providers
 * - Response parsing (attempts JSON extraction)
 * - Schema validation via Anchor
 * - Retry with backoff on failure
 */
export async function requestLLM(req: LLMRequest): Promise<LLMResponse> {
  const start = performance.now();
  let provider = config.provider;
  let prompt = req.prompt;
  let scrubbed = false;

  // For cloud: scrub PII from prompt
  if (provider === 'cloud' && containsPII(prompt)) {
    const result = scrub(prompt);
    prompt = result.scrubbed;
    scrubbed = true;
    console.log(
      `[Translator:LLM] Scrubbed ${result.redactions.length} PII items before cloud request`
    );
  }

  // Retry loop
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const raw =
        provider === 'ollama'
          ? await callOllama(prompt, req.systemPrompt, req.temperature)
          : await callCloud(prompt, req.systemPrompt, req.temperature);

      // Attempt JSON parsing
      let parsed: Record<string, unknown> | null = null;
      try {
        // Try to find JSON in the response (LLMs often wrap it in markdown)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Not JSON — that's fine for some requests
      }

      // Schema validation if requested
      let validation: ValidationResult | null = null;
      if (req.schema && parsed) {
        validation = validateLLMOutput(req.schema, parsed);
        if (!validation.valid) {
          console.warn(`[Translator:LLM] Schema validation failed:`, validation.errors);
        }
      }

      return {
        raw,
        parsed,
        validation,
        provider,
        latencyMs: performance.now() - start,
        scrubbed,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[Translator:LLM] Attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // If Ollama fails, try falling back to cloud
      if (provider === 'ollama' && attempt === 0 && config.cloudApiUrl) {
        console.log('[Translator:LLM] Falling back to cloud provider');
        provider = 'cloud';
        if (containsPII(prompt)) {
          const result = scrub(prompt);
          prompt = result.scrubbed;
          scrubbed = true;
        }
        continue;
      }

      // Exponential backoff
      if (attempt < config.maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }

  throw lastError || new Error('LLM request failed after retries');
}

/**
 * Check if the local Ollama server is reachable.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

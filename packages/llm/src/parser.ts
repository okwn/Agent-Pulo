// llm/src/parser.ts — JSON structured output parser with invalid JSON recovery

import { LlmParseError } from './types.js';

interface ParseRecoveryResult<T> {
  parsed: T;
  recovered: boolean;
  raw: string;
}

/**
 * Attempt to parse JSON, trying multiple recovery strategies on failure.
 */
export function parseJsonOrRecover<T>(
  raw: string,
  schema: { parse: (x: unknown) => T }
): ParseRecoveryResult<T> {
  // Try direct parse first
  try {
    const parsed = schema.parse(JSON.parse(raw));
    return { parsed, recovered: false, raw };
  } catch {
    // Fall through to recovery
  }

  // Strategy 1: strip markdown code blocks
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const inner = codeBlockMatch[1].trim();
    try {
      const parsed = schema.parse(JSON.parse(inner));
      return { parsed, recovered: true, raw: inner };
    } catch {
      // Fall through
    }
  }

  // Strategy 2: find first JSON object in text
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = schema.parse(JSON.parse(objectMatch[0]));
      return { parsed, recovered: true, raw: objectMatch[0] };
    } catch {
      // Fall through
    }
  }

  // Strategy 3: try to fix common JSON issues (trailing commas, single quotes)
  let cleaned = raw;
  try {
    cleaned = raw.replace(/,(\s*[}\]])/g, '$1').replace(/'/g, '"');
    const parsed = schema.parse(JSON.parse(cleaned));
    return { parsed, recovered: true, raw: cleaned };
  } catch {
    // Fall through
  }

  throw new LlmParseError(raw, new Error('All recovery strategies failed'));
}

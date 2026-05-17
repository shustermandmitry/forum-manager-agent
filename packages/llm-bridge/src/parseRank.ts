/**
 * @module llm-bridge/parseRank
 *
 * Shared helper: parse a model's rank-call output into a RankResult.
 * Used by both Claude and local-model clients since both produce
 * the same JSON shape on a rank call.
 */

import type { RankResult } from './types.ts'

/**
 * Parse a raw rank-call output (the model's stdout / response text)
 * into a typed RankResult.
 *
 * Tolerates a leading markdown code fence and surrounding whitespace,
 * since instruction-tuned models sometimes wrap JSON in ```json blocks
 * despite "JSON only" instructions.
 */
export function parseRankOutput(raw: string): RankResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse rank output as JSON: ${raw}`)
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).score !== 'number' ||
    typeof (parsed as Record<string, unknown>).rationale !== 'string'
  ) {
    throw new Error(`Rank output has invalid shape: ${raw}`)
  }

  const obj = parsed as { score: number; rationale: string }
  return { score: obj.score, rationale: obj.rationale }
}

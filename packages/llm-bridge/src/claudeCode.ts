/**
 * @module llm-bridge/claudeCode
 *
 * Claude Code subprocess driver. Spawns `claude --print` per call, captures
 * stdout, maps exit codes / stderr signals to typed errors. Authenticates
 * via the user's existing Max session (no API key handling here).
 */

import { execa } from 'execa'
import {
  RateLimitError,
  SubprocessError,
  type ClaudeCodeOpts,
  type LLMClient,
  type RankArgs,
  type RankResult,
  type DraftArgs,
  type DraftResult,
  type VoiceArgs,
  type VoiceResult,
  type ChatArgs,
  type ChatResult,
} from './types.ts'

interface ResolvedOpts {
  binary: string
  timeoutMs: number
  mcpConfig?: string
}

function resolveOpts(opts: ClaudeCodeOpts): ResolvedOpts {
  return {
    binary: opts.binary ?? 'claude',
    timeoutMs: opts.timeoutMs ?? 5 * 60 * 1000,
    mcpConfig: opts.mcpConfig,
  }
}

/** Structural type guard for execa's error shape — avoids importing ExecaError as a value. */
function isExecaErrorLike(
  e: unknown,
): e is { exitCode?: number | null; stderr?: string; message?: string } {
  return typeof e === 'object' && e !== null && ('exitCode' in e || 'stderr' in e)
}

/**
 * Spawn `claude --print`, write prompt to stdin, capture stdout.
 * Maps known failure shapes to typed errors.
 */
async function runClaudeCli(prompt: string, opts: ResolvedOpts): Promise<string> {
  const args = ['--print']
  if (opts.mcpConfig) args.push('--mcp-config', opts.mcpConfig)

  try {
    const result = await execa(opts.binary, args, {
      input: prompt,
      timeout: opts.timeoutMs,
    })
    return result.stdout.trim()
  } catch (err) {
    if (isExecaErrorLike(err)) {
      const stderr = err.stderr ?? ''
      if (/rate.?limit/i.test(stderr)) {
        // Best-effort retry-after extraction; default 60s.
        const match = stderr.match(/retry.*?(\d+)\s*(?:s|sec|second)/i)
        const retry = match ? Number(match[1]) : 60
        throw new RateLimitError(retry)
      }
      throw new SubprocessError(
        `claude exited ${err.exitCode}: ${stderr || err.message || 'unknown error'}`,
        err.exitCode ?? undefined,
      )
    }
    throw err
  }
}

function buildRankPrompt(args: RankArgs): string {
  return `${args.focusPrompt}

You are evaluating a forum thread for engagement value on a 1-10 scale.

Thread:
${args.threadContext}

Respond with ONLY a single line of JSON, no preamble:
{"score": N, "rationale": "one sentence"}`
}

function buildDraftPrompt(args: DraftArgs): string {
  const voiceBlock =
    args.voiceSamples && args.voiceSamples.length > 0
      ? `\nMy voice — write like these examples:\n${args.voiceSamples
          .map((s, i) => `Example ${i + 1}: ${s}`)
          .join('\n')}\n`
      : ''

  const instructionsBlock = args.topicInstructions
    ? `\nTopic-specific instructions:\n${args.topicInstructions}\n`
    : ''

  return `${args.focusPrompt}${voiceBlock}${instructionsBlock}

Forum thread to reply to:
${args.threadContext}

Draft my reply. Output the reply text only — no preamble, no meta-commentary.`
}

function buildChatPrompt(args: ChatArgs): string {
  const sys = args.systemPrompt ?? 'You are an assistant managing my forum engagement work.'
  const history = args.history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n')

  const historyBlock = history.length > 0 ? `\nConversation so far:\n${history}\n` : ''

  return `${sys}
${historyBlock}
User: ${args.message}

Respond as the assistant. No preamble.`
}

function parseRankOutput(raw: string): RankResult {
  // Tolerate a leading code fence or surrounding whitespace.
  const cleaned = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
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

/**
 * Create a Claude Code-backed LLMClient. Each call spawns `claude --print`
 * with the constructed prompt on stdin.
 *
 * @param opts - subprocess options (binary path, MCP config, timeout)
 * @returns an LLMClient
 *
 * @behaviour
 * - rank/draft/chat → spawn claude per call; parse output per method.
 * - voice → throws (voice shaping is local-only by design).
 * - On rate-limit signal in stderr → RateLimitError(retryAfterSeconds).
 * - On non-zero exit → SubprocessError(message, exitCode).
 */
export function createClaudeCodeClient(opts: ClaudeCodeOpts = {}): LLMClient {
  const internal = resolveOpts(opts)

  return {
    rank: async (args: RankArgs): Promise<RankResult> => {
      const prompt = buildRankPrompt(args)
      const output = await runClaudeCli(prompt, internal)
      return parseRankOutput(output)
    },

    draft: async (args: DraftArgs): Promise<DraftResult> => {
      const prompt = buildDraftPrompt(args)
      const output = await runClaudeCli(prompt, internal)
      return { text: output, promptUsed: prompt }
    },

    voice: async (_args: VoiceArgs): Promise<VoiceResult> => {
      throw new Error('ClaudeCodeClient.voice: voice shaping is local-only by design')
    },

    chat: async (args: ChatArgs): Promise<ChatResult> => {
      const prompt = buildChatPrompt(args)
      const output = await runClaudeCli(prompt, internal)
      return { text: output }
    },
  }
}

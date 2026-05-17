/**
 * @module llm-bridge/claudeCode
 *
 * @abstract Claude Code subprocess driver. Spawns `claude --print` per call,
 * captures stdout, maps exit codes to errors. Authenticates via the user's
 * existing Max session (no API key handling here).
 *
 * @moduleType utility
 */

import type {
  LLMClient,
  ClaudeCodeOpts,
  RankArgs,
  RankResult,
  DraftArgs,
  DraftResult,
  VoiceArgs,
  VoiceResult,
  ChatArgs,
  ChatResult,
} from './types.ts'

/**
 * @abstract Create a Claude Code-backed LLMClient.
 *
 * @param opts - subprocess options (binary path, MCP config, timeout)
 * @returns an LLMClient that delegates each call to a fresh `claude` invocation
 *
 * @behaviour
 * - Each call spawns `claude --print` with the constructed prompt on stdin.
 * - Auth is whatever Claude Code has on disk (`claude login` already done).
 * - On non-zero exit, throws SubprocessError with the captured stderr.
 * - On rate-limit detection in stderr, throws RateLimitError.
 * - `voice()` throws — Claude Code is not the voice-shaping client.
 */
export function createClaudeCodeClient(_opts: ClaudeCodeOpts = {}): LLMClient {
  const notImplemented = (m: string) => {
    throw new Error(`Not implemented: ClaudeCodeClient.${m}`)
  }

  return {
    rank: async (_args: RankArgs): Promise<RankResult> => notImplemented('rank'),
    draft: async (_args: DraftArgs): Promise<DraftResult> => notImplemented('draft'),
    voice: async (_args: VoiceArgs): Promise<VoiceResult> => {
      throw new Error('ClaudeCodeClient.voice: voice shaping is local-only by design')
    },
    chat: async (_args: ChatArgs): Promise<ChatResult> => notImplemented('chat'),
  }
}

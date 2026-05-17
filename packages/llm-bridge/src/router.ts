/**
 * @module llm-bridge/router
 *
 * @abstract Per-call routing between Claude and local clients. v1 is static
 * config-based dispatch; adaptive routing (per-class win-rates) is Phase 3+.
 *
 * @moduleType utility
 */

import type {
  LLMClient,
  RouterConfig,
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
 * @abstract Create a routing LLMClient that dispatches calls to Claude
 * and/or local based on config.
 *
 * @param opts.claude - the Claude-backed client
 * @param opts.local - the local-model-backed client
 * @param opts.config - which client handles which call kind
 * @returns an LLMClient that internally routes
 *
 * @behaviour
 * - For `draft` with config 'both' — runs both clients in parallel; returns
 *   both results merged (caller deals with the array).
 * - For other modes — single client dispatch.
 * - `voice` always routes to local (config.voice is typed `'local'`).
 * - If the chosen client throws, the router does NOT fall back to the other.
 *   Caller handles errors explicitly.
 */
export function createLLMRouter(_opts: {
  claude: LLMClient
  local: LLMClient
  config: RouterConfig
}): LLMClient {
  const notImplemented = (m: string) => {
    throw new Error(`Not implemented: LLMRouter.${m}`)
  }

  return {
    rank: async (_args: RankArgs): Promise<RankResult> => notImplemented('rank'),
    draft: async (_args: DraftArgs): Promise<DraftResult> => notImplemented('draft'),
    voice: async (_args: VoiceArgs): Promise<VoiceResult> => notImplemented('voice'),
    chat: async (_args: ChatArgs): Promise<ChatResult> => notImplemented('chat'),
  }
}

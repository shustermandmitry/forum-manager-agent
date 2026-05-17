/**
 * @module llm-bridge/router
 *
 * Per-call routing between Claude and local clients. v1 is strict
 * single-dispatch: for each call kind, the configured client handles it
 * — no fallback, no parallelism.
 *
 * The dual-draft pattern (run both clients on the same thread, get two
 * drafts side-by-side) is NOT routed through here — that's the
 * forumManager.draftScheduler worker calling both clients directly.
 *
 * Adaptive routing (per-thread-class win-rates, dynamic switching) is
 * Phase 3+. Until then, RouterConfig is read once at construction.
 */

import type {
  ChatArgs,
  ChatResult,
  DraftArgs,
  DraftResult,
  LLMClient,
  RankArgs,
  RankResult,
  RouterConfig,
  VoiceArgs,
  VoiceResult,
} from './types.ts'

/**
 * Create a routing LLMClient.
 *
 * @param opts.claude - Claude-backed client
 * @param opts.local - local-model-backed client
 * @param opts.config - per-call-kind routing
 * @returns an LLMClient that internally dispatches per config
 *
 * @behaviour
 * - rank/draft/chat → dispatch to `opts.config[kind]`'s client.
 * - voice → always to local (config.voice is typed `'local'`).
 * - Errors from the chosen client are NOT swallowed or fallen back —
 *   caller handles. (Fallback policy is a higher-level concern; making
 *   it implicit here would hide failures.)
 */
export function createLLMRouter(opts: {
  claude: LLMClient
  local: LLMClient
  config: RouterConfig
}): LLMClient {
  const { claude, local, config } = opts
  const pick = (kind: 'claude' | 'local'): LLMClient => (kind === 'claude' ? claude : local)

  return {
    rank: (args: RankArgs): Promise<RankResult> => pick(config.rank).rank(args),
    draft: (args: DraftArgs): Promise<DraftResult> => pick(config.draft).draft(args),
    voice: (args: VoiceArgs): Promise<VoiceResult> => local.voice(args),
    chat: (args: ChatArgs): Promise<ChatResult> => pick(config.chat).chat(args),
  }
}

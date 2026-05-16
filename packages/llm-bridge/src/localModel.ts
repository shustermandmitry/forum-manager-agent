/**
 * @module llm-bridge/localModel
 *
 * @abstract Local mlx-lm socket client. Maintains a long-running connection
 * to `mlx_lm.server` on a unix socket. Reconnects on drop.
 *
 * @moduleType utility
 */

import type {
  LLMClient,
  LocalModelOpts,
  RankArgs,
  RankResult,
  DraftArgs,
  DraftResult,
  VoiceArgs,
  VoiceResult,
  ChatArgs,
  ChatResult,
} from './llmBridge.abstract.ts'

/**
 * @abstract Create a local-LLM-backed LLMClient (mlx-lm via unix socket).
 *
 * @param opts - socket path, model name, optional LoRA path
 * @returns an LLMClient that proxies each call through the persistent socket
 *
 * @behaviour
 * - On first call, connects to `opts.socketPath` (or reuses an existing connection).
 * - Maintains connection across many calls; reconnects on drop.
 * - All four LLMClient methods supported (voice is local-only and shines here).
 * - If mlx-lm server isn't reachable, throws SocketDisconnectedError on first call.
 * - Slow inference (~5-15 tok/s on M1 32GB q4) is expected; no timeout in v1.
 */
export function createLocalModelClient(_opts: LocalModelOpts): LLMClient {
  const notImplemented = (m: string) => {
    throw new Error(`Not implemented: LocalModelClient.${m}`)
  }

  return {
    rank: async (_args: RankArgs): Promise<RankResult> => notImplemented('rank'),
    draft: async (_args: DraftArgs): Promise<DraftResult> => notImplemented('draft'),
    voice: async (_args: VoiceArgs): Promise<VoiceResult> => notImplemented('voice'),
    chat: async (_args: ChatArgs): Promise<ChatResult> => notImplemented('chat'),
  }
}

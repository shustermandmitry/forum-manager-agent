/**
 * @module llm-bridge/llmBridgeProcess
 *
 * The llmBridge ProcessDef factory. Wraps the Claude subprocess driver +
 * local mlx-lm socket client in a process so it can be mounted under
 * /forum-agent/llm-bridge/ and consumed by other processes via the standard
 * schema (mutation/query) protocol.
 *
 * Internally still uses createClaudeCodeClient, createLocalModelClient, and
 * createLLMRouter — the process is a thin wrapper that exposes them through
 * samovar's branded resolver protocol.
 */

import { mutation, query, worker } from '@shustermandmitry/samovar/process'
import type { ProcessDef } from '@shustermandmitry/samovar/process'
import type { LLMBridgeProcessOpts, LLMBridgeStore } from './types.ts'

const NOT_IMPL = 'Not implemented'

/**
 * Create the llmBridge ProcessDef.
 *
 * @param opts - Claude opts + local opts + routing config
 * @returns ProcessDef ready to mount at /forum-agent/llm-bridge/
 *
 * @behaviour
 * Schema (mutations + queries flat):
 *  - mutations: rank, draft, voice, chat — delegate to router; write call
 *    record to store.recentCalls
 *  - queries: health, recentMetrics
 *
 * Workers:
 *  - healthMonitor: pings local socket, updates store.localStatus
 *  - callLogTrimmer: bounds store.recentCalls to last N entries
 *
 * Lifecycle:
 *  - start: instantiate Claude + local + router clients per opts
 *  - stop: close socket connections cleanly
 */
export function createLLMBridgeProcess(_opts: LLMBridgeProcessOpts): ProcessDef<LLMBridgeStore> {
  const initialStore: LLMBridgeStore = {
    claudeStatus: 'idle',
    localStatus: 'idle',
    recentCalls: [],
    lastClaudeCallAt: 0,
    lastLocalCallAt: 0,
  }

  return {
    name: 'llmBridge',
    children: [],
    store: initialStore,
    workers: [
      worker<LLMBridgeStore>('healthMonitor', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      worker<LLMBridgeStore>('callLogTrimmer', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
    ],
    schema: {
      // Mutations — imperative verbs. Queries — get* prefix.

      rankThread: mutation<LLMBridgeStore, unknown>(({ set, look, children }) => (_args) => {
        throw new Error(NOT_IMPL)
      }),
      draftReply: mutation<LLMBridgeStore, unknown>(({ set, look, children }) => (_args) => {
        throw new Error(NOT_IMPL)
      }),
      revoiceDraft: mutation<LLMBridgeStore, unknown>(({ set, look, children }) => (_args) => {
        throw new Error(NOT_IMPL)
      }),
      submitChatTurn: mutation<LLMBridgeStore, unknown>(({ set, look, children }) => (_args) => {
        throw new Error(NOT_IMPL)
      }),

      getHealth: query<LLMBridgeStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getRecentMetrics: query<LLMBridgeStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
    },
  }
}

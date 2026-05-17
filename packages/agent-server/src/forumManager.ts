/**
 * @module agent-server/forumManager
 *
 * The parent ProcessDef factory for the forum agent. Coordinator only —
 * per-forum operational state lives in child processes (one per active forum).
 *
 * Returned ProcessDef is mounted by bootAgentServer at /forum-agent.
 * Children are passed in at factory call time (pre-declared from app.config
 * during boot) — when samovar lands typed-dynamic-children, hot add/remove
 * via dashboard.
 *
 * Replaces the earlier monolithic forumAgent ProcessDef per the 2026-05-16
 * evening per-process architecture revision (see docs/design.md §3).
 */

import { mutation, query, worker } from '@shustermandmitry/samovar/process'
import type { ProcessDef } from '@shustermandmitry/samovar/process'
import type { ForumManagerStore, AgentConfig } from './types.ts'

const NOT_IMPL = 'Not implemented'

/**
 * Create the forumManager ProcessDef.
 *
 * @param children - ordered list of child ProcessDefs to mount under this
 *   parent. Typically: per-forum processes (one per enabled entry in
 *   app.config.forums), plus the llmBridge process.
 * @returns ProcessDef ready to mount at /forum-agent
 *
 * @behaviour
 * Schema entries (mutations/queries/events all live flat in `schema`):
 *  - mutations: prompt, approveDraft, markPosted, abandonThread,
 *    setReviewMode, peerApprove, peerComment, addInstruction, pause, resume
 *  - queries: digest, pendingDrafts, recentActivity, threadStatus,
 *    tasksForPeer, personCard
 *
 * Workers (BrandedResolver[] — internal reactive computeds):
 *  - draftScheduler: subscribes to union of child forum /queue slices,
 *    dispatches to llm-bridge, writes results to inbox
 *  - taskAssigner: watches inbox transitions, auto-creates tasks
 *  - metricsAggregator: per-(forum, thread-class) win-rate tracking
 *
 * Lifecycle:
 *  - start: initialize plugin registry, mount children
 *  - stop: graceful shutdown
 */
export function createForumManager(_children: ProcessDef[] = []): ProcessDef<ForumManagerStore> {
  const initialStore: ForumManagerStore = {
    config: null,
    status: {
      mode: 'starting',
      scrapersHealthy: false,
      llmsReady: false,
      telegramConnected: false,
    },
    inbox: {},
    training: {},
    people: {},
    instructions: { claude: {} },
    permissions: { rules: [], peers: {} },
    tasks: {},
    chat: {},
  }

  return {
    name: 'forumManager',
    children: _children,
    store: initialStore,
    workers: [
      worker<ForumManagerStore>('draftScheduler', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      worker<ForumManagerStore>('taskAssigner', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      worker<ForumManagerStore>('metricsAggregator', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
    ],
    schema: {
      // Mutations — imperative verbs. Queries — get* prefix. Per samovar
      // convention `feedback_flat_schemas_get_set_prefix.md`.

      submitPrompt: mutation<ForumManagerStore, { text: string; sessionId: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      approveDraft: mutation<ForumManagerStore, { threadId: string; edits?: string; choice: 'claude' | 'local' | 'scratch' }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      markPosted: mutation<ForumManagerStore, { threadId: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      abandonThread: mutation<ForumManagerStore, { threadId: string; reason: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      setReviewMode: mutation<ForumManagerStore, { threadId: string; mode: string; peers?: string[] }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      approvePeerDraft: mutation<ForumManagerStore, { threadId: string; peerId: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      addPeerComment: mutation<ForumManagerStore, { threadId: string; peerId: string; text: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      addInstruction: mutation<ForumManagerStore, { topic: string; text: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      pause: mutation<ForumManagerStore, void>(({ set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      resume: mutation<ForumManagerStore, void>(({ set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),

      getDigest: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getPendingDrafts: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getRecentActivity: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getThreadStatus: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getTasksForPeer: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getPersonCard: query<ForumManagerStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
    },
  }
}

/**
 * @module agent-server/forumAgent
 *
 * @abstract Implementation skeleton of the forumAgent ProcessDef. See
 * forumAgent.abstract.ts for the complete public surface.
 *
 * @moduleType process
 */

import type {
  AgentConfig,
  QueueEntry,
  InboxEntry,
  TrainingEntry,
  PersonCard,
  Task,
  AgentStatus,
} from './forumAgent.abstract.ts'

const NOT_IMPL = 'Not implemented'

/**
 * The forumAgent ProcessDef. Mounted by bootAgentServer.
 *
 * @behaviour
 * - Owns the per-peer working state for forum engagement.
 * - All mutations/queries/events as documented in forumAgent.abstract.ts.
 * - Workers run as long-lived effects; resources init at process start.
 */
export const forumAgent = {
  name: 'forumAgent',
  children: [],

  // Initial store shape. Empty containers, defaults applied at boot from config.
  store: {
    config: null as AgentConfig | null,
    queue: {} as Record<string, QueueEntry>,
    inbox: {} as Record<string, InboxEntry>,
    seen: {} as Record<string, { threadId: string; firstSeenAt: number; lastTouchedAt: number }>,
    training: {} as Record<string, TrainingEntry>,
    people: {} as Record<string, PersonCard>,
    instructions: { claude: {} as Record<string, string> },
    permissions: { rules: [], peers: {} },
    tasks: {} as Record<string, Task>,
    chat: {} as Record<string, { sessionId: string; messages: unknown[]; startedAt: number }>,
    status: {
      mode: 'starting',
      scrapersHealthy: false,
      llmsReady: false,
      telegramConnected: false,
    } as AgentStatus,
  },

  mutations: (_ctx: any) => ({
    prompt: (_args: { text: string; sessionId: string }) => {
      throw new Error(NOT_IMPL)
    },
    runScan: (_args: { forum?: string }) => {
      throw new Error(NOT_IMPL)
    },
    approveDraft: (_args: { threadId: string; edits?: string; choice: 'claude' | 'local' | 'scratch' }) => {
      throw new Error(NOT_IMPL)
    },
    markPosted: (_args: { threadId: string }) => {
      throw new Error(NOT_IMPL)
    },
    abandonThread: (_args: { threadId: string; reason: string }) => {
      throw new Error(NOT_IMPL)
    },
    setReviewMode: (_args: { threadId: string; mode: string; peers?: string[] }) => {
      throw new Error(NOT_IMPL)
    },
    peerApprove: (_args: { threadId: string; peerId: string }) => {
      throw new Error(NOT_IMPL)
    },
    peerComment: (_args: { threadId: string; peerId: string; text: string }) => {
      throw new Error(NOT_IMPL)
    },
    addInstruction: (_args: { topic: string; text: string }) => {
      throw new Error(NOT_IMPL)
    },
    pause: () => {
      throw new Error(NOT_IMPL)
    },
    resume: () => {
      throw new Error(NOT_IMPL)
    },
  }),

  // Queries are tracked-read functions of `get`. Filled at impl.
  queries: (_ctx: any) => ({
    digest: () => {
      throw new Error(NOT_IMPL)
    },
    pendingDrafts: () => {
      throw new Error(NOT_IMPL)
    },
    recentActivity: (_args: { since: number }) => {
      throw new Error(NOT_IMPL)
    },
    threadStatus: (_args: { threadId: string }) => {
      throw new Error(NOT_IMPL)
    },
    tasksForPeer: (_args: { peerId: string }) => {
      throw new Error(NOT_IMPL)
    },
    personCard: (_args: { handle: string }) => {
      throw new Error(NOT_IMPL)
    },
  }),

  workers: (_ctx: any) => ({
    draftScheduler: () => {
      throw new Error(NOT_IMPL)
    },
    taskAssigner: () => {
      throw new Error(NOT_IMPL)
    },
    cronTrigger: () => {
      throw new Error(NOT_IMPL)
    },
    oplogObserver: () => {
      throw new Error(NOT_IMPL)
    },
  }),

  resources: (_ctx: any) => ({
    llmBridge: () => {
      throw new Error(NOT_IMPL)
    },
    telegramBot: () => {
      throw new Error(NOT_IMPL)
    },
    scrapers: () => {
      throw new Error(NOT_IMPL)
    },
  }),
} as const

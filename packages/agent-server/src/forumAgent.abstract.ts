/**
 * @module agent-server/forumAgent
 *
 * @abstract The central ProcessDef for the forum agent. Owns the per-peer
 * working state of all in-progress forum engagement.
 *
 * @moduleType process
 *
 * @description
 * `forumAgent` is mounted by `bootAgentServer` at the configured path
 * (default `/forum-agent`). It carries the full per-thread workflow, the
 * dual-model drafting pipeline, the user's chat conversation with the
 * agent, training data capture, and the live config.
 *
 * The store, schema (mutations, queries, events), workers, and resources
 * outlined below are the COMPLETE public surface; nothing inside is
 * private. Implementation in forumAgent.ts fills in worker bodies.
 *
 * ## Store
 *
 * ```typescript
 * interface ForumAgentStore {
 *   config: AgentConfig                    // see design.md §5 + §14
 *   queue: Record<ThreadId, QueueEntry>
 *   inbox: Record<ThreadId, InboxEntry>
 *   seen: Record<ThreadId, SeenEntry>
 *   training: Record<ThreadId, TrainingEntry>
 *   people: Record<ForumHandle, PersonCard>
 *   instructions: { claude: Record<string, string> }
 *   permissions: PermissionRules
 *   tasks: Record<TaskId, Task>
 *   chat: Record<SessionId, ChatSession>
 *   status: AgentStatus
 * }
 * ```
 *
 * ## Schema
 *
 * **Mutations** (write-only from outside; consume `{ look, set }`):
 *
 * | Mutation | Args | Effect |
 * |---|---|---|
 * | `prompt` | `{ text, sessionId }` | User chats with agent; appends to /chat |
 * | `runScan` | `{ forum? }` | Trigger scraper(s); populates /queue |
 * | `approveDraft` | `{ threadId, edits?, choice }` | Mark inbox row ready-to-post |
 * | `markPosted` | `{ threadId }` | Transition inbox row → posted; emit training record |
 * | `abandonThread` | `{ threadId, reason }` | inbox → abandoned |
 * | `setReviewMode` | `{ threadId, mode, peers? }` | Update per-thread review_mode |
 * | `peerApprove` | `{ threadId, peerId }` | Record gate approval from a peer |
 * | `peerComment` | `{ threadId, peerId, text }` | Record peer-review comment |
 * | `addInstruction` | `{ topic, text }` | Append to /instructions/claude/<topic>.md |
 * | `pause` / `resume` | none | Halt/resume all agent activity |
 *
 * **Queries** (tracked read; consume `get`):
 *
 * | Query | Args | Returns |
 * |---|---|---|
 * | `digest` | none | Summary of inbox + queue + tasks for dashboard |
 * | `pendingDrafts` | none | Inbox rows awaiting curation |
 * | `recentActivity` | `{ since }` | Oplog slice for activity feed |
 * | `threadStatus` | `{ threadId }` | Full inbox entry |
 * | `tasksForPeer` | `{ peerId }` | Open tasks assigned to a peer |
 * | `personCard` | `{ handle }` | Knowledge about a forum participant |
 *
 * **Events**:
 *
 * | Event | Payload | Meaning |
 * |---|---|---|
 * | `claudeCallStarted` | `{ threadId, purpose }` | Claude subprocess invoked |
 * | `claudeCallEnded` | `{ threadId, purpose, tokens, duration }` | Subprocess returned |
 * | `localCallStarted` | `{ threadId, purpose }` | mlx-lm socket invoked |
 * | `localCallEnded` | `{ threadId, purpose, duration }` | mlx-lm returned |
 * | `draftReady` | `{ threadId }` | Both drafts complete for a thread |
 * | `needsUserInput` | `{ threadId, question }` | Agent paused awaiting human |
 * | `scanComplete` | `{ forum, newCount }` | Scraper finished a poll cycle |
 * | `escalationTriggered` | `{ threadId, byHandle }` | Forum reply hit escalation trigger |
 *
 * ## Workers
 *
 * Long-lived effects (`createComputed`):
 *
 * | Worker | Watches | Effect |
 * |---|---|---|
 * | `draftScheduler` | queue | When a thread enters queue, dispatch Claude + local drafts in parallel |
 * | `taskAssigner` | inbox transitions | Auto-create tasks (curate-draft, peer-review, gate-approve) |
 * | `cronTrigger` | clock | Fire scrapers on schedule per /config/forums |
 * | `oplogObserver` | self oplog | Aggregate metrics for /status |
 *
 * ## Resources
 *
 * Initialized once at start (`resources` section):
 *
 * | Resource | Setup |
 * |---|---|
 * | `llmBridge` | Connect llm-bridge subprocesses (Claude Code per-call; mlx-lm socket persistent) |
 * | `telegramBot` | Boot Telegram bot binding per /config/telegram |
 * | `scrapers` | Register forum-plugin scrapers per /config/forums |
 *
 * ## Children
 *
 * No child ProcessDefs in v1. (Scrapers and bot are resources, not children.)
 *
 * @api
 */

import type {
  ThreadId,
  PeerId,
  ForumHandle,
  ReviewMode,
  ThreadStatus,
  DisclosurePolicy,
} from './types.ts'

export type SessionId = string
export type TaskId = string
export type Topic = string

/**
 * Per-peer top-level config. Lives at /forum-agent/config on the tree.
 *
 * Note: any field ending in `_ref` is a reference to a secret resolved at
 * boot from env (v1) or OS keychain (v2). See design.md §14.
 */
export interface AgentConfig {
  focus: {
    /** Markdown system-prompt template for Claude/local calls. */
    prompt: string
    /** Bullets describing what NOT to write. */
    redLines: string[]
    /** Example past messages of yours, for voice grounding. */
    voiceSamples: string[]
  }
  forums: ForumConfig[]
  models: {
    claude: { auth_ref: string }
    local: { modelName: string; loraPath?: string; socketPath: string }
  }
  policy: {
    disclosure: DisclosurePolicy
    disclosure_footer: string
    escalation_trigger: string
    autopost_classes: string[]
  }
  telegram: {
    token_ref: string
    supergroupId?: string
  }
  retraining: {
    cadence: 'daily' | 'weekly' | 'monthly'
    minNewRows: number
  }
}

export interface ForumConfig {
  forumId: string
  pluginName: string
  enabled: boolean
  pollIntervalMinutes: number
}

export interface QueueEntry {
  threadId: ThreadId
  forumId: string
  scrapedAt: number
  context: string
  url: string
}

export interface InboxEntry {
  threadId: ThreadId
  context: string
  claudeDraft?: string
  localDraft?: string
  userChoice?: 'claude' | 'local' | 'scratch'
  userFinal?: string
  status: ThreadStatus
  reviewMode: ReviewMode
  reviewPeers?: PeerId[]
  gatePeers?: PeerId[]
  peerApprovals?: PeerId[]
  peerComments?: { peerId: PeerId; text: string; at: number }[]
}

export interface SeenEntry {
  threadId: ThreadId
  firstSeenAt: number
  lastTouchedAt: number
}

export interface TrainingEntry {
  threadId: ThreadId
  context: string
  claudeRaw: string
  localVoiced: string
  userFinal: string
  userChoice: 'claude' | 'local' | 'scratch'
  editDistance: number
  commentary?: string
  threadClass?: string
  at: number
}

export interface PersonCard {
  handle: ForumHandle
  notes: string
  threads: ThreadId[]
  expertiseTags: string[]
  engagementHistory: { threadId: ThreadId; outcome: string; at: number }[]
}

export interface PermissionRules {
  rules: PermissionRule[]
  peers: Record<PeerId, { role: 'guest' | 'viewer' | 'peer' | 'author' }>
}

export interface PermissionRule {
  selector: string
  role: string
  grant: ('read' | 'comment' | 'edit' | 'approve')[]
}

export interface Task {
  id: TaskId
  type: 'curate-draft' | 'peer-review' | 'gate-approve' | 'handle-escalation' | 'retrain-prompt'
  assignee: PeerId
  threadId?: ThreadId
  status: 'open' | 'in-progress' | 'completed' | 'blocked'
  createdAt: number
  dueAt?: number
  blockedBy?: TaskId[]
}

export interface ChatSession {
  sessionId: SessionId
  messages: ChatMessage[]
  startedAt: number
}

export interface ChatMessage {
  role: 'user' | 'agent'
  text: string
  at: number
}

export interface AgentStatus {
  mode: 'running' | 'paused' | 'starting' | 'stopping'
  scrapersHealthy: boolean
  llmsReady: boolean
  telegramConnected: boolean
  lastError?: { at: number; message: string }
}

/**
 * @module agent-server/types
 *
 * Public types for the agent-server package.
 */

import type { ZodSchema } from 'zod'

export type ThreadId = string
export type PeerId = string
export type ForumHandle = string
export type SessionId = string
export type TaskId = string
export type Topic = string

export type ReviewMode = 'solo' | 'peer-review' | 'gated'

export type ThreadStatus =
  | 'scraped'
  | 'drafting'
  | 'awaiting-curation'
  | 'gated'
  | 'ready-to-post'
  | 'posted'
  | 'archived'
  | 'abandoned'

export type DisclosurePolicy = 'strict' | 'no-human-edit' | 'never'

export interface BootOptions {
  configPath: string
  port?: number
  mountPath?: string
}

export interface AgentServer {
  readonly port: number
  readonly mountPath: string
  stop(): Promise<void>
}

// ─── Config (mirrors app.config.ts; resolved + validated at boot) ──────────

export interface AgentConfig {
  focus: {
    prompt: string
    redLines: string[]
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
  props: Record<string, unknown>  // plugin-specific; validated against plugin's propsSchema
}

// ─── Plugin contract (consumed by PluginRegistry) ──────────────────────────

/**
 * Plugin domains we know about. Open string — new domains added in future.
 */
export type PluginDomain = 'ForumPlugin' | 'LLMPlugin' | (string & {})

/**
 * What every plugin package's main module must export.
 *
 * Plugin packages have an index that exports:
 *   - factory: (props) => ProcessDef
 *   - propsSchema: ZodSchema
 *   - domain: PluginDomain
 *   - packageName: string
 */
export interface PluginMetadata {
  domain: PluginDomain
  packageName: string
  propsSchema: ZodSchema
  /** Returns a ProcessDef ready to mount under the appropriate slot. */
  factory: (props: unknown) => unknown
}

export interface PluginRegistry {
  register(metadata: PluginMetadata): void
  list(domain?: PluginDomain): PluginMetadata[]
  get(packageName: string): PluginMetadata | undefined
}

// ─── forumManager store (the parent process state) ─────────────────────────

/**
 * The store shape for the forumManager ProcessDef. Coordination state only —
 * per-forum operational state lives inside each forum's own child process.
 *
 * `forums` and `llmBridge` are NOT in this store — they are mount points for
 * children, materialized at boot from config.
 */
export interface ForumManagerStore {
  config: AgentConfig | null
  status: AgentStatus
  inbox: Record<ThreadId, InboxEntry>
  training: Record<ThreadId, TrainingEntry>
  people: Record<ForumHandle, PersonCard>
  instructions: { claude: Record<string, string> }
  permissions: PermissionRules
  tasks: Record<TaskId, Task>
  chat: Record<SessionId, ChatSession>
}

// ─── Per-thread record types (live on forumManager store) ─────────────────

export interface InboxEntry {
  threadId: ThreadId
  forumId: string
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

export interface TrainingEntry {
  threadId: ThreadId
  forumId: string
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

// ─── Common types used across child processes ──────────────────────────────

/**
 * Common queue entry shape that all forum processes write into their own
 * /queue store slice. Plugin-specific metadata goes under `meta`.
 */
export interface QueueEntry {
  threadId: ThreadId
  forumId: string
  scrapedAt: number
  context: string
  url: string
  meta?: Record<string, unknown>
}

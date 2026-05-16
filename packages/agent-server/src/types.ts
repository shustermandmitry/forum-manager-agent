/**
 * @module agent-server/types
 *
 * @abstract Public types for the agent-server package.
 *
 * @moduleType type
 *
 * @api
 */

/**
 * Identifier for a forum thread. Format depends on the forum scraper that
 * produced it; treated as opaque by everything except its originating plugin.
 */
export type ThreadId = string

/**
 * Telegram user id of a peer. Canonical identity within the team.
 */
export type PeerId = string

/**
 * Forum handle of a person (forum user or a peer's forum identity).
 * Format depends on the originating forum.
 */
export type ForumHandle = string

/**
 * Review modes for an inbox row. See design.md §10 for state machine.
 */
export type ReviewMode = 'solo' | 'peer-review' | 'gated'

/**
 * Per-thread workflow state. See design.md §10.
 */
export type ThreadStatus =
  | 'scraped'
  | 'drafting'
  | 'awaiting-curation'
  | 'gated'
  | 'ready-to-post'
  | 'posted'
  | 'archived'
  | 'abandoned'

/**
 * Disclosure policy choice. Locked default: 'no-human-edit'.
 */
export type DisclosurePolicy = 'strict' | 'no-human-edit' | 'never'

/**
 * Boot options for the agent server.
 *
 * @api
 */
export interface BootOptions {
  /** Path to per-peer config.local.toml. */
  configPath: string
  /** Websocket port for dashboard + cross-process clients. Default 7710. */
  port?: number
  /** Tree mount path for the forumAgent ProcessDef. Default '/forum-agent'. */
  mountPath?: string
}

/**
 * Handle to a running agent server. Returned by bootAgentServer.
 *
 * @api
 */
export interface AgentServer {
  /** Websocket port the server is listening on. */
  readonly port: number
  /** Tree path the forumAgent is mounted at. */
  readonly mountPath: string
  /** Graceful shutdown — closes sockets, syncs sqlite, releases subprocesses. */
  stop(): Promise<void>
}

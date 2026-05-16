/**
 * @module llm-bridge/llmBridge
 *
 * @abstract Single LLMClient interface, two implementations (Claude Code and
 * local mlx-lm). The agent calls this; we hide the subprocess/socket details.
 *
 * @moduleType type
 *
 * @api
 */

/**
 * Inputs for ranking a thread by engagement value.
 */
export interface RankArgs {
  threadContext: string
  focusPrompt: string
}

/**
 * Rank result: an integer 1-10, with a one-line rationale.
 */
export interface RankResult {
  score: number
  rationale: string
}

/**
 * Inputs for drafting a reply to a thread.
 */
export interface DraftArgs {
  threadContext: string
  focusPrompt: string
  voiceSamples?: string[]
  topicInstructions?: string
}

/**
 * Draft result: the proposed reply text + the prompt that produced it (for audit).
 */
export interface DraftResult {
  text: string
  promptUsed: string
  tokensIn?: number
  tokensOut?: number
}

/**
 * Inputs for the voice-shaping step (local model only — second stage of the
 * technical pipeline). Takes Claude's substance and rewrites in user's voice.
 */
export interface VoiceArgs {
  claudeRaw: string
  voiceSamples: string[]
  redLines?: string[]
}

export interface VoiceResult {
  text: string
}

/**
 * Inputs for a chat turn — the user is talking to the agent.
 */
export interface ChatArgs {
  message: string
  history: { role: 'user' | 'agent'; text: string }[]
  systemPrompt?: string
}

export interface ChatResult {
  text: string
}

/**
 * Typed errors the bridge surfaces.
 */
export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limit hit; retry after ${retryAfterSeconds}s`)
  }
}

export class SubprocessError extends Error {
  constructor(message: string, public readonly exitCode?: number) {
    super(message)
  }
}

export class SocketDisconnectedError extends Error {}

/**
 * Single client interface. Both Claude and local model implement this.
 *
 * Not all calls are supported by all clients — `voice` is local-only, by
 * design. Calling an unsupported method throws.
 *
 * @api
 */
export interface LLMClient {
  rank(args: RankArgs): Promise<RankResult>
  draft(args: DraftArgs): Promise<DraftResult>
  voice(args: VoiceArgs): Promise<VoiceResult>
  chat(args: ChatArgs): Promise<ChatResult>
}

/**
 * Options for Claude Code subprocess driver.
 */
export interface ClaudeCodeOpts {
  /** Path to `claude` binary. Defaults to `claude` on PATH. */
  binary?: string
  /** Optional MCP config path; enables Claude's inside-loop tool-use mode. */
  mcpConfig?: string
  /** Max wall-clock for one call. Defaults to 5min. */
  timeoutMs?: number
}

/**
 * Options for local model (mlx-lm) socket client.
 */
export interface LocalModelOpts {
  socketPath: string
  modelName: string
  loraPath?: string
  /** Max tokens per response. */
  maxTokens?: number
}

/**
 * Routing config: which client handles which call kind.
 *
 * The router does NOT make adaptive decisions in v1; it just dispatches
 * per static config. Phase 3+ adds adaptive routing based on per-class
 * win-rates.
 */
export interface RouterConfig {
  rank: 'claude' | 'local' | 'both'
  draft: 'claude' | 'local' | 'both'
  voice: 'local'
  chat: 'claude' | 'local'
}

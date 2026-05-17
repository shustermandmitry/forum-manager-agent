/**
 * @module llm-bridge/types
 *
 * Public types for the llm-bridge package.
 */

export interface RankArgs {
  threadContext: string
  focusPrompt: string
}

export interface RankResult {
  score: number
  rationale: string
}

export interface DraftArgs {
  threadContext: string
  focusPrompt: string
  voiceSamples?: string[]
  topicInstructions?: string
}

export interface DraftResult {
  text: string
  promptUsed: string
  tokensIn?: number
  tokensOut?: number
}

export interface VoiceArgs {
  claudeRaw: string
  voiceSamples: string[]
  redLines?: string[]
}

export interface VoiceResult {
  text: string
}

export interface ChatArgs {
  message: string
  history: { role: 'user' | 'agent'; text: string }[]
  systemPrompt?: string
}

export interface ChatResult {
  text: string
}

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

export interface LLMClient {
  rank(args: RankArgs): Promise<RankResult>
  draft(args: DraftArgs): Promise<DraftResult>
  voice(args: VoiceArgs): Promise<VoiceResult>
  chat(args: ChatArgs): Promise<ChatResult>
}

export interface ClaudeCodeOpts {
  binary?: string
  mcpConfig?: string
  timeoutMs?: number
}

export interface LocalModelOpts {
  /**
   * Base URL of mlx_lm.server (or another OpenAI-API-compatible endpoint).
   * E.g., 'http://localhost:8888' for local, 'http://192.168.1.42:8888' for
   * split-host setup with the model on another machine on the LAN.
   */
  baseUrl: string
  /** Model id passed in each request — must match what mlx_lm.server loaded. */
  modelName: string
  /**
   * LoRA path applied at mlx_lm.server startup time, not per-request.
   * Carried in config for documentation only; not used by the HTTP client.
   */
  loraPath?: string
  /** Max output tokens per response. Default 1024. */
  maxTokens?: number
  /** Max wall-clock per request in ms. Default 5 minutes. */
  timeoutMs?: number
  /** Sampling temperature. Default 0.7. */
  temperature?: number
}

/**
 * Per-call-kind routing. Single dispatch only — for each call kind, exactly
 * one client handles it.
 *
 * The dual-draft pattern (run claude.draft AND local.draft in parallel for
 * the same thread) is NOT a router concern. The forumManager's
 * draftScheduler worker calls both clients directly, by design — it's a
 * higher-level orchestration than per-call routing.
 *
 * voice is 'local' only — Claude's voice() throws by design (see ClaudeCodeClient).
 */
export interface RouterConfig {
  rank: 'claude' | 'local'
  draft: 'claude' | 'local'
  voice: 'local'
  chat: 'claude' | 'local'
}

// ─── ProcessDef shape ───────────────────────────────────────────────────────

/**
 * Options consumed by createLLMBridgeProcess.
 */
export interface LLMBridgeProcessOpts {
  claude: ClaudeCodeOpts
  local: LocalModelOpts
  routing: RouterConfig
}

/**
 * The llmBridge process store. Operational state only — no LLM outputs are
 * stored here (those flow into forumManager's inbox).
 */
export interface LLMBridgeStore {
  claudeStatus: 'idle' | 'busy' | 'error' | 'rate-limited'
  localStatus: 'idle' | 'busy' | 'error' | 'disconnected'
  recentCalls: LLMCallRecord[]
  lastClaudeCallAt: number
  lastLocalCallAt: number
}

export interface LLMCallRecord {
  at: number
  via: 'claude' | 'local'
  kind: 'rank' | 'draft' | 'voice' | 'chat'
  durationMs: number
  ok: boolean
  error?: string
}

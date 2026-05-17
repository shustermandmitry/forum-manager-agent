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
  socketPath: string
  modelName: string
  loraPath?: string
  maxTokens?: number
}

export interface RouterConfig {
  rank: 'claude' | 'local' | 'both'
  draft: 'claude' | 'local' | 'both'
  voice: 'local'
  chat: 'claude' | 'local'
}

export { createClaudeCodeClient } from './claudeCode.ts'
export { createLocalModelClient } from './localModel.ts'
export { createLLMRouter } from './router.ts'
export type {
  LLMClient,
  ClaudeCodeOpts,
  LocalModelOpts,
  RouterConfig,
  RankArgs,
  RankResult,
  DraftArgs,
  DraftResult,
  VoiceArgs,
  VoiceResult,
  ChatArgs,
  ChatResult,
} from './llmBridge.abstract.ts'
export { RateLimitError, SubprocessError, SocketDisconnectedError } from './llmBridge.abstract.ts'

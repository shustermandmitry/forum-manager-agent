// Library exports (used directly by tests + by llmBridgeProcess internally)
export { createClaudeCodeClient } from './claudeCode.ts'
export { createLocalModelClient } from './localModel.ts'
export { createLLMRouter } from './router.ts'

// ProcessDef export (mounted by agent-server)
export { createLLMBridgeProcess } from './llmBridgeProcess.ts'

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
  LLMBridgeProcessOpts,
  LLMBridgeStore,
  LLMCallRecord,
} from './types.ts'
export { RateLimitError, SubprocessError, SocketDisconnectedError } from './types.ts'

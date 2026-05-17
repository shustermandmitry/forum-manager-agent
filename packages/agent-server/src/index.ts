export { bootAgentServer } from './bootAgentServer.ts'
export { createForumManager } from './forumManager.ts'
export { createPluginRegistry, loadAndRegisterPlugin } from './pluginRegistry.ts'

export type {
  BootOptions,
  AgentServer,
  ThreadId,
  PeerId,
  ForumHandle,
  SessionId,
  TaskId,
  Topic,
  ReviewMode,
  ThreadStatus,
  DisclosurePolicy,
  AgentConfig,
  ForumConfig,
  ForumManagerStore,
  QueueEntry,
  InboxEntry,
  TrainingEntry,
  PersonCard,
  PermissionRules,
  PermissionRule,
  Task,
  ChatSession,
  ChatMessage,
  AgentStatus,
  PluginRegistry,
  PluginMetadata,
  PluginDomain,
} from './types.ts'

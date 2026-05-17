/**
 * @module telegram-bot/types
 *
 * Public types for the telegram-bot package.
 */

export interface TelegramBotOpts {
  token: string
  supergroupId?: string
  treeMount: string
  ownerId: string
  mode?: 'polling' | 'webhook'
}

export interface TelegramBot {
  readonly ownerId: string
  stop(): Promise<void>
}

export interface ManagedTopic {
  topicId: number
  title: string
  kind: 'general' | 'task-board' | 'review-queue' | 'thread' | 'bot-status'
  threadId?: string
  ownerBotId: string
}

export type IncomingAction =
  | { kind: 'command'; command: string; args: string; from: string; chatId: number; topicId?: number }
  | { kind: 'reaction'; emoji: string; from: string; messageId: number; topicId?: number }
  | { kind: 'reply'; text: string; from: string; replyToMessageId: number; topicId?: number }
  | { kind: 'text'; text: string; from: string; chatId: number; topicId?: number }

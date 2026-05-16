/**
 * @module telegram-bot/telegramBot
 *
 * @abstract Telegram bot binding for one peer. Renders tree state to
 * supergroup topics; turns incoming user actions into agent mutations.
 *
 * @moduleType type
 *
 * @api
 */

/**
 * Boot options for the Telegram bot binding.
 *
 * @api
 */
export interface TelegramBotOpts {
  /** Telegram bot token, resolved from /config/telegram/token_ref. */
  token: string
  /** Supergroup id (negative integer for supergroups). Optional in v1 (solo). */
  supergroupId?: string
  /** Tree path to mount as the bot's view-source. Default '/forum-agent'. */
  treeMount: string
  /** Owner's Telegram user_id — privileged commands check against this. */
  ownerId: string
  /** Polling vs webhook. v1 = polling for simplicity; v2 may webhook. */
  mode?: 'polling' | 'webhook'
}

/**
 * Handle to a running Telegram bot binding. Returned by bootTelegramBot.
 *
 * @api
 */
export interface TelegramBot {
  /** Owner's Telegram user_id. */
  readonly ownerId: string
  /** Stop polling, close any webhook, release resources. */
  stop(): Promise<void>
}

/**
 * A topic in the shared supergroup. Managed by exactly one bot.
 */
export interface ManagedTopic {
  topicId: number
  title: string
  kind: 'general' | 'task-board' | 'review-queue' | 'thread' | 'bot-status'
  /** For 'thread' kind, the forum thread id this topic mirrors. */
  threadId?: string
  /** Which peer's bot owns this topic. */
  ownerBotId: string
}

/**
 * An incoming user action the bot translates to a tree mutation.
 */
export type IncomingAction =
  | { kind: 'command'; command: string; args: string; from: string; chatId: number; topicId?: number }
  | { kind: 'reaction'; emoji: string; from: string; messageId: number; topicId?: number }
  | { kind: 'reply'; text: string; from: string; replyToMessageId: number; topicId?: number }
  | { kind: 'text'; text: string; from: string; chatId: number; topicId?: number }

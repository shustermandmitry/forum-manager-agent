/**
 * @module telegram-bot/bootTelegramBot
 *
 * @abstract Boot one peer's Telegram bot, wire it to their agent's tree.
 *
 * @moduleType utility
 */

import type { TelegramBotOpts, TelegramBot } from './types.ts'

/**
 * @abstract Boot the Telegram binding.
 *
 * @param opts - bot token, supergroup, tree mount, owner id, mode
 * @returns handle to stop the bot
 *
 * @behaviour
 * - Validates token by calling getMe; throws on invalid.
 * - In polling mode: starts long-poll loop.
 * - Subscribes to /forum-agent/inbox + /tasks + /chat changes via tree reactive queries.
 * - On state change, calls renderer to push messages to Telegram.
 * - On incoming Telegram update, calls commands dispatcher → routes to agent mutations.
 * - Enforces ownerId for privileged commands (/pause, /resume).
 */
export async function bootTelegramBot(_opts: TelegramBotOpts): Promise<TelegramBot> {
  throw new Error('Not implemented')
}

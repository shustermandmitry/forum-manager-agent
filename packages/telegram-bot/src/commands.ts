/**
 * @module telegram-bot/commands
 *
 * @abstract Incoming-action dispatcher. Maps Telegram updates to agent mutations.
 *
 * @moduleType utility
 */

import type { IncomingAction } from './telegramBot.abstract.ts'

/**
 * @abstract Dispatch an incoming action to the appropriate agent mutation.
 *
 * @param action - normalized incoming action from Telegram
 * @param ownerId - bot owner's telegram user_id (for privilege checks)
 *
 * @behaviour
 * - `/approve <task>` → tasks mutation
 * - `/comment <task> <text>` → peerComment
 * - `/edit <thread>` → opens inline edit (author role required)
 * - `/escalate <thread>` → escalation mutation
 * - `/pause` / `/resume` → owner-only; reject otherwise
 * - `👍` reaction on draft → peerApprove
 * - `✏️` reaction → flag-for-edit task
 * - Plain text in private chat → /chat session prompt
 */
export async function dispatchIncoming(_action: IncomingAction, _ownerId: string): Promise<void> {
  throw new Error('Not implemented')
}

/**
 * @module telegram-bot/topics
 *
 * @abstract Forum-mode supergroup topic lifecycle: create, close, archive.
 *
 * @moduleType utility
 */

import type { ManagedTopic } from './telegramBot.abstract.ts'

/**
 * @abstract Create a new topic in the supergroup.
 *
 * @behaviour
 * - Uses Telegram Bot API `createForumTopic`.
 * - Returns the topic id for caller to store on the tree.
 */
export async function createTopic(_args: { title: string; kind: ManagedTopic['kind']; threadId?: string }): Promise<ManagedTopic> {
  throw new Error('Not implemented')
}

/**
 * @abstract Close a topic (Telegram allows reopen).
 */
export async function closeTopic(_topicId: number): Promise<void> {
  throw new Error('Not implemented')
}

/**
 * @abstract Edit a topic's title (used when thread state changes meaningfully).
 */
export async function editTopicTitle(_topicId: number, _title: string): Promise<void> {
  throw new Error('Not implemented')
}

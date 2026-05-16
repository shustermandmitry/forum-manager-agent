/**
 * @module telegram-bot/renderer
 *
 * @abstract Tree → Telegram render pipeline. Subscribes to tree state and
 * pushes messages / edits pinned dashboard / updates topic titles.
 *
 * @moduleType utility
 */

/**
 * @abstract Rewrite the General topic's pinned dashboard message based on
 * current digest.
 *
 * @behaviour
 * - Edits the existing pinned message (not a new send).
 * - Falls back to send-and-pin if no pinned message exists.
 */
export async function renderDashboard(_args: unknown): Promise<void> {
  throw new Error('Not implemented')
}

/**
 * @abstract Push (or update) a per-thread topic message when its inbox row changes.
 *
 * @behaviour
 * - Creates the topic if it doesn't exist (per design.md §6).
 * - Posts a status message with claude_draft + local_draft side-by-side.
 * - On subsequent changes (peer comments, status transitions), edits the same message.
 */
export async function renderThreadTopic(_args: unknown): Promise<void> {
  throw new Error('Not implemented')
}

/**
 * @abstract Append a task to the Task Board topic.
 */
export async function renderTask(_args: unknown): Promise<void> {
  throw new Error('Not implemented')
}

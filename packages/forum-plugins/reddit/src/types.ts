/**
 * @module forum-plugins/reddit/types
 *
 * Public types for the Reddit forum scraper plugin.
 */

import type { ThreadId, QueueEntry } from '../../../agent-server/src/types.ts'

/**
 * Per-instance props consumed by the plugin factory.
 */
export interface RedditScraperOpts {
  subreddits: string[]
  maxPerCall?: number
  pollIntervalMinutes?: number
}

/**
 * The reddit forum process store shape.
 */
export interface RedditForumStore {
  queue: Record<ThreadId, RedditQueueEntry>
  lastPollAt: number
  seen: Record<ThreadId, true>
  errors: { at: number; message: string }[]
  rateLimitState: { requestsThisMinute: number; minuteStartedAt: number }
}

export interface RedditQueueEntry extends QueueEntry {
  forumId: 'reddit'
  meta: {
    subreddit: string
    author: string
    score: number
    numComments: number
  }
}

export interface ThreadDetail {
  threadId: ThreadId
  context: string
  topComments: { author: string; body: string; score: number }[]
  url: string
}

/**
 * The shape a forum-plugin's main module must export to be loadable by
 * agent-server's PluginRegistry. Same fields as agent-server's PluginMetadata.
 */
export type ForumPluginExports = {
  domain: 'ForumPlugin'
  packageName: string
  propsSchema: unknown    // zod schema (ZodSchema type comes from 'zod')
  factory: (props: RedditScraperOpts) => unknown   // returns ProcessDef
}

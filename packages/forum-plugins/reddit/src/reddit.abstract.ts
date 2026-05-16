/**
 * @module forum-plugins/reddit/reddit
 *
 * @abstract Types for the Reddit forum scraper plugin.
 *
 * @moduleType type
 *
 * @api
 */

import type { ThreadId } from '../../../agent-server/src/types.ts'

export interface RedditScraperOpts {
  /** Subreddits to poll (without the leading r/). */
  subreddits: string[]
  /** Max threads returned per fetchSince call. */
  maxPerCall?: number
}

/**
 * QueueEntry shape this plugin returns. Subset of agent-server's QueueEntry.
 */
export interface RedditQueueEntry {
  threadId: ThreadId
  forumId: 'reddit'
  scrapedAt: number
  context: string
  url: string
  /** Reddit-specific extras for richer person cards. */
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
  /** Top N comments included for richer drafting context. */
  topComments: { author: string; body: string; score: number }[]
  url: string
}

export interface ForumScraperPlugin {
  forumId: string
  fetchSince(since: number): Promise<RedditQueueEntry[]>
  inspectThread(threadId: ThreadId): Promise<ThreadDetail>
}

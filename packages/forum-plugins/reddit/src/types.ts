/**
 * @module forum-plugins/reddit/types
 *
 * Public types for the Reddit forum scraper plugin.
 */

import type { ThreadId } from '../../../agent-server/src/types.ts'

export interface RedditScraperOpts {
  subreddits: string[]
  maxPerCall?: number
}

export interface RedditQueueEntry {
  threadId: ThreadId
  forumId: 'reddit'
  scrapedAt: number
  context: string
  url: string
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

export interface ForumScraperPlugin {
  forumId: string
  fetchSince(since: number): Promise<RedditQueueEntry[]>
  inspectThread(threadId: ThreadId): Promise<ThreadDetail>
}

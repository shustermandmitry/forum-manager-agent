/**
 * @module forum-plugins/reddit/reddit
 *
 * @abstract Implementation skeleton of the Reddit scraper.
 *
 * @moduleType utility
 */

import type {
  ForumScraperPlugin,
  RedditScraperOpts,
  RedditQueueEntry,
  ThreadDetail,
} from './types.ts'

/**
 * @abstract Create a Reddit forum scraper instance.
 *
 * @param opts - subreddits to poll, optional max-per-call
 * @returns scraper plugin conforming to ForumScraperPlugin contract
 *
 * @behaviour
 * - fetchSince(t): polls each subreddit's /new.json, filters threads created after t,
 *   returns up to maxPerCall entries.
 * - inspectThread(id): fetches /r/<sub>/comments/<id>.json, extracts top comments
 *   for context.
 * - Respects rate_limit from scraper.config.ts: queues calls if necessary.
 * - Sets User-Agent header per Reddit policy.
 * - Returns empty array on transient errors; throws on permanent (4xx) errors.
 */
export function createRedditScraper(_opts: RedditScraperOpts): ForumScraperPlugin {
  const notImpl = (m: string) => {
    throw new Error(`Not implemented: RedditScraper.${m}`)
  }
  return {
    forumId: 'reddit',
    fetchSince: async (_since: number): Promise<RedditQueueEntry[]> => notImpl('fetchSince'),
    inspectThread: async (_threadId: string): Promise<ThreadDetail> => notImpl('inspectThread'),
  }
}

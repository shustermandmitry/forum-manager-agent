/**
 * @module forum-plugins/reddit/reddit
 *
 * The Reddit forum plugin. Returns a ProcessDef factory that conforms to the
 * ForumPlugin contract (see agent-server/pluginRegistry).
 *
 * The factory takes per-instance opts (which subreddits to poll, max per call)
 * and returns a ProcessDef that agent-server mounts under
 * /forum-agent/forums/reddit/. The mounted process owns its own /queue, /seen,
 * polling worker, rate-limit state, and error log.
 */

import { mutation, query, worker } from '@shustermandmitry/samovar/process'
import type { ProcessDef } from '@shustermandmitry/samovar/process'
import { z } from 'zod'
import type { RedditScraperOpts, RedditForumStore } from './types.ts'

const NOT_IMPL = 'Not implemented'

/**
 * Zod schema for RedditScraperOpts. Validated by agent-server's
 * pluginRegistry before invoking the factory.
 */
export const propsSchema = z.object({
  subreddits: z.array(z.string()).min(1),
  maxPerCall: z.number().int().positive().optional().default(25),
  pollIntervalMinutes: z.number().int().positive().optional().default(240),
})

/**
 * The factory. Returns a ProcessDef ready to mount.
 *
 * @param opts - per-instance config — already validated against propsSchema
 * @returns ProcessDef
 *
 * @behaviour
 * Schema:
 *  - mutations: pollNow (manual trigger), inspectThread, markSeen
 *  - queries: queueSize, health
 *
 * Workers:
 *  - pollWorker: reactive — polls subreddits at configured cadence,
 *    respects rate_limit from scraper.config.ts (10 req/min unauth),
 *    sets User-Agent per Reddit policy, writes new threads to store.queue
 *  - dedupeWorker: removes queue entries that match store.seen
 *
 * Lifecycle:
 *  - start: init HTTP client with User-Agent
 *  - stop: cancel in-flight requests
 */
export function createRedditForumProcess(_opts: RedditScraperOpts): ProcessDef<RedditForumStore> {
  const initialStore: RedditForumStore = {
    queue: {},
    lastPollAt: 0,
    seen: {},
    errors: [],
    rateLimitState: { requestsThisMinute: 0, minuteStartedAt: 0 },
  }

  return {
    name: 'redditForum',
    children: [],
    store: initialStore,
    workers: [
      worker<RedditForumStore>('pollWorker', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      worker<RedditForumStore>('dedupeWorker', ({ get, set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
    ],
    schema: {
      // Mutations — imperative verbs. Queries — get* prefix.

      pollNow: mutation<RedditForumStore, void>(({ set, look, children }) => () => {
        throw new Error(NOT_IMPL)
      }),
      inspectThread: mutation<RedditForumStore, { threadId: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),
      markSeen: mutation<RedditForumStore, { threadId: string }>(
        ({ set, look, children }) => (_args) => {
          throw new Error(NOT_IMPL)
        },
      ),

      getQueueSize: query<RedditForumStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
      getHealth: query<RedditForumStore>((get, children) => () => {
        throw new Error(NOT_IMPL)
      }),
    },
  }
}

// Legacy alias kept for one-rev compatibility; remove once nothing imports it.
export const createRedditScraper = createRedditForumProcess

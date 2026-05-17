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
 *
 * The HTTP fetching primitives below (fetchSubreddit, fetchThreadComments)
 * are pure functions and usable independently — the ProcessDef workers call
 * them. They can be tested without samovar runtime.
 */

import { mutation, query, worker } from '@shustermandmitry/samovar/process'
import type { ProcessDef } from '@shustermandmitry/samovar/process'
import { z } from 'zod'
import type {
  RedditScraperOpts,
  RedditForumStore,
  RedditQueueEntry,
  ThreadDetail,
} from './types.ts'

const NOT_IMPL = 'Not implemented'

// ─── Constants ─────────────────────────────────────────────────────────────

const REDDIT_BASE_URL = 'https://www.reddit.com'
const DEFAULT_USER_AGENT =
  'forum-manager-agent/0.1.0 (per-peer; see https://github.com/shustermandmitry/forum-manager-agent)'
const RATE_LIMIT_RPM = 10

// ─── Plugin propsSchema ────────────────────────────────────────────────────

/**
 * Zod schema for RedditScraperOpts. Validated by agent-server's
 * pluginRegistry before invoking the factory.
 */
export const propsSchema = z.object({
  subreddits: z.array(z.string()).min(1),
  maxPerCall: z.number().int().positive().optional().default(25),
  pollIntervalMinutes: z.number().int().positive().optional().default(240),
})

// ─── HTTP fetching primitives (pure functions, no samovar dep) ────────────

/**
 * Raw shape Reddit's JSON returns for one thread.
 * Subset of fields we care about; Reddit returns many more.
 */
interface RedditRawThread {
  id: string
  title: string
  selftext: string
  author: string
  created_utc: number
  permalink: string
  url: string
  num_comments: number
  score: number
}

/**
 * Raw shape of a single comment (subset).
 */
interface RedditRawComment {
  author: string
  body: string
  score: number
}

/**
 * Reddit's listing wrapper: { kind: 'Listing', data: { children: [...] } }
 */
interface RedditListing<T> {
  kind: 'Listing'
  data: { children: Array<{ kind: string; data: T }> }
}

/**
 * Custom error for Reddit HTTP failures the caller may want to react to.
 */
export class RedditFetchError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
  }
}

/**
 * Fetch the most recent threads from a subreddit.
 *
 * @param subreddit - subreddit name without the leading `r/` (e.g., 'ebikes')
 * @param opts - fetch options
 * @returns array of normalized QueueEntry records, newest first
 *
 * @behaviour
 * - GETs `https://www.reddit.com/r/{subreddit}/new.json?limit=<maxPerCall>`.
 * - Uses User-Agent header per Reddit's policy.
 * - On HTTP 4xx, throws RedditFetchError with status — permanent failure.
 * - On HTTP 5xx or network failure, throws RedditFetchError without status — caller should retry later.
 * - Filters threads by created_utc >= since (UNIX seconds); newer-first.
 * - Returns AT MOST opts.maxPerCall entries.
 */
export async function fetchSubreddit(
  subreddit: string,
  opts: { since: number; maxPerCall: number; userAgent?: string },
): Promise<RedditQueueEntry[]> {
  const url = `${REDDIT_BASE_URL}/r/${subreddit}/new.json?limit=${opts.maxPerCall}`
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'user-agent': userAgent, accept: 'application/json' },
    })
  } catch (err) {
    throw new RedditFetchError(
      `Reddit fetch failed (network): ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!res.ok) {
    throw new RedditFetchError(`Reddit returned ${res.status}`, res.status)
  }

  const listing = (await res.json()) as RedditListing<RedditRawThread>

  if (listing.kind !== 'Listing' || !Array.isArray(listing.data?.children)) {
    throw new RedditFetchError('Reddit response has unexpected shape')
  }

  const now = Date.now()
  const sinceSec = Math.floor(opts.since / 1000)

  const entries: RedditQueueEntry[] = []
  for (const child of listing.data.children) {
    const t = child.data
    if (t.created_utc < sinceSec) continue
    entries.push({
      threadId: t.id,
      forumId: 'reddit',
      scrapedAt: now,
      context: formatThreadContext(t),
      url: `${REDDIT_BASE_URL}${t.permalink}`,
      meta: {
        subreddit,
        author: t.author,
        score: t.score,
        numComments: t.num_comments,
      },
    })
    if (entries.length >= opts.maxPerCall) break
  }
  return entries
}

/**
 * Fetch a thread + its top comments for richer drafting context.
 *
 * @param subreddit - subreddit (without `r/`)
 * @param threadId - Reddit's base36 thread id (e.g. 'abc123')
 * @param opts - options
 * @returns ThreadDetail with full body + top N comments by score
 *
 * @behaviour
 * - GETs `/r/{subreddit}/comments/{id}.json`.
 * - Reddit returns `[post_listing, comments_listing]` — extracts the comments.
 * - Sorts comments by score desc; takes top `opts.topNComments` (default 10).
 * - Same error semantics as fetchSubreddit.
 */
export async function fetchThreadComments(
  subreddit: string,
  threadId: string,
  opts: { topNComments?: number; userAgent?: string } = {},
): Promise<ThreadDetail> {
  const url = `${REDDIT_BASE_URL}/r/${subreddit}/comments/${threadId}.json`
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT
  const topN = opts.topNComments ?? 10

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'user-agent': userAgent, accept: 'application/json' },
    })
  } catch (err) {
    throw new RedditFetchError(
      `Reddit fetch failed (network): ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!res.ok) {
    throw new RedditFetchError(`Reddit returned ${res.status}`, res.status)
  }

  const payload = (await res.json()) as [
    RedditListing<RedditRawThread>,
    RedditListing<RedditRawComment>,
  ]

  if (!Array.isArray(payload) || payload.length < 2) {
    throw new RedditFetchError('Reddit thread response has unexpected shape')
  }

  const post = payload[0].data.children[0]?.data
  if (!post) {
    throw new RedditFetchError(`Reddit thread ${threadId} not found in response`)
  }

  const comments: RedditRawComment[] = payload[1].data.children
    .map((c) => c.data)
    .filter((c): c is RedditRawComment => Boolean(c?.author && c?.body))

  const topComments = [...comments]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((c) => ({ author: c.author, body: c.body, score: c.score }))

  return {
    threadId,
    context: formatThreadContext(post),
    topComments,
    url: `${REDDIT_BASE_URL}${post.permalink}`,
  }
}

/**
 * Format a raw thread into the human-readable string we feed to the LLM as
 * "context." Keeps it consistent across the polling and inspect paths.
 */
function formatThreadContext(t: RedditRawThread): string {
  const body = t.selftext ? `\n\n${t.selftext}` : ''
  return `r/ — Posted by u/${t.author}\nTitle: ${t.title}${body}`
}

// ─── Rate-limit gate (simple in-memory token bucket) ───────────────────────

/**
 * Create a rate-limit gate for Reddit's 10 req/min unauthenticated limit.
 *
 * Returns an async `wait()` function that resolves immediately if under the
 * rate, or sleeps until a slot is free.
 *
 * Pure in-memory; resets when the process restarts. Sufficient for v1
 * (multiple subreddits on the same peer share the same gate).
 */
export function createRateLimitGate(rpm: number = RATE_LIMIT_RPM) {
  const callTimes: number[] = []
  const windowMs = 60_000

  return {
    async wait(): Promise<void> {
      const now = Date.now()
      // Drop expired entries.
      while (callTimes.length > 0 && callTimes[0]! <= now - windowMs) {
        callTimes.shift()
      }
      if (callTimes.length >= rpm) {
        const sleepMs = callTimes[0]! + windowMs - now + 50
        await new Promise((r) => setTimeout(r, sleepMs))
        return this.wait()
      }
      callTimes.push(now)
    },
    /** Current calls-in-window count, for /health queries. */
    count(): number {
      const now = Date.now()
      return callTimes.filter((t) => t > now - windowMs).length
    },
  }
}

// ─── ProcessDef factory ────────────────────────────────────────────────────

/**
 * The factory. Returns a ProcessDef ready to mount.
 *
 * @param opts - per-instance config — already validated against propsSchema
 * @returns ProcessDef
 *
 * @behaviour
 * Schema:
 *  - mutations: pollNow (manual trigger), inspectThread, markSeen
 *  - queries: getQueueSize, getHealth
 *
 * Workers:
 *  - pollWorker: reactive — polls subreddits at configured cadence using
 *    fetchSubreddit; respects createRateLimitGate; writes new threads
 *    to store.queue
 *  - dedupeWorker: removes store.queue entries that appear in store.seen
 *
 * Lifecycle:
 *  - start: initialize rate-limit gate
 *  - stop: cancel in-flight fetches via AbortController
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

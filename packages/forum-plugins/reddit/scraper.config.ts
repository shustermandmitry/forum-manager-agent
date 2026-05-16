/**
 * @module forum-plugins/reddit/scraper.config
 *
 * @abstract Declarative scraper config for Reddit. JSON-API kind — every Reddit
 * page exposes `.json` with the structured payload.
 *
 * @moduleType type
 */

/**
 * Reddit scraper config — handed to the generic declarative-runtime in the agent.
 */
export const redditScraperConfig = {
  forum_id: 'reddit',
  kind: 'json-api' as const,
  endpoint: 'https://www.reddit.com/r/{subreddit}/new.json',
  list_selector: 'data.children[].data',
  thread_fields: {
    id: 'id',
    title: 'title',
    body: 'selftext',
    author: 'author',
    timestamp: 'created_utc',
    url: 'url',
    replies: 'num_comments',
  },
  pagination: {
    type: 'cursor' as const,
    param: 'after',
  },
  auth: {
    type: 'public' as const,
  },
  rate_limit: {
    rpm: 10,
  },
  // Reddit insists on a meaningful User-Agent
  headers: {
    'User-Agent': 'forum-manager-agent (per-peer; see https://github.com/shustermandmitry/forum-manager-agent)',
  },
}

export default redditScraperConfig

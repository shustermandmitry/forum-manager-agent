// Plugin contract exports — what agent-server's PluginRegistry consumes.
export { createRedditForumProcess as factory } from './reddit.ts'
export { propsSchema } from './reddit.ts'
export const domain = 'ForumPlugin' as const
export const packageName = '@forum-manager-agent/forum-plugins-reddit'

// Direct-use exports.
export { createRedditForumProcess, createRedditScraper } from './reddit.ts'
export { redditScraperConfig } from '../scraper.config.ts'

export type {
  RedditScraperOpts,
  RedditForumStore,
  RedditQueueEntry,
  ThreadDetail,
  ForumPluginExports,
} from './types.ts'

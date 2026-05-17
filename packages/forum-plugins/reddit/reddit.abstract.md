# forum-plugins/reddit — what it does for you

The Reddit forum scraper. The first forum supported, and the simplest — Reddit exposes structured JSON for every page (`/r/ebikes.json`, `/r/ebikes/comments/abc123.json`), no authentication required for reads.

This is also the bootstrap output of `scraper-generator` — generating this plugin from scratch is the first test that the generator works.

## What you configure

In your `app.config.ts`:

```typescript
forums: [
  {
    pluginName: '@forum-manager-agent/forum-plugins-reddit',
    forumId: 'reddit',
    enabled: true,
    props: {
      subreddits: ['ebikes', 'ebikebuilding', 'diyelectronics', 'electric_vehicles'],
      maxPerCall: 25,
    },
  },
]
```

agent-server reads this, mounts a `redditForum` process at `/app/forums/reddit/`, configured with your subreddits.

## What it does

- Polls each configured subreddit every few hours (cadence per your `pollIntervalMinutes`).
- Fetches new threads since the last poll, dedupes against `/seen/`, drops new threads into `/queue/`.
- Sets a User-Agent header per Reddit's policy.
- Respects rate limits (10 req/min unauthenticated).

## What it does NOT do

- **No authentication in v1.** Public read only. OAuth (for posting to your account, or accessing private subs) requires a future config option.
- **No posting.** Even with OAuth, the agent never posts via this plugin. You always post manually. (Disclosure ethic — see `docs/user/disclosure-policy.md`.)
- **No comment monitoring on threads you've posted in.** v2 feature — for now, you check your Reddit inbox yourself.

## Reddit-specific extras

The plugin includes Reddit-specific fields in person cards (subreddit affinity, comment karma, post karma if visible). These help your draft prompt know who you're talking to.

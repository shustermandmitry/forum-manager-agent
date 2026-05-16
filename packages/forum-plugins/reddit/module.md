# forum-plugins/reddit

Reddit scraper plugin. Declarative `json-api` kind — Reddit exposes `.json` on every page (`/r/ebikes.json`, `/r/ebikes/comments/abc123.json`), no auth needed for read.

Bootstrap output of `scraper-generator`. The first forum supported in Phase 1.

## Responsibility

- Poll configured subreddits via Reddit's public JSON endpoints.
- Return new threads since a timestamp, in the agent's `QueueEntry` shape.
- Respect Reddit's rate limit (10 req/min for unauthenticated; check User-Agent header is set).
- Capture fixtures for offline tests.

## Non-responsibilities

- Not authenticated. v1 uses public endpoints only. OAuth (for posting / private subs) is a later config option.
- Not a real-time stream. Polled, not WebSocket.
- Not a comment poster — the agent never posts via this plugin (or any plugin) in v1. Human posts manually.

## Plugin contract

All forum-plugins implement the same contract:

```typescript
interface ForumScraperPlugin {
  forumId: string
  fetchSince(since: number): Promise<QueueEntry[]>
  inspectThread(threadId: string): Promise<ThreadDetail>
}
```

The agent loads plugins per `/config/forums` and calls `fetchSince` on cron, `inspectThread` for deeper context when needed.

## Subreddits covered (configured in /config)

Per agent's `/config/forums[].subreddits` (set per peer):
- /r/ebikes
- /r/ebikebuilding
- /r/diyelectronics
- /r/electric_vehicles

Easily extensible — just add to config.

## Dependencies

| Package | Used for |
|---|---|
| `undici` | HTTP client (fetch wrapper with better Node ergonomics) |
| `zod` | Validate Reddit JSON response shape (defensive against API drift) |

## Structure

```
forum-plugins/reddit/
├─ module.md
├─ package.json
├─ scraper.config.ts           ← declarative config
└─ src/
   ├─ index.ts                 ← thin export
   ├─ reddit.abstract.ts       ← types
   └─ reddit.ts                ← implementation skeleton
└─ test/
   ├─ fixtures/                ← captured sample pages (empty in scaffold)
   │  └─ .gitkeep
   └─ reddit.test.ts           ← extraction shape tests (to be written)
```

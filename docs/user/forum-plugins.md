# Forum plugins

How forum-manager-agent supports forums. How you add new ones. How you generate new ones from scratch using the scraper-generator.

## What a forum plugin is

A plugin is one npm package that knows how to scrape one forum (or one family of forums — e.g., a Discourse plugin handles many Discourse-software instances with different configs).

Each plugin is a **ProcessDef factory**:

```typescript
// Conceptual shape
type ForumPluginFactory<TProps> = (props: TProps) => ForumPluginProcess
```

When agent-server boots, it reads your `app.config.ts`'s `forums[]` list. For each entry, it imports the named package, calls the factory with the per-instance props, mounts the resulting process at `/app/forums/<forumId>/`.

After that, the process reactively polls its forum on its own schedule, drops new threads into `/queue/`, and the agent's drafting pipeline picks them up.

## Built-in plugins

In Phase 1, only one ships:

- **`@forum-manager-agent/forum-plugins-reddit`** — declarative `json-api` scraper. No auth required. Covers public subreddits.

Future Phase 1.5+:

- `endless-sphere` — declarative HTML scraper with CSS selectors
- `osf-discord` — code-mode plugin (Discord gateway + auth)
- `bafang-aftermarket` — declarative HTML
- `hackernews` — declarative `json-api` (Algolia search API)

## Adding an existing plugin

In your `app.config.local.ts`:

```typescript
forums: [
  // ...existing entries
  {
    pluginName: '@forum-manager-agent/forum-plugins-reddit',
    forumId: 'reddit',
    enabled: true,
    props: {
      subreddits: ['ebikes', 'ebikebuilding'],
      maxPerCall: 25,
    },
    pollIntervalMinutes: 240,
  },
]
```

Restart agent-server. The plugin loads, mounts, starts polling.

Each plugin's `props` shape is plugin-specific — refer to its `module.md` or `<name>.abstract.md` for what fields it takes.

## Generating a new plugin

If no plugin exists yet for a forum you want to cover, the **scraper-generator** does the heavy lifting.

```bash
$ pnpm forum-plugins-gen https://endless-sphere.com
```

What happens, end to end:

1. **Inspects the URL** — fetches sample pages, looks for JSON endpoints, detects pagination, checks robots.txt.
2. **Asks Claude** to fill in the declarative scraper schema based on what was found. Or, if the forum can't be handled declaratively (e.g., SPA, gateway-based), writes a code-mode scraper instead.
3. **Validates Claude's output** — schemas get zod-checked; code gets syntax-checked.
4. **Scaffolds the package** on disk:

```
packages/forum-plugins/endless-sphere/
├─ package.json
├─ module.md
├─ scraper.config.ts          # declarative (or src/scraper.ts for code-mode)
└─ test/
   ├─ fixtures/                # captured sample pages
   └─ scraper.test.ts          # asserts extraction shape
```

5. **Smoke-tests** by running the generated plugin against the fixtures.
6. **Reports** a diff and the smoke-test result. You read, decide.

```
$ pnpm forum-plugins-gen https://endless-sphere.com

Inspecting...
  ✓ Front page fetched (1.2 MB HTML)
  ✓ 5 sample thread pages captured
  ✓ Pagination: page-number style, param=p
  ✗ No JSON API detected
  ✓ RSS feed found at /external.php?type=RSS2
  ✓ robots.txt: scraping allowed, 1 req/sec hint
  → Inferred kind: html

Asking Claude to propose a scraper schema...
  ✓ Schema returned (declarative, kind=html, 12 selectors)
  ✓ Validation passed

Scaffolding packages/forum-plugins/endless-sphere/...
  ✓ package.json
  ✓ module.md
  ✓ scraper.config.ts
  ✓ test/fixtures/ (5 pages, 2.1 MB)
  ✓ test/scraper.test.ts

Smoke-testing against fixtures...
  ✓ 5/5 threads extracted with all required fields
  ✓ Pagination link detection works

DONE. Review the diff:
  git diff packages/forum-plugins/endless-sphere/

Add to your config:
  forums: [
    {
      pluginName: '@forum-manager-agent/forum-plugins-endless-sphere',
      forumId: 'endless-sphere',
      enabled: true,
      props: {
        subforums: ['e-bike-general', 'motors', 'controllers'],
      },
      pollIntervalMinutes: 360,
    }
  ]
```

You skim the diff. If selectors look right, commit. Restart agent-server. New forum covered.

If they look wrong, edit and commit, or re-run the generator with adjustments. Generators are deterministic from their inputs — re-running with the same forum produces similar output (Claude's stochasticity is mostly absorbed by schema validation).

## When a forum changes its layout

Forums occasionally redesign. Selectors stop matching. Your scraper starts returning empty results. The fix: re-run the generator.

```bash
$ pnpm forum-plugins-gen endless-sphere --regenerate
```

`--regenerate` means: reuse the existing package path, refresh fixtures, generate new selectors against the new layout. Review the diff carefully — you may want to keep some manual customizations.

## Code-mode plugins (escape hatch)

Some forums don't fit declarative scraping:

- **Discord** — requires gateway connection, bot auth, real-time event handling. Generator emits a code-mode plugin using `discord.js`.
- **SPAs** with no HTML to scrape — generator emits a code-mode plugin using Playwright for headless-browser-based extraction.
- **Forums with severe anti-scraping** — generator may refuse and recommend manual integration instead.

Code-mode plugins are still scaffolded by the generator, but you'll need to fill more by hand. The contract (`ForumScraperPlugin` ProcessDef) is the same; the implementation is yours.

## Plugin registry and discovery

All registered plugins live in a registry keyed by their schema domain (`ForumPlugin`, `LLMPlugin`, etc.). The dashboard queries this registry to populate the "add a forum" dropdown in Settings. Only plugins that produce the right schema appear.

This means: if you write a custom plugin for some niche forum and publish it as a private npm package, you can install it (`pnpm add my-private-org/forum-plugin-X`), restart agent-server, and the dashboard's Settings panel discovers it automatically.

## Authentication

The declarative schema has an `auth:` field:

- `'public'` (default) — no auth needed
- `'oauth'` — OAuth flow (you wire up the credentials)
- `'cookie'` — session cookie-based (browser-extension helper recommended)

For `oauth` and `cookie`, the plugin emits `auth_ref` keys in its config. You fill them with secret references (in `.env` or keychain). The plugin reads them at boot.

Generator does NOT inspect or fill auth automatically — too forum-specific, too sensitive. It emits a template; you complete it.

## Sharing plugins with the team

Each peer installs plugins independently. If you've authored a plugin or generated one that works well:

1. Push it to a registry (npm, your private org, or just GitHub)
2. Share the install command with teammates
3. Each teammate adds it to their own `app.config.local.ts`

Plugins are per-peer. There's no shared registry of "team-approved plugins" — but a simple wiki page or README can serve.

## Privacy concern: rate limiting

When multiple team members run the same plugin pointed at the same subreddit, you collectively make N× more requests. Be considerate. Reddit's rate limit (10 req/min for unauth) is shared per IP — usually not a problem since each peer has their own IP, but if you all use the same VPN, it adds up.

Suggested: `pollIntervalMinutes` of at least 240 (4 hours) for shared subreddits. The forum doesn't move fast enough to warrant more.

## What plugins do NOT do

- They do NOT post to forums. Even with auth configured. Only humans post (in v1; class-authorized auto-post in Phase 3+).
- They do NOT engage with threads — no comments, no reactions, no votes. Read-only.
- They do NOT track posting from your account. If you reply to a thread, the plugin doesn't notice; you can mark threads as "responded" yourself via the dashboard.

## Next

- [scraper-generator package overview](../../packages/scraper-generator/scraper-generator.abstract.md)
- [Reddit plugin overview](../../packages/forum-plugins/reddit/reddit.abstract.md)
- [How it works](how-it-works.md)

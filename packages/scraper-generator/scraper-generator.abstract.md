# scraper-generator — what it does for you

A CLI tool. You point it at a forum URL; it generates a new forum-plugin package (in `packages/forum-plugins/<name>/`) ready to scrape that forum. You review the diff, commit, restart your agent-server. Now you cover one more forum.

This is how you add forum coverage without hand-writing each integration.

## What it does

1. **Inspects** the forum URL — fetches sample pages, looks for JSON endpoints (Reddit-style `.json`, Discourse-style `/api/`), detects RSS feeds, examines pagination patterns, checks robots.txt.
2. **Asks Claude** to either fill in the declarative scraper schema (preferred) or write a code-mode scraper (escape hatch for weird forums) based on the inspection.
3. **Validates** Claude's output — schemas get zod-checked; code gets syntax-checked.
4. **Scaffolds** the new plugin package on disk — `package.json`, `module.md`, scraper config (or scraper code), test fixtures (captured sample pages), test file.
5. **Smoke-tests** the plugin against captured fixtures — does it extract the right fields?
6. **Reports** a diff for you to review.

## What you do

```bash
$ pnpm forum-plugins:gen https://endless-sphere.com
```

Wait a couple of minutes. Read the generated files. If it looks right, `git add` and commit. Restart agent-server. The plugin auto-registers.

## When it doesn't work

- **Forum requires auth** (Discord, private subreddits): generator detects this, emits config stubs with `auth_ref` keys you need to fill manually.
- **Forum is an SPA with no HTML**: generator falls back to code-mode, emits a scraper.ts using Playwright or similar. Heavier.
- **Forum changes**: re-run the generator. Review the diff. Commit. (Generators aren't self-updating — by design.)

## What it does NOT do

- Not the scraper runtime. Generated plugins run inside your agent-server, not inside this generator.
- Not an authentication helper. If your forum needs OAuth, you set up the credentials. Generator only emits the placeholder.
- Not a generic web scraper. It generates *forum scrapers* — paginated thread lists with author/title/body extraction. Random websites are out of scope.

## Generated plugin shape

Every plugin the generator emits conforms to the same contract — a `ForumScraperPlugin` ProcessDef factory taking config props, returning a process with `fetchSince(since)` and `inspectThread(id)`. Same as any hand-written plugin. The generator just writes the boilerplate.

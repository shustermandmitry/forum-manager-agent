# scraper-generator

CLI + library tool that **generates** new forum scraper plugins. Given a forum URL, inspects the site, asks Claude to propose either a declarative scraper config or code-mode scraper, scaffolds the resulting package into `packages/forum-plugins/<name>/` with fixtures and tests.

This is the "layer above" the agent that lets the user expand forum coverage without hand-writing each integration.

## Responsibility

- Inspect a forum URL: fetch sample pages, look for JSON endpoints (`.json` suffix, `/api/`, RSS), probe pagination patterns, check robots.txt.
- Hand the inspection report to Claude with a prompt: "fill this declarative schema, OR explain why this forum needs code-mode and write a scraper.ts."
- Validate Claude's output against the schema (zod-style).
- Scaffold the resulting package: `package.json`, `module.md`, `scraper.config.ts` (or `src/scraper.ts`), `test/fixtures/<sample-pages>`, `test/scraper.test.ts`.
- Run the generated plugin once against fixtures to verify extraction shape.
- Print a diff for human review before committing.

## Non-responsibilities

- Not the scraper runtime. Generated plugins run inside agent-server as MCP servers / direct imports.
- Not Claude orchestration in production. This generator runs OUT OF BAND, when a user wants to add a forum.
- Not a forum schema versioning system. Forums change; the user re-runs the generator and reviews the diff.
- Not a credential manager. If a forum needs auth, the generator emits config templates with `auth_ref` keys; user fills via /config/.

## Public API

```typescript
// Library API
generateForumPlugin(opts: GenerateOpts): Promise<GeneratedPlugin>

// CLI:
//   forum-plugins-gen <forum-url-or-name> [--out=packages/forum-plugins/<name>] [--code-mode]
```

## Workflow

```
$ forum-plugins-gen https://endless-sphere.com
      ↓
inspect-forum: fetch front page, sample 5 thread pages, check for /api/ or .json,
               detect pagination markers, scan robots.txt
      ↓
build-prompt: feed inspection report + template scraper schema to Claude
      ↓
claude (via Claude Code): returns either filled schema OR scraper.ts + rationale
      ↓
validate: zod-check the schema, or syntax-check the code
      ↓
scaffold: write package files into packages/forum-plugins/<name>/
      ↓
smoke-test: run extraction against captured fixtures, assert basic shape
      ↓
report: print diff + smoke-test results; user reviews + commits
```

## Dependencies

| Package | Used for |
|---|---|
| `cheerio` | HTML parsing for inspection + selector validation |
| `zod` | Validate Claude's schema outputs |
| `execa` | Spawn `claude --print` (reuses llm-bridge's pattern; but we could also depend on @forum-manager-agent/llm-bridge directly) |
| `@forum-manager-agent/llm-bridge` | Optional — use the shared Claude client instead of spawning directly |

## Structure

```
scraper-generator/
├─ module.md
├─ package.json
├─ templates/                  ← scaffolding templates for emitted packages
│   ├─ package.json.hbs
│   ├─ module.md.hbs
│   ├─ scraper.config.ts.hbs
│   └─ scraper.test.ts.hbs
└─ src/
   ├─ index.ts                 ← barrel
   ├─ cli.ts                   ← CLI entry
   ├─ generator.abstract.ts    ← types
   ├─ inspectForum.ts          ← URL → InspectionReport
   ├─ generateForumPlugin.ts   ← main entry, orchestrates inspect → claude → scaffold
   └─ scaffold.ts              ← templates → disk
```

## Out of scope for v1

- Auth-flow inference (OAuth dance discovery). Generator emits a stub; user wires manually if needed.
- Self-updating plugins. When a forum changes, re-run the generator.
- Generated plugins are committed to git; not hot-loaded.

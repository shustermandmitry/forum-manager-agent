# forum-manager-agent — AI Instructions (local overrides)

This repo INHERITS conventions from `~/WebstormProjects/spicetime-architecture/CLAUDE.md`, with the overrides below. Read that file too if you're working on samovar pieces; everything else there applies here.

## Conventions overridden in this repo

### NO `.abstract.ts` files

The parent CLAUDE.md prescribes `.abstract.ts` for module specs. **In this repo, drop them.** Reason: "abstract" is markdown-shaped user-doc content; embedding it in TS as JSDoc was polluting code with prose.

Instead:

- **Types** live in `types.ts` per package. Plain TypeScript exports. No huge JSDoc.
- **User-facing module overview** lives in `<name>.abstract.md` per package. Markdown. Becomes part of the user-doc site (generated via samovar-doc-site).
- **Engineering spec** stays in `module.md` per package.

The skeleton workflow is still **design → skeleton → implement**, but skeleton files = `types.ts` (types) + thin `.ts` implementation files with `throw 'Not implemented'` stubs. No abstract.ts in the chain.

### User docs DRIVE design

User-doc sections precede implementation. The flow:

1. Add user-doc section in `docs/user/<functionality>.md` describing what the feature does for the user.
2. Update `docs/design.md` (engineering) + relevant `module.md` to match.
3. THEN scaffold or fill stubs.

If you can't describe a feature in user-doc-shape before building it, it's not ready.

### User docs are generated via samovar-doc-site

Use the existing `samovar-doc-site` package from spicetime-architecture. Don't reinvent. Configuration points it at this repo; build artifacts publish to gh-pages.

## Conventions specific to this repo

### Two config files

- `samovar.config.ts` — build-time only (targets, entries, vite config). Don't put app-runtime values here.
- `app.config.ts` — app-runtime (focus, voice, forums, policy, retraining, etc.). agent-server reads at boot, seeds `/config/` tree branch.

### Plugins ARE ProcessDefs (factory pattern)

Every plugin (forum, llm, future) is a factory `<TSchema>(props) => TSchema`, generic over its returned schema. Schema declares its domain in the plugin registry. UI discovery + dashboard add-menus + scaffolding generators all key off the registry.

### Dashboard = typed tree view

The dashboard package is also the typed-tree-view layer. Composite zod schema of the whole tree, schema-aware add/move/remove menus per node, standard `usePath` treenity client hooks for reads. No separate typed-tree-view package.

### Reactive everywhere

No polling loops outside of forum-process workers. Async API calls are wrapped as reactive query-shaped funcs (hook-style). Downstream subscribes; nothing scans.

## Samovar-side change requests

When you identify a feature that should live in samovar (not this repo) — record it in `~/.claude/projects/-Users-dmitryshusterman-WebstormProjects/memory/samovar_*_request.md`. **Do not modify samovar in this repo's sessions.** We work against current samovar; samovar absorbs requested features on its own timeline.

Existing requests:
- `samovar_typed_dynamic_children_request.md`
- `samovar_config_mount_handler_request.md`

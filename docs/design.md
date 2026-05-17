# forum-manager-agent — Engineering Design

**Status**: Locked 2026-05-16 (evening revision). Source of truth for architecture and engineering decisions.

**Audience**: engineers building or extending this. For user-facing docs see [index.md](index.md). For team-review functionality + workflow spec see [../SPEC.md](../SPEC.md).

**Major revision history:**
- 2026-05-16 morning: initial design (monolithic forumAgent ProcessDef, .abstract.ts pattern, app section in samovar.config)
- 2026-05-16 evening: **this version.** Per-process architecture, plugins as ProcessDef factories, dashboard = typed tree view, app.config.ts separate from samovar.config.ts, .abstract.ts dropped in favor of .abstract.md user docs

---

## 1. What this is

A samovar/treenity app where each user runs their own instance — own agent, own local LLM, own Claude account, own DB. Helps non-expert users engage substantively on technical forums by combining Claude Code (technical substance) with a local Qwen 2.5 32B + LoRA trained on the user's edits (authentic voice). Human curates every message. Inter-peer collaboration via Telegram supergroups, not a shared server.

First use case: grassroots community engagement for Smart E-Bike. The design is general.

---

## 2. Core principles

1. **Peer sovereignty** — no central server. Each peer is admin on their own node.
2. **Agent-as-proxy** — every interaction (forum reader, forum reply, peer reviewer, peer comment, team member) is mediated by the human's agent. Other peers never reach into your node; they reach into your bot.
3. **Telegram is the fabric** — inter-peer collaboration happens through Telegram supergroups + bots. No tree-to-tree sync v1-3.
4. **Human curation is primary** — every message is human-reviewed by default. Auto-post is unlocked per-class only after evidence of trust.
5. **Voice fidelity is non-negotiable** — local LoRA, trained on user's own edits, makes output sound like the user.
6. **Disclosure ethic** — uncurated messages carry an AI disclosure footer. People always know whether they have the human's real attention.
7. **Training data captured from day 1** — every (thread, claude_draft, local_draft, user_final, choice) tuple recorded.
8. **Per-process architecture** — forumManager is a parent; each forum is its own child process; llm-bridge is a process. Reactive everywhere.
9. **Plugin factory pattern** — plugins are `<TSchema>(props) => TSchema` factories; schema declares its domain in a registry; UI discovery is generic.
10. **Dashboard = typed tree view** — composite zod schema of the whole tree; schema-aware add/move/remove menus per node; standard `usePath` treenity client hooks for reads.
11. **Config = initial tree structure** — `app.config.ts` (separate from build-time `samovar.config.ts`) seeds `/config/` tree branch at boot.
12. **`.abstract.ts` files DROPPED** — types in `types.ts`; per-module user-facing overview in `<name>.abstract.md`. Reverses parent CLAUDE.md convention; project-local CLAUDE.md captures the override.

---

## 3. Architecture

### Two targets, per-process structure

```
Each peer's machine:
┌─────────────────────────────────────────────────────────────────┐
│ forum-manager-agent — one samovar app, two build targets        │
│                                                                 │
│ ┌─── NODE TARGET ────────────────────────────────────────────┐ │
│ │ Always-on background process. Built with BOTH node-napi    │ │
│ │ AND plain node-ts bindings (binding stress test).          │ │
│ │                                                            │ │
│ │ Treenity instance — the tree, sqlite-backed                │ │
│ │ │                                                          │ │
│ │ ├─ /config/         seeded from app.config.ts at boot      │ │
│ │ ├─ /forum-agent/    parent forumManager ProcessDef         │ │
│ │ │  ├─ /forum-agent/forums/                                 │ │
│ │ │  │  ├─ /reddit/   redditForum ProcessDef (instance)      │ │
│ │ │  │  ├─ /endless-sphere/  endlessSphereForum (instance)   │ │
│ │ │  │  └─ ...        one process per configured forum       │ │
│ │ │  ├─ /llm-bridge/  llmBridge ProcessDef                   │ │
│ │ │  ├─ /inbox/       drafts awaiting curation               │ │
│ │ │  ├─ /training/    LoRA training data                     │ │
│ │ │  ├─ /people/      person cards                           │ │
│ │ │  └─ /tasks/       work items                             │ │
│ │ │                                                          │ │
│ │ └─ websocket endpoint                                      │ │
│ │                                                            │ │
│ │ In-process bindings (not separate processes):              │ │
│ │   - Telegram bot (grammY)                                  │ │
│ │   - Subprocess drivers (Claude Code spawner, mlx socket)   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─── CLIENT TARGET ────────────────────────────────────────┐   │
│ │ Webview dashboard (Solid + Vite)                          │   │
│ │  - Connects to node target via standard treenity-client   │   │
│ │    websocket + usePath hooks                              │   │
│ │  - Typed tree view (schema-aware add/move/remove)         │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (peers connect via Telegram only)
                              ▼
                ┌──────────────────────────────────────┐
                │  Shared Telegram forum-mode supergroup│
                │  ├─ @your_bot, @alice_bot, @bob_bot   │
                │  ├─ topic: thread #12345              │
                │  ├─ topic: review queue               │
                │  └─ topic: task board                 │
                └───────────────────────────────────────┘
```

### Why per-process

The earlier (morning) design had one monolithic `forumAgent` ProcessDef owning everything (queue, inbox, scrapers, LLM dispatch). Evening revision splits this:

- **`forumManager` parent** — coordinator. Children: one per active forum, plus llm-bridge.
- **One process per forum** (e.g., `redditForum`, `endlessSphereForum`) — owns its own polling, its own queue slice. Reactive subscribers downstream see new entries.
- **`llmBridge` process** — owns Claude subprocess driver + mlx-lm socket. Exposes hook-style reactive query funcs.

Reasons:
- Each forum has its own lifecycle (pollIntervalMinutes, auth state, rate limits). Isolating into a process per forum localizes failure (one forum API hiccup doesn't kill all others).
- Adding/removing forums = adding/removing children. Aligns with the (future) typed-dynamic-children API.
- Reactive subscriptions across processes are samovar's native model; trying to drive everything inside one process means worker logic gets stringy and hard to test.

### Build target stress test

Two node targets exist for the same code, to exercise samovar's binding system:
- `node-napi` — native-NAPI binding (no actual Rust crate in this app; binding mechanism is what's being tested)
- `node-ts` — plain TypeScript binding (no codegen)

Both should produce identically-behaving builds. CI runs both; behavioral parity tests prove they agree.

The `browser` target is for the dashboard.

### Subprocess bridges (unix sockets)

External processes connect via unix sockets:

- **Claude Code**: spawned per-call via `claude --print`. Cold start ~300ms. Auth via Max session on disk (no API key in process).
- **Local LLM** (mlx-lm): long-running `mlx_lm.server` listening on a configured socket path. Model + LoRA load once at server start (~30s). Reconnect logic in llm-bridge handles socket drops.

---

## 4. The agent loop (reactive + outside-driven)

The pipeline per thread:

```
[forum process worker]
  reactively polls forum (poll lives INSIDE worker; output is reactive store updates)
        │
        ▼
  appends new threads to its own /queue store slice
        │
        ▼ (reactive subscription)
[forumManager.draftScheduler]
  picks unranked threads → dispatches to llm-bridge
        │
        ▼ (reactive query funcs over llm-bridge process)
  - claudeDraft = llm.draft({ ... })       — runs in parallel
  - localDraft  = llm.draft({ ... })       — both written reactively
        │
        ▼ (both ready)
[/forum-agent/inbox/<threadId>]
  status: awaiting-curation
  claudeDraft, localDraft both present
        │
        ▼ (Telegram bot + dashboard subscribe; user notified)
[user reviews via Telegram or dashboard]
  picks → edits → "ready to post"
        │
        ▼
[user copies, posts manually on forum]
        │
        ▼
[/forum-agent/training/<threadId>]
  preference pair + final + edit distance recorded
```

### Two-stage pipeline for technical threads

For threads needing substance the user lacks:

```
Claude generates substantive answer (claude_raw)
        │
        ▼
[llm-bridge.voice() call — local model only]
  rewrites claude_raw in user's voice using voiceSamples + redLines
        │
        ▼
local_voiced (the actual local draft shown alongside claude_raw)
```

Plus: `/instructions/claude/<topic>.md` accumulates as user-curated prompt-augmentation. Injected into Claude system prompt for matching topics.

### Outside-loop, not inside-Claude

Each LLM call is one focused decision (rank, or draft, or voice, or chat). The agent's code drives the orchestration. Claude does not orchestrate via tool-use loops in v1 (cheaper, more auditable, easier to debug). Inside-loop reserved for specific Phase 3+ tasks where Claude's mid-task adaptability adds value.

### Reactive primitives, not scanning

Polling lives inside forum-process workers. Everything else subscribes. The agent's draftScheduler subscribes to the union of all forums' /queue slices; when any of them changes, the scheduler reacts. No top-level scan loop.

API calls are wrapped as reactive query-shaped funcs (hook-style, e.g., `useThreadsSince(forum, since)` returns reactive). Consumers subscribe; no awaiting at the top level.

---

## 5. Plugin factory pattern + registry

Every plugin (forum, llm, future) follows this contract:

```typescript
interface Plugin<TSchema> {
  domain: string                      // e.g., 'ForumPlugin', 'LLMPlugin'
  factory: (props: TPropsForSchema) => TSchema
  propsSchema: ZodSchema              // for validation in dashboard
}
```

### Registry

A `PluginRegistry` (in agent-server) collects plugin metadata at boot. Two ways a plugin lands in the registry:

1. **Static install** — the plugin is listed in `app.config.ts`'s `forums[]` (or future analogous list). agent-server imports the package, registers its plugin.
2. **Discovery scan** (Phase 2+) — agent-server scans `node_modules` for packages with a `forumManagerAgentPlugin` field in their `package.json`, registers them as available even if not yet instantiated.

Dashboard queries the registry:
- "What plugins fit slot `/app/forums/*`?" → populates "add a forum" dropdown.
- "What's the props schema for `@forum-manager-agent/forum-plugins-reddit`?" → generates the per-instance config form.

### Why this matters

The plugin pattern + registry + dashboard's typed-tree-view together mean:
- Adding a new forum = `pnpm add <plugin>` + open dashboard + click "add forum" + fill form (validated by plugin's own schema) + submit. No code changes.
- Plugin authors don't need to know anything about the dashboard. They expose a schema; the dashboard auto-renders the form.
- Scaffolding CLIs (`forum-plugins-gen`) work because the plugin shape is consistent.

### Plugins ARE ProcessDefs

A forum plugin's `factory` returns a `ProcessDef`. When mounted at e.g. `/app/forums/reddit/`, agent-server treats it like any other process: workers run, store is reactive, queries/mutations dispatch through it. The plugin author writes the workers; the framework handles mount lifecycle.

---

## 6. Forum plugins specifically

### Plugin contract

```typescript
interface ForumPluginInstance {
  forumId: string
  // Reactive query-shaped — subscribers re-evaluate when new threads arrive
  threadsSince(since: number): ReactiveResource<QueueEntry[]>
  inspectThread(threadId: ThreadId): Promise<ThreadDetail>
  // Lifecycle (provided by ProcessDef harness, plugin doesn't implement)
}
```

### Two implementation modes

**Declarative** (preferred):
```typescript
export const config: ForumScraperConfig = {
  kind: 'json-api',
  endpoint: 'https://www.reddit.com/r/{subreddit}/new.json',
  thread_fields: { id: 'id', title: 'title', body: 'selftext', ... },
  pagination: { type: 'cursor', param: 'after' },
  rate_limit: { rpm: 10 },
  // ...
}
```
A generic declarative runtime (in agent-server) interprets this config: builds the URL, fetches, extracts via JSON-paths or CSS selectors, applies rate limiting, returns conforming entries.

**Code-mode** (escape hatch):
```typescript
// For forums that can't fit the declarative schema (Discord, SPAs, ...)
export const factory: ForumPluginFactory<MyProps> = (props) => ({
  forumId: 'discord',
  threadsSince(since) {
    // custom Discord-gateway code...
  },
  // ...
})
```

### Generation

`scraper-generator` package emits new plugins from a forum URL. Inspects, asks Claude to fill declarative config (or write code-mode for outliers), scaffolds the package on disk. See `packages/scraper-generator/scraper-generator.abstract.md`.

### Hybrid (c) strategy

Default: declarative. Escape hatch: code. Both implement the same plugin contract; the agent doesn't distinguish at runtime.

---

## 7. LLM bridge (as a process)

`llmBridge` is a ProcessDef mounted at `/forum-agent/llm-bridge/`. Resources:

- Claude subprocess driver (spawns `claude --print` per call)
- mlx-lm socket client (long-running connection)

Public surface: a set of mutations and reactive query funcs:

```typescript
// Mutations (each spawns a subprocess call or socket request)
mutations: {
  rank: (args: RankArgs) => Promise<RankResult>
  draft: (args: DraftArgs) => Promise<DraftResult>
  voice: (args: VoiceArgs) => Promise<VoiceResult>   // local only
  chat: (args: ChatArgs) => Promise<ChatResult>
}

// Reactive query funcs (hook-style, for consumers wanting subscriptions)
useClaudeRanking(threadCtx): reactive RankResult
useLocalDraft(threadCtx): reactive DraftResult
// ...
```

Per-call routing is config-driven:
```typescript
config.models.routing = {
  rank: 'local',    // local handles ranking
  draft: 'both',    // run both in parallel
  voice: 'local',   // always local
  chat: 'claude',   // chat with the user
}
```

Adaptive routing (per-class win-rate) is Phase 3+.

---

## 8. Dashboard = typed tree view

The dashboard package serves two roles: it's the desktop UI client, AND it's the typed-tree-view layer that policies all dashboard-side mutations against schema.

### Schema registry

A `TreeSchemaRegistry` is built at boot from each mounted ProcessDef's own schema declaration. The composite zod schema of the whole tree is the union.

```typescript
type TreeSchemaRegistry = {
  pathPattern: string               // e.g., '/app/forums/*'
  schema: ZodSchema                 // the shape of nodes at this path
  allowedChildren?: ZodSchema[]     // what can be added as children
  allowedActions: ('read' | 'edit' | 'add-child' | 'move' | 'remove')[]
}[]
```

### Form renderer

Schema-aware form generation. Six field kinds in v1:
- string
- number
- boolean
- enum (dropdown)
- list of strings (tag editor)
- ref-to-secret (one-way valve — set/update only, never display)

Each plugin's `propsSchema` is mapped through the renderer to produce the instance-creation form.

### Add/move/remove menus

Right-click any tree node:
- **Add child** — menu queries registry for "what schemas can be a child of this path?" Only valid candidates appear.
- **Edit** — opens the form for the node's schema. Submit triggers a typed mutation.
- **Move** — destination must satisfy the moved subtree's schema. Drag-drop UI prevents invalid drops.
- **Remove** — confirmation modal; checks for downstream dependencies.

### Standard reads via `usePath`

For reads (subscriptions to tree state), the dashboard uses standard treenity client `usePath` hooks. No custom client primitive — leverage what samovar-client / treenity provide.

### Where the type policing fits in the architecture

```
[user action in dashboard]
        │
        ▼
[dashboard's typed-tree-view layer]
  - looks up schema for target path
  - validates new value against schema
  - if invalid: reject in UI, never sends to server
        │
        ▼ (valid)
[treenity-client websocket]
        │
        ▼
[agent-server's mutation handler]
  - re-validates (defense in depth)
        │
        ▼
[/forum-agent/...] update
```

Two-layer validation: client-side (good UX, immediate feedback) + server-side (defense in depth against malicious or buggy clients).

### Future: auto-form-generation samovar-side

Currently we hand-write the form-rendering logic. When samovar lands the view-side type registry primitive (see `samovar_config_mount_handler_request.md` in memory), this could move into samovar; dashboards across the ecosystem benefit. For now, project-local.

---

## 9. Data model

Each process owns its tree slice. The agent-server tree at boot is:

```
/                          (treenity root)
├─ /config/                seeded from app.config.ts; live-editable from dashboard
│  ├─ focus
│  ├─ forums (list)
│  ├─ policy
│  ├─ models
│  ├─ telegram
│  └─ retraining
│
├─ /forum-agent/           parent forumManager ProcessDef
│  ├─ /forum-agent/forums/                children-typed-as-ForumPlugin
│  │  ├─ /reddit/         redditForum process instance
│  │  │  ├─ store: { queue, lastPollAt, seen, errors, ... }
│  │  │  └─ workers: { pollWorker, dedupeWorker, ... }
│  │  ├─ /endless-sphere/ endlessSphereForum process instance
│  │  └─ ...
│  │
│  ├─ /forum-agent/llm-bridge/    llmBridge ProcessDef
│  │  ├─ store: { claudeStatus, localStatus, recentCalls, ... }
│  │  └─ workers: { healthMonitor, ... }
│  │
│  ├─ /forum-agent/inbox/<id>     awaiting curation
│  ├─ /forum-agent/training/<id>  LoRA preference pairs + finals
│  ├─ /forum-agent/people/<handle>  person cards
│  ├─ /forum-agent/instructions/claude/<topic>.md
│  ├─ /forum-agent/permissions/   CSS-like selector ACL
│  ├─ /forum-agent/tasks/<id>     work items
│  └─ /forum-agent/chat/<session>/messages
```

### Each process slice is its own schema

The composite tree schema is the union of every mounted process's local schema. The typed-tree-view in the dashboard knows the schema for `/forum-agent/forums/reddit/store/queue/<id>` because the redditForum ProcessDef declared it.

### Permissions: hierarchical, CSS-like

```
/permissions/
  rules: [
    { selector: '/forum-agent/inbox/*', role: 'peer', grant: ['read'] },
    { selector: '/forum-agent/inbox/*[reviewMode=peer-review]', role: 'peer', grant: ['read', 'comment'] },
    { selector: '/forum-agent/training/**', role: '*', grant: [] },  // private by default
    ...
  ]
  peers: { '<telegramUserId>': { role: 'peer' | 'viewer' | 'guest' | 'author' } }
```

Inheritance: child paths inherit parent permissions unless overridden locally. Same model as CSS specificity.

---

## 10. Telegram integration

Each peer brings their own bot (registered with @BotFather). Multiple bots coexist in shared supergroups.

Forum-mode supergroup, topics auto-managed:
- 📌 General — pinned dashboard
- 📋 Task Board
- 🔍 Review Queue
- 💬 \<forum> #\<id> — per-forum-thread topics
- 🤖 Bot Status — health/errors/retraining

Telegram bot rendering is reactive: it subscribes to tree changes, pushes message updates. Incoming actions (commands, reactions, replies) are dispatched to agent-server mutations.

Telegram NEVER stores anything authoritative. Tree is source-of-truth. Nuke the supergroup → bot rebuilds topics from tree on next start.

---

## 11. Permission system

(Unchanged from morning version; recap.)

Hierarchical, CSS-like (selectors + grants). Roles: `guest`, `viewer`, `peer`, `author`. Per-thread `reviewMode`: `solo` | `peer-review` | `gated`. Each peer's `/training/`, `/instructions/`, `/people/` notes, voice config — private volume, never exposed.

Future: expertise-weighted voting (Phase 4) — requires ≥3-party interactions per data point.

See [docs/user/team-collaboration.md](user/team-collaboration.md) for the user-facing description.

---

## 12. Disclosure policy

(Unchanged from morning; recap.)

Policy: `no-human-edit`. If user_final has zero edits from chosen draft → footer applied. Author-role peer edits remove footer (their words contributed).

Escalation: forum reply containing the configured trigger phrase halts agent activity in that thread, pings owner.

See [docs/user/disclosure-policy.md](user/disclosure-policy.md) for the user-facing contract.

---

## 13. Per-thread workflow lifecycle

State machine:

```
[scraped] → [drafting] → [awaiting-curation]
                              │
                              ▼
                  [solo | peer-review | gated]
                              │ user actions / peer approvals
                              ▼
                       [ready-to-post]
                              │ user posts manually
                              ▼
                          [posted]
                              │
                              ▼
                         [archived]

abandonment can happen at any state → [abandoned]
```

Every transition writes an oplog event. Queryable for reports.

---

## 14. Tasking system

Tasks at `/forum-agent/tasks/<task_id>`:

```typescript
type Task = {
  id: TaskId
  type: 'curate-draft' | 'peer-review' | 'gate-approve' | 'handle-escalation' | 'retrain-prompt'
  assignee: PeerId
  threadId?: ThreadId
  status: 'open' | 'in-progress' | 'completed' | 'blocked'
  ...
}
```

Auto-assigned on state transitions. Surfaced in Telegram Task Board topic + dashboard Tasks view. Subject to permissions (peer-review tasks visible to assignees + other peers in shared topics).

---

## 15. Config & secrets

### Two config files

| File | Purpose | Edit-time | Live in tree? |
|---|---|---|---|
| `samovar.config.ts` | Build-time: targets, entries, vite config | rare | no |
| `app.config.ts` | App-runtime: focus, voice, forums, policy, retraining | per-peer overlay via `app.config.local.ts` | yes (seeded at boot) |

`app.config.ts` schema is zod-validated (see `app.config.ts` in repo root).

### Boot sequence for config

1. agent-server loads `app.config.ts` (or per-peer overlay `app.config.local.ts` if present).
2. Validates against `AppConfigSchema`.
3. Seeds `/config/` tree branch with the loaded values.
4. After this, **tree is source of truth.** Dashboard mutations update `/config/` on tree; do NOT write back to the file. (See deferred section — future samovar config-mount-handler may live-sync.)

### Secrets — never on tree

| Lives in | Reachable from dashboard? | Synced to peers? |
|---|---|---|
| `.env` (Phase 1) or OS keychain (Phase 2) | One-way valve only (set/update; never read) | Never |

Tree holds **references** like `auth_ref: 'claude.max'`, resolved at boot.

Dashboard Settings panel: non-secrets are two-way bound; secrets show `✓ configured / ✗ not set` with a one-way `[Set] / [Update]` modal that writes to the secret store and never reads back.

### Per-peer overlays

```
samovar.config.ts          ← workspace default, committed
app.config.ts              ← workspace default, committed
app.config.local.ts        ← per-peer overlay, gitignored
.env                       ← per-peer secrets, gitignored
```

agent-server merges `app.config.ts` + `app.config.local.ts` (latter wins) at boot.

---

## 16. The agent-as-proxy insight

From the user's design language:

> "The agent is a proxy agent — he treats comms between team peers same as forum relationships."

From your agent's perspective, @alice (your teammate) and @some_user (a forum participant) are the same kind of entity — external entities you have relationships with, mediated through your bot's API surface.

This collapses complexity:
- `/people/<handle>` cards work for both forum users AND team peers
- Permission rules apply uniformly
- Engagement logic doesn't branch on `is_team_member`
- Phase 4 expertise scoring works across the whole graph

The only difference is transport:
- Forum participants → reach you via scrapers (you post manually back)
- Team peers → reach you via Telegram

But to the agent, both are entities with relationships, history, permissions.

---

## 17. Open / deferred / samovar-side dependencies

Known unknowns. Not blockers for v1.

### Samovar-side features we depend on (recorded in memory; not blocking)

- **Typed dynamic children API** — currently `ProcessDef.children` is static. We pre-declare children from `app.config.ts` at boot (acceptable for v1). When samovar lands typed-dynamic-children, hot add/remove without restart. See `samovar_typed_dynamic_children_request.md` in memory.
- **Config-driven tree branch generation** — samovar could auto-gen `/config/` from `app.config.ts` shape via a config-mount-handler. v1 manually seeds. See `samovar_config_mount_handler_request.md` in memory.
- **View-side type registry primitive** — currently we hand-roll the typed-tree-view in our dashboard. Samovar could provide a primitive that auto-generates forms from schemas, usable across vscode shell, figma, future apps. v1 project-local.

### Internal deferred

- Permission dashboard UX richer than v1's basic role assignment
- Expertise scoring + 3-party interaction requirement (Phase 4)
- Conflict resolution between peer reviewers (weighted voting, tie-breaking, overrule paths)
- Group lifecycle automation refinements
- Cross-peer training data export format
- Tree-to-tree p2p sync via Hyperswarm (Phase 5)
- Local model authority promotion algorithm (Phase 3)
- Forum-posting identity / agent-posts-for-you (later, with disclosure)

---

## 18. References

- User docs: [docs/index.md](index.md)
- Roadmap: [docs/roadmap.md](roadmap.md)
- Team review: [SPEC.md](../SPEC.md)
- Per-package overviews: each `packages/<name>/<name>.abstract.md`
- Per-package engineering: each `packages/<name>/module.md`
- App config schema: [app.config.ts](../app.config.ts)
- Build config: [samovar.config.ts](../samovar.config.ts)
- Local CLAUDE.md (project-local conventions override): [CLAUDE.md](../CLAUDE.md)
- Parent (samovar) conventions: `~/WebstormProjects/spicetime-architecture/CLAUDE.md`
- Memory: `~/.claude/projects/-Users-dmitryshusterman-WebstormProjects/memory/design_forum_manager_agent_2026-05-16.md`
- Samovar feature requests: `~/.claude/projects/.../memory/samovar_typed_dynamic_children_request.md`, `samovar_config_mount_handler_request.md`
- Recovered original chat sources: `~/.claude/projects/.../{a642bb5e-...,aa31212e-...}.jsonl`

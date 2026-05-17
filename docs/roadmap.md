# forum-manager-agent — Roadmap

**Branch of**: [spicetime-architecture/packages/samovar/roadmap.md](../../spicetime-architecture/packages/samovar/roadmap.md) — this app depends on samovar/treenity and inherits its phasing constraints.

**Authoritative design**: [design.md](design.md)

Last updated: 2026-05-16

---

## Phase 0 — Scaffold + design lock ✅ (in progress this session)

- [x] Repo created at `~/WebstormProjects/forum-manager-agent/`
- [x] Workspace + .gitignore + README
- [x] Design doc written (`docs/design.md`)
- [x] Roadmap written (this file)
- [x] Memory entry created (`design_forum_manager_agent_2026-05-16.md`) + indexed in MEMORY.md
- [x] `git init` + remote wired to https://github.com/shustermandmitry/forum-manager-agent
- [x] Skeleton: per-package `module.md` + stub `.ts` files for all 6 Phase 1 packages
- [x] **2026-05-16 evening re-lock** — `.abstract.ts` pattern dropped (was prose-in-TS pollution); per-module `<name>.abstract.md` user-facing overview added instead; types collapsed to `types.ts`; per-process architecture replaces monolithic forumAgent; plugin factory pattern + registry; dashboard absorbs typed-tree-view (composite zod schema); `app.config.ts` separate from `samovar.config.ts`; CLAUDE.md at repo root for project-local conventions
- [x] User-doc site structure (`docs/index.md` + 7 user guides in `docs/user/`) — describes functionality + workflows before implementation per repo CLAUDE.md doc-first rule
- [x] Samovar-side feature requests recorded in memory: typed dynamic children + config-mount-handler

## Phase 0.5 — Build pipeline wiring (2026-05-16 evening)

Status: PARTIAL. Library code filled across 4 packages. Type-check working for 2/6 packages. Blocked on samovar's own createProcess.ts TS errors (see memory `samovar_createProcess_ts_errors_2026-05-16.md`).

Done:
- [x] **Pass 3 library code**: llm-bridge (claudeCode, localModel, router, parseRank), reddit HTTP primitives (fetchSubreddit, fetchThreadComments, rate-limit gate), agent-server pluginRegistry, scraper-generator (inspectForum + scaffold + generateForumPlugin + cli), dashboard schemaRegistry
- [x] **pnpm overrides + workspace links** to spicetime-architecture/packages/{samovar, samovar-cli, samovar-test, samovar-utils}
- [x] **`pnpm install`** succeeds (135 packages resolved)
- [x] **tsconfig.base.json + 6 per-package tsconfigs** added
- [x] **Per-package exports → `src/*.ts`** (so type-check works without a build step)
- [x] **`pnpm exec samovar-cli`** runs (after `tsx` installed as dep)

Blocked / TODO:
- [ ] **Fix samovar's createProcess.ts TS errors** (samovar-side work — not this repo). Currently blocks type-check for agent-server, llm-bridge, forum-plugins/reddit, scraper-generator.
- [ ] **Per-package `samovar.config.ts` files** — each declares its target (`browser-wasm` for dashboard, `node-napi` for everything else, with `isTs: true` to skip Rust). NOT yet written; need to verify exact shape from samovar-cli source first (no extrapolating per `feedback_samovar_shapes_from_source_only.md` in memory).
- [ ] **Update design.md §3** to reflect correct target names (`browser-wasm` / `node-napi` + `isTs` flag) — currently mentions `node-napi` / `node-ts` / `browser` which is incorrect.
- [ ] **`samovar-cli build`** — runs but errors on empty workspace-root config; needs per-package configs first.
- [ ] **`samovar-cli test`** — to try once configs are in.
- [ ] **Fill remaining stubs** that need samovar runtime: forumManager workers, llmBridgeProcess body, redditForum workers, bootAgentServer body, dashboard's Solid components (formRenderer/treeNavigator/app/treeClient), telegram-bot bodies.

---

## Phase 1 — Solo curator (one peer, one forum, both models)

**Goal**: You run the agent on your own machine. Reddit scraper feeds threads. Claude + local Qwen both draft. You curate every message via Telegram + webview. Every interaction generates training data.

**Acceptance**: For one week, the system surfaces 20+ candidate threads/day from r/ebikes + r/ebikebuilding, you curate without filling out paperwork, and `/training/` has 100+ rows with non-trivial edit distance.

### Packages

- [ ] `packages/agent-server/` — node target — treenity instance + agent ProcessDef + websocket endpoint
- [ ] `packages/dashboard/` — client target — Solid + Vite webview, websocket client
- [ ] `packages/telegram-bot/` — node target — grammY-based bot (runs inside agent-server process; package separation is for clarity, not separate runtime)
- [ ] `packages/llm-bridge/` — node target — Claude Code subprocess driver + mlx-lm socket client
- [ ] `packages/scraper-generator/` — node target — Claude-driven generator that emits new `forum-plugins/*` packages from a forum URL
- [ ] `packages/forum-plugins/reddit/` — first scraper (declarative kind: `json-api`) — **generated** by scraper-generator as the bootstrap test of the generator pipeline

### Targets stress test

- [ ] Build agent-server with `node-napi` binding
- [ ] Build agent-server with plain `node-ts` binding
- [ ] Verify both produce equivalent runtime behavior (one decisive smoke test)

### Tree shape

- [ ] `/forum-agent` ProcessDef mounted
- [ ] `/queue`, `/inbox`, `/seen`, `/training`, `/config`, `/instructions/claude/`
- [ ] `/people/<handle>` cards created on first interaction
- [ ] `/chat` history per user-bot session

### Workflow

- [ ] Cron every 4h: scraper → `/queue`
- [ ] Agent picks unranked queue items → both models draft in parallel → `/inbox`
- [ ] Telegram notification (your private chat) with both drafts
- [ ] Dashboard view: queue + inbox + diff between drafts
- [ ] Curation actions: pick / edit / save / mark-for-future / abandon
- [ ] On `ready-to-post`: copy-paste-friendly output (you post manually)
- [ ] On post: write `/training/<id>` row, advance to `posted`

### Config & secrets

- [ ] `/config/` tree shape (focus, voice, policy, models, forums, retraining cadence, autopost_classes)
- [ ] `.env.example` checked in; `.env` gitignored
- [ ] Secret-reference resolver at agent-server load (resolves `*_ref` keys against `process.env`)
- [ ] Dashboard Settings panel — non-secret region two-way bound to `/config/`
- [ ] Dashboard Settings panel — secrets region shows configured/not-configured status only (no value display); v1 just says "edit .env to change"

### Disclosure policy

- [ ] Hardcoded `no-human-edit`
- [ ] Footer template configurable in `/config/policy/disclosure_footer`
- [ ] Detection: if `user_final === claude_draft || user_final === local_draft`, append footer to copy-paste output
- [ ] Escalation trigger phrase stub (Phase 1: just log + notify; full halt logic in Phase 2)

### Local LLM

- [ ] mlx-lm server scaffold (Qwen 2.5 32B q4 or q5)
- [ ] Unix socket bridge from node
- [ ] Day-1: no LoRA, base instruct
- [ ] Document baseline quality (what does Qwen 32B base look like on Reddit forum drafts?)

### Permissions

- [ ] Stub permissions table (you're the only peer — everything is allowed for owner)
- [ ] Tree path-based ACL primitive (no UI yet)

---

## Phase 2 — Multi-peer over Telegram

**Goal**: Two peers (you + one other) run independent agents. Both bots are in a shared supergroup. Per-thread review_mode controls work. Tasking system surfaces work.

**Acceptance**: You assign a thread for peer-review, the other peer's bot surfaces it in the review topic, they comment, you see the comments in your bot, you decide. End-to-end without manual coordination.

### Telegram supergroup

- [ ] Forum-mode supergroup created (manual setup, both bots added as members)
- [ ] General topic with pinned dashboard message (bot rewrites on state change)
- [ ] Per-thread topic creation triggered by `review_mode != solo`
- [ ] Task Board topic
- [ ] Review Queue topic
- [ ] Topic close on `posted` / `abandoned`

### Tasking

- [ ] `/tasks/<id>` tree shape
- [ ] Task auto-assignment on state transitions
- [ ] Task Board topic in Telegram renders open tasks
- [ ] Quick-action commands: `/approve <task>`, `/comment <task> <text>`

### Permissions v2

- [ ] CSS-like selector engine for permission rules
- [ ] Roles: peer, viewer, guest, author
- [ ] Per-thread `review_mode` + `review_peers` + `gate_peers`
- [ ] `gated` mode: post blocked until all `gate_peers` approved
- [ ] Bot enforces permissions before exposing any data to any user
- [ ] Permission dashboard panel in webview (minimal first cut)

### Workflow extensions

- [ ] Peer-review flow: bot posts in review topic, peer reacts/comments, owner sees aggregated feedback
- [ ] Author role: peer can edit draft text in their own bot, edit propagates back to owner
- [ ] Disclosure policy correctly handles author edits (footer removed when author contributed text)
- [ ] Escalation trigger: full halt in forum thread + notify owner + create handle-escalation task

### Secrets to keychain

- [ ] Replace `.env` with OS keychain via `keytar` or `@napi-rs/keyring`
- [ ] Migration tool: read existing `.env`, write to keychain, prompt user to delete `.env`
- [ ] Dashboard Settings — secrets one-way-valve UI (set/update writes to keychain; status shows ✓/✗; never reads values back)

### Multi-peer testing

- [ ] Two instances on two machines (or one machine + container for the second peer)
- [ ] Cross-bot interaction in shared supergroup verified

---

## Phase 3 — Autonomy

**Goal**: Local model has earned authority in narrow thread-classes. Low-stakes threads in those classes can auto-post (still with disclosure footer). LoRA retraining is automated.

**Acceptance**: At least one thread-class (e.g., "thanks-and-acknowledgment replies on r/ebikes") auto-posts for a week without intervention, no embarrassment, training data continues accumulating.

### LoRA pipeline

- [ ] Automated weekly retraining job
- [ ] Pre-promotion A/B: new LoRA shadow-runs alongside current for N days; user A/B-picks; new LoRA promoted if win rate exceeds threshold
- [ ] LoRA versioning + rollback
- [ ] Per-class LoRAs (e.g., `voice-technical`, `voice-acknowledgment`)

### Authority shifts

- [ ] Per-(forum, thread-class) win-rate tracking from training data
- [ ] Surface order in inbox flips when local wins class > 70% over rolling 30-day window
- [ ] Auto-post unlock per class: local wins > 90% AND zero "had to edit substantially" flags AND user has confirmed > 50 instances → class enters `autopost_classes`
- [ ] Auto-post still always carries disclosure footer

### More forums

- [ ] endless-sphere scraper (`html` kind — needs CSS-selector schema)
- [ ] OSF Discord (code-mode plugin — gateway + auth)
- [ ] BAFANG forum (whichever forum software they use)

### Voice profile evolution

- [ ] Tooling to inspect what the LoRA has converged on
- [ ] Drift detection: if user starts editing more, retraining cadence increases

---

## Phase 4 — Expertise scoring + governance

**Goal**: Peers gain weighted authority on specific topics. Contested drafts resolve via weighted voting. Three-party interactions feed the score model.

**Acceptance**: For one topic where two peers disagree, the scoring layer suggests whose recommendation should weight more, with rationale based on past interactions.

### Scoring model

- [ ] Per-(peer, topic) expertise weight
- [ ] Updated from peer review outcomes (whose suggestions led to better outcomes per user feedback)
- [ ] Three-party requirement: each scored interaction has ≥ 3 distinct peer perspectives
- [ ] Voting weights applied in `gated` mode for tie-breaking

### Dashboard

- [ ] Peer expertise map: who's strong on what
- [ ] Score change explanations ("@alice gained +0.3 on motor-controllers because her review of thread #1234 led to a +5 outcome")

### Conflict resolution

- [ ] Explicit conflict detection (two `author`-role edits that contradict)
- [ ] Resolution paths: owner decides, weighted vote, escalation, fork-and-pick

---

## Phase 5 — P2P tree mounting (when samovar lands Hyperswarm)

**Goal**: When `t.mount.remote` via Hyperswarm ships in samovar, peers can optionally expose specific tree slices for direct peer access (e.g., `/people/` cards) without going through Telegram.

**Acceptance**: With explicit consent on both sides, peer A can read peer B's `/people/<some_handle>` card to enrich their own context, without a tree dump or Telegram message.

Not blocking on this until samovar p2p ships.

---

## Cross-cutting

### Documentation

- [ ] `docs/setup.md` — getting started (Phase 1)
- [ ] `docs/telegram-setup.md` — bot registration + supergroup wiring
- [ ] `docs/lora-training.md` — mlx-examples workflow for retraining
- [ ] `docs/permissions.md` — selector syntax + role catalog
- [ ] Per-package `module.md` (always before code, per CLAUDE.md)

### Testing

- [ ] samovar-test integration (uses `node-napi` + `node-ts` targets as the cross-binding stress test)
- [ ] Mock Telegram for bot-flow tests
- [ ] Mock Reddit for scraper tests
- [ ] LLM responses mocked in CI; real models only in `it.skip`'d integration tests

### Operational

- [ ] Single-machine deploy guide (your laptop, always-on)
- [ ] Backup strategy for the tree (sqlite snapshot)
- [ ] Health monitoring (Bot Status topic in Telegram)

---

## What we explicitly don't build

- **Central server / hosted multi-tenant SaaS** — peer-sovereign by design
- **Tree-sync between peers in v1-3** — Telegram is the fabric; p2p comes when samovar lands it
- **Custom Telegram client** — Telegram's own apps are the UI on phone; we just run bots
- **Bot posting to forums on user's behalf in v1-3** — risk too high (account bans, voice slipping); user posts manually
- **Cross-peer LoRA federation** — each voice stays personal; no federated learning
- **Schedule-based posting** — drafts are surfaced when ready; user decides when to post
- **Image / video / audio generation** — text only

---

## Coordination with parent roadmaps

This roadmap **branches** from samovar's main trajectory. Specifically:

- Inherits samovar's package conventions (each package owns its `module.md`, `.abstract.ts`, etc.)
- Uses samovar's target system (`node-napi` + plain `node-ts` + `browser` + `browser-jsdom`)
- Uses samovar-test for testing (when stable)
- **Does not block on samovar features** — Phase 1 only needs what samovar has today
- Phase 5 depends on samovar's Hyperswarm p2p mount landing

Updates to this roadmap should be reflected in the matching memory entry (`design_forum_manager_agent_2026-05-16.md`) and back-linked in the parent samovar roadmap when a phase lands.

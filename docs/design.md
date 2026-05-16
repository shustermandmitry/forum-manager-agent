# forum-manager-agent — Design

**Status**: Locked 2026-05-16. Source of truth for the agent's architecture.

**Prior context recovered from chat history** (`~/.claude/projects/.../a642bb5e-...jsonl` May 5 lines 100–141, `aa31212e-...jsonl` May 11 lines 223–226) — that design was never persisted to memory, hence this repo.

---

## 1. What this is

A samovar/treenity app that helps a non-expert engage substantively on technical forums (endless-sphere, /r/ebikes, BAFANG, OSF Discord, etc.) without sounding AI-generated, without faking expertise, and without revealing AI involvement on uncurated posts.

It is **not** a forum-posting bot. It is a **curation system** where the human stays in the loop on every message until specific narrow classes earn enough trust to auto-post.

The first use case is grassroots community engagement around the Smart E-Bike project. The design is general — any team can run an instance for any focus (product promotion, problem-solving, expertise-building, community membership).

---

## 2. Core principles

1. **Peer sovereignty** — each user runs their own instance: own agent process, own local LLM, own Claude account, own DB. No central server. No shared admin. Each peer is admin on their own node.
2. **Agent-as-proxy** — every interaction (forum reader, forum reply, peer reviewer, peer comment, team member) is mediated by the human's agent. Other peers never reach into your node; they reach into your bot, which checks permissions and decides what to surface.
3. **Telegram is the fabric** — inter-peer collaboration happens entirely through Telegram supergroups + bots. No tree-to-tree sync in v1 (Hyperswarm `t.mount.remote` is future).
4. **Human curation is primary** — for every message, the human reviews two drafts (Claude + local) and edits before posting. Auto-post is unlocked per-class, only after evidence of trust.
5. **Voice fidelity is non-negotiable** — local LoRA, trained on the user's own edits, makes the output sound like the user. Cannot afford to be discovered using AI for forum communications.
6. **Disclosure ethic** — when no human edit was made before post, the message carries an AI-generated footer. People always know whether they have the human's real attention.
7. **Training data is captured from day one** — every (thread, claude_draft, local_draft, user_final, choice) tuple is recorded. Day-1 local model is base-instruct only (no LoRA yet); training data accumulates from real use.

---

## 3. Architecture

### Two-target samovar app

```
Each peer's machine:
┌───────────────────────────────────────────────────────────┐
│  forum-manager-agent (samovar app)                         │
│                                                            │
│  ┌─ NODE TARGET (always-on background process) ───────┐  │
│  │                                                      │  │
│  │  Treenity tree (sqlite-backed)  ← THE DB            │  │
│  │  ├─ /forum-agent       (the ProcessDef)             │  │
│  │  ├─ /queue, /inbox, /seen, /training, /tasks, ...   │  │
│  │  ├─ /people/<handle>   (forum-participant cards)    │  │
│  │  ├─ /instructions/claude/<topic>.md                 │  │
│  │  ├─ /permissions       (per-thread + per-path ACL)  │  │
│  │  └─ /config            (focus, voice, policy)       │  │
│  │                                                      │  │
│  │  Subprocess bridges:                                 │  │
│  │  ├─ Claude Code (your Max sub, headless)            │  │
│  │  ├─ Local LLM (mlx-lm server, Qwen 2.5 32B + LoRA)  │  │
│  │  ├─ Scraper MCP servers (per forum)                 │  │
│  │  └─ Telegram bot (your bot, your token)             │  │
│  │                                                      │  │
│  │  Websocket endpoint (for the dashboard client)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ CLIENT TARGET ──────────────────────────────────────┐  │
│  │  Webview dashboard (Solid + Vite)                    │  │
│  │  ├─ subscribes to local node tree over websocket     │  │
│  │  ├─ same shape as sam-tool's client                  │  │
│  │  └─ runs in browser (or wrapped in Tauri/Electron)   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                              │
                              │ (Telegram is the ONLY inter-peer fabric)
                              ▼
                ┌──────────────────────────────┐
                │  Shared Telegram supergroup  │
                │  ├─ @your_bot                │
                │  ├─ @alice_bot               │
                │  ├─ @bob_bot                 │
                │  ├─ topic: thread #12345     │
                │  ├─ topic: review queue      │
                │  └─ topic: task board        │
                └──────────────────────────────┘
```

### Samovar target bindings

- **node target** — built with both `node-napi` and plain `node-ts` bindings, to stress-test both. Rust isn't core to this app, but exercising napi keeps the pipeline honest.
- **client target** — `browser` (production) + `browser-jsdom` (tests).

### Subprocess bridges (sockets)

External processes connect via **unix sockets** (clean, local-only, no port-binding):

- **Claude Code**: spawned per-call via `claude --print` in headless mode, stdio captured. Uses Max sub auth.
- **Local LLM**: long-running `mlx_lm.server` on a unix socket (or local TCP). Model loads once (~30s for Qwen 32B), serves many requests. Slow inference (~5–15 tok/s on M1 32GB quantized) is fine — drafts are not real-time.
- **Forum scrapers**: each forum is its own MCP server in `packages/forum-plugins/<forum>/`. The agent spawns them as needed.

---

## 4. Dual-model drafting pipeline

**Both models run from day 1.** Claude is good immediately; local is bad initially and improves through LoRA retraining on captured user edits.

### Standard flow (most threads)

```
scraper → /queue/<id>
       ↓
agent picks unranked threads
       ↓
   ┌───────────────┐    ┌───────────────┐
   │  Claude Code  │    │  Local LLM    │
   │  → claude_draft│    │  → local_draft│
   └───────────────┘    └───────────────┘
       ↓                       ↓
       └───────┬───────────────┘
               ↓
       /inbox/<id>/
         ├─ claude_draft
         ├─ local_draft
         └─ status: awaiting-curation
               ↓
   Telegram notification + dashboard surface
               ↓
   User reviews both side-by-side, picks starting point, edits
               ↓
       /inbox/<id>/
         ├─ user_choice: 'claude' | 'local' | 'scratch'
         ├─ user_final: <text>
         └─ status: ready-to-post
               ↓
       User posts manually on the forum under their own handle
               ↓
       /training/<id>/  ← preference pair + final, gold for LoRA
```

### Two-stage flow (technical threads — non-expert user)

The user wants to engage in threads where they may lack technical depth. The pipeline:

```
1. Claude Code generates substantive technical answer (claude_raw)
   ↑ uses /instructions/claude/<topic>.md to be coached
2. Local LLM rewrites claude_raw into user's voice (local_voiced)
3. User reviews local_voiced, makes corrections (user_final)
4. User optionally records "instructions Claude should have known" → appends to /instructions/claude/<topic>.md
5. (claude_raw, local_voiced, user_final, edit-distance) → /training/<id>
```

The `/instructions/claude/<topic>.md` files are the user's growing **prompt-augmentation library** — equivalent to a personal CLAUDE.md per forum-topic. They get injected into next Claude call's system prompt for matching topics. This is the way to "teach Claude" without API fine-tuning.

### Outside-loop architecture

The agent code drives the loop. Each Claude / local-LLM call is a focused, single-task invocation. The LLMs do not orchestrate; they answer one question per call:

- "Rank this thread 1–10 for engagement value"
- "Draft a reply for this thread, given this context"
- "Rewrite this Claude answer in this user's voice, using these voice samples"

Outside-loop trades a bit more orchestration code for: cheap calls, auditability, every step a logged line, easy retries.

---

## 5. Data model — the treenity tree

All state lives on one treenity tree. Sqlite is just its serialization. Paths are hierarchical; permissions follow the path tree (see §7).

```
/forum-agent/
├─ config/
│  ├─ focus.md                ← system-prompt template (focus + voice + redLines)
│  ├─ forums[]                ← which forums are active
│  ├─ models/
│  │  ├─ claude               ← config for Claude Code subprocess
│  │  └─ local                ← model name, LoRA path, quantization
│  └─ policy/
│     ├─ disclosure: 'no-human-edit'
│     ├─ disclosure_footer: <template>
│     ├─ escalation_trigger: <phrase>
│     └─ autopost_classes[]   ← thread-classes graduated to auto-post
│
├─ queue/<thread_id>          ← scraped, awaiting draft
├─ inbox/<thread_id>/         ← drafted, awaiting curation
│  ├─ thread_context
│  ├─ claude_draft
│  ├─ local_draft
│  ├─ user_choice
│  ├─ user_final
│  ├─ status                  ← awaiting-curation | gated | ready-to-post | posted | abandoned
│  ├─ review_mode             ← solo | peer-review | gated
│  └─ review_peers[]
│
├─ seen/<thread_id>           ← dedupe cache
│
├─ training/<thread_id>/      ← LoRA training data (preference pairs + final)
│  ├─ thread_context
│  ├─ claude_raw
│  ├─ local_voiced
│  ├─ user_final
│  ├─ user_choice
│  ├─ edit_distance
│  ├─ commentary              ← optional user note on why edits
│  ├─ thread_class
│  └─ timestamp
│
├─ people/<forum_handle>/     ← what we know about each forum participant
│  ├─ notes.md
│  ├─ threads[]
│  ├─ expertise_tags[]
│  └─ engagement_history
│
├─ instructions/claude/<topic>.md    ← growing prompt-augmentation library
│
├─ permissions/               ← see §7
│
├─ tasks/<task_id>/           ← see §11
│
└─ chat/                      ← user ↔ agent conversation history
   └─ <session_id>/messages
```

---

## 6. Telegram integration

### Per-peer bot

Each peer registers their own Telegram bot via @BotFather, sets the token in their local `config.local.toml`. Multiple peers' bots coexist in the same supergroup.

A peer's bot:
- Listens to its own private chat (1:1 with owner) for commands + curation actions
- Listens to shared supergroups it's a member of
- Acts (posts, reacts, edits) **only** on behalf of its owner
- Enforces its owner's permissions before exposing any data (see §7)

### Supergroup structure (forum-mode with topics)

Use Telegram's forum-mode supergroups (topics, available since 2022) — one supergroup, many topics.

Topic naming convention (auto-managed by bots):

```
📌 General                    ← live registry + pinned dashboard message
📋 Task Board                 ← active tasks across all peers
🔍 Review Queue               ← drafts pending peer review
💬 r/ebikes #12345           ← per-forum-thread topic, team discussion
💬 ES #98765                  ← another forum thread
🤖 Bot Status                 ← health, errors, retraining events
```

### Automated group lifecycle

Topics are created and closed by bots as needed. Triggers:

- **New active forum thread** marked for peer-review → topic created, relevant peers invited (i.e., bot tags them)
- **Thread closed** (posted, abandoned) → topic archived (Telegram allows closing topics)
- **Task assigned** → entry in Task Board topic
- **Review requested** → entry in Review Queue topic with link to thread topic

Each topic gets:
- Pinned summary message (bot rewrites as state changes)
- Status badge (drafting / awaiting review / ready / posted)
- Quick-action bot commands (`/approve`, `/edit`, `/comment`, `/escalate`)

### Status bar / dashboard topic

The General topic's pinned message is the live dashboard:
- Active threads count per forum
- Pending curations
- Pending peer reviews
- Recent posts (last 24h)
- Each peer's bot health

Bot rewrites this message on tree changes.

### Telegram as render-only

Telegram **renders** tree state and **routes user actions back** to the tree. It does not store anything. If the supergroup is deleted, the bot rebuilds all topics from the tree on next run.

---

## 7. Permission system

### Hierarchical, CSS-like

Permissions are stored at `/permissions/` on each peer's tree. The model is **CSS-like**: selectors target tree paths or entity classes, props are permission verbs. Children inherit parent permissions by default; local overrides win.

```
/permissions/
  rules:
    - selector: "/inbox/*"
      role: "peer"
      grant: [read]
    - selector: "/inbox/<id>[review_mode=peer-review]"
      role: "peer"
      grant: [read, comment]
    - selector: "/inbox/<id>[review_mode=gated]"
      role: "author"
      grant: [read, comment, edit, approve]
    - selector: "/training/**"
      role: "*"
      grant: []                  ← private by default
    - selector: "/people/<handle>"
      role: "viewer"
      grant: [read]
```

### Roles

| Role     | Capabilities                                                                 |
|----------|------------------------------------------------------------------------------|
| `guest`  | Default for anyone reaching your bot without being granted explicit role     |
| `viewer` | Can see what you publish in shared topics; no comment privilege              |
| `peer`   | Full team member — can comment on review-mode threads, see review queue      |
| `author` | Can **modify** your draft text (highest trust). Removes AI-disclaimer when they edit (their words contributed) |

Role assignments live at `/permissions/peers/<telegram_user_id>` → `{role, ...}`.

### Per-thread overrides

Any thread can set:
- `review_mode`: `solo` (default) | `peer-review` | `gated`
- `review_peers`: list of peer IDs whose feedback you want
- `gate_peers`: list of peer IDs whose approval is required before post

In `gated` mode, the inbox row's `status` stays `gated` until all `gate_peers` have approved (👍 reaction or `/approve` command in the topic). Then `status` → `ready-to-post`.

### Private volume

Each peer has a **private volume** under `/training/`, `/instructions/`, `/people/` notes, `/config/voice` — never exposed to peers, even with `author` role. Voice and KB are personal. Sharing must be explicit export.

### Dashboard for permissions (v2)

A webview panel: visual selector tree, drag-drop roles, preview "what can @alice see right now?" Inspired by CSS devtools but for ACL. Detailed design deferred to v2.

### Expertise weights (v3)

A scoring layer: peers gain weighted authority on specific topics over time, based on the success of their reviews/contributions. Voting on contested drafts uses these weights. **Requires 3+ peer interactions per data point** (echoes the QCD-tripod intuition from the earlier ForumModerator concept). Deferred to v3.

---

## 8. Disclosure policy

**Policy: `no-human-edit`** (locked).

```
if user_final == claude_draft OR user_final == local_draft (zero edits):
    append disclosure footer to post
else:
    no footer — the human contributed final language; it's a normal post
```

### Author edits remove disclosure

If a peer with `author` role edited the draft and the owner posts it, the post is still owner's responsibility — but it contains another human's final language, so the disclosure footer is removed.

### Disclosure footer template

```
---
_This reply was drafted by an AI assistant and posted without my review. Reply to me directly or DM @<handle> for personal attention._
```

Configurable per peer at `/config/policy/disclosure_footer`.

### Escalation trigger

Any reply to a disclosed post containing the configured trigger phrase (default: `@<handle> human please`) → bot halts agent activity in that forum thread, pings owner in Telegram, owner takes over manually. The forum handle stays the same; only the brain switches from agent to human.

---

## 9. Forum scraper plugins (generated, per-forum)

Scrapers are **plugins**, one per forum (or per forum-type — e.g., one Discourse plugin can cover many Discourse-software instances with config). Each lives in its own package under `packages/forum-plugins/`.

**Scrapers are generated, not hand-written.** A scraper-generator tool (Claude-driven) takes "add coverage for forum X" and emits a new plugin package: inspects sample pages, detects whether the forum has a JSON API, fills in the declarative schema OR writes code-mode scraper for outliers, generates fixtures + tests.

This makes the scraper layer effectively unbounded — adding a new forum is "run the generator, review the diff, commit." No hand-coding new forum integrations.

**Hybrid (c) strategy:** declarative schema is the default the generator targets; code escape hatch for forums that can't fit (Discord, complex SPAs).

### Declarative scraper schema

```ts
type ScraperConfig = {
  forum_id: string
  kind: 'json-api' | 'html' | 'rss'
  endpoint: string                    // URL template
  list_selector?: string              // jq path or CSS selector
  thread_fields: {
    id: string
    title: string
    body: string
    author: string
    timestamp: string
    url: string
    replies?: string
  }
  pagination?: { type: 'cursor' | 'page', param: string }
  auth?: { type: 'public' | 'oauth' | 'cookie', ... }
  rate_limit: { rpm: number }
}
```

Phase 1 covers Reddit (`json-api`, no auth needed — `.json` suffix on URLs).

### Code escape hatch

For forums that don't fit (Discord requires gateway+auth+heavy state; complex SPAs requiring headless browsers), drop a `scraper.ts` file in the plugin package. The plugin contract is just `{fetchSince(timestamp) → Thread[]}`.

### Plugin layout

```
packages/
├─ scraper-generator/         ← the meta-tool that emits scraper plugins
│  ├─ module.md
│  ├─ src/
│  │  ├─ inspect-forum.ts    ← samples pages, detects JSON API, finds pagination
│  │  ├─ fill-schema.ts      ← Claude fills declarative schema from samples
│  │  ├─ emit-code-mode.ts   ← Claude writes scraper.ts for outliers
│  │  └─ scaffold-package.ts ← writes the new plugin package to disk
│  └─ templates/             ← package.json/module.md/test-fixture templates
│
└─ forum-plugins/             ← generated output lives here
   ├─ reddit/                ← declarative (json-api kind)
   │  ├─ package.json
   │  ├─ module.md
   │  ├─ scraper.config.ts
   │  ├─ src/index.ts        ← thin MCP server wrapping the config
   │  └─ test/fixtures/      ← captured sample pages, tests
   ├─ endless-sphere/        ← declarative (html kind)
   ├─ hackernews/            ← declarative (json-api kind)
   ├─ discord/               ← code-mode (gateway, auth)
   └─ ...
```

Each plugin is its own pnpm workspace package. Mirrors `samovar-target-plugins/` layout from spicetime-architecture (see `feedback_samovar_target_plugins_layout.md`).

### Generator workflow

```
$ pnpm forum-plugins:gen <forum-url-or-name>
       ↓
generator inspects forum (sample pages, JSON probes, pagination)
       ↓
Claude proposes: schema-kind + selectors (or code-mode + scraper.ts)
       ↓
generator scaffolds packages/forum-plugins/<name>/
  ├─ scraper.config.ts (or src/scraper.ts)
  ├─ package.json
  ├─ module.md
  ├─ test/fixtures/ (sample pages captured)
  └─ test/scraper.test.ts (asserts extraction shape)
       ↓
user reviews diff, edits if needed, commits
       ↓
plugin auto-registered with agent on next start
```

The generator IS the "layer above" the user described earlier — same shape as the broader agent-generator idea, scoped to scrapers. Other generators (e.g., "generate a focus profile from a prompt") can follow the same pattern in later phases.

---

## 10. Per-thread workflow lifecycle

A thread row in `/inbox/<id>` transitions through states:

```
   [scraped]
       ↓ agent picks unranked
   [drafting]                ← both models run in parallel
       ↓ both complete
   [awaiting-curation]       ← user sees in Telegram + dashboard
       ↓ user edits + decides review mode
   [solo]              [peer-review]              [gated]
       ↓                   ↓                          ↓
       │             [peers comment]            [peers approve]
       │                   ↓                          ↓ all approvals
       └────────────►  [ready-to-post]  ◄────────────┘
                          ↓ user posts on forum
                       [posted]
                          ↓ optional: ongoing thread monitoring
                       [archived]

   abandonment can happen at any state → [abandoned]
```

Each transition writes an oplog event, all transitions are queryable for reports.

---

## 11. Tasking system

Every action that needs a human's attention is a **task** at `/tasks/<task_id>`. Tasks are first-class, publicly visible to team members, and surfaced in the Telegram Task Board topic + dashboard.

```ts
type Task = {
  id: string
  type: 'curate-draft' | 'peer-review' | 'gate-approve' | 'handle-escalation' | 'retrain-prompt'
  assignee: PeerId
  thread_id?: string
  status: 'open' | 'in-progress' | 'completed' | 'blocked'
  created_at: timestamp
  due_at?: timestamp
  blocked_by?: string[]
}
```

Workflows assign tasks automatically. Examples:
- New thread drafted → `curate-draft` for owner
- Thread set to `peer-review` → `peer-review` task for each peer in `review_peers`
- Forum reply contains escalation trigger → `handle-escalation` for owner, blocks future agent activity in that thread

Tasks are visible to all team members (subject to permissions). Reviewers can see who's blocked on what.

---

## 12. Local LLM details

- **Base model**: Qwen 2.5 32B Instruct
- **Quantization**: q4 or q5 (mlx-lm format) to fit in 32GB M1 unified memory. Inference speed is fine — drafting is not real-time.
- **Runtime**: `mlx_lm.server` — long-running, listening on a unix socket. Node target connects via socket.
- **LoRA**: applied at load time; multiple LoRAs supported (one per draft-mode, e.g., `voice-technical`, `voice-casual`).
- **Retraining cadence**: weekly batch, runs overnight or on demand. mlx-examples LoRA fine-tuning handles it on Apple Silicon (~1–2h per run).
- **Bootstrap**: day 1 has no LoRA. Local model is base-instruct. It will be visibly weaker than Claude. **This is expected** — user already acknowledges. Side-by-side comparison from day 1 is itself the data-collection mechanism for the eventual LoRA.

---

## 13. The "agent-as-proxy" insight

A subtle but load-bearing concept the user articulated:

> "The agent is a proxy agent — he treats comms between team peers same as forum relationships."

Meaning: from your agent's point of view, @alice (your teammate) and @some_user (a forum participant you're engaging with) are **the same kind of thing** — external entities with whom you have a relationship, mediated through your bot's API surface.

This collapses a lot of conceptual complexity:
- The `/people/<handle>` cards work for both forum users AND team peers
- Permission rules apply uniformly
- The agent's "engagement" logic doesn't need to branch on `is_team_member`
- Future expertise-scoring works across the whole graph, not just one cohort

The only difference is the **transport** through which they reach you:
- Forum participants reach you through scrapers (read-only from your side, write via your manual posts)
- Team peers reach you through Telegram

But to the agent, both are entities at `/people/<id>` with relationships, history, permissions.

---

## 14. Config & secrets

**Split-store rule:** non-secret config lives in the tree (DB), editable from the dashboard. Secrets live in OS keychain or gitignored `.env`, referenced from the tree by name only.

|                          | Lives in                                          | Reachable from dashboard?                                | Synced to peers?                                       |
|--------------------------|---------------------------------------------------|----------------------------------------------------------|--------------------------------------------------------|
| **Non-secret config**    | `/config/` on the tree                            | Yes — live-editable as Settings panel                    | Optional Phase 5 (Hyperswarm), if owner opts in        |
| **Secrets**              | OS keychain (preferred) OR gitignored `.env`      | **One-way valve**: set/update only, never read/displayed | **Never**. Per-peer, per-machine.                      |

### Non-secret config (tree)

Everything in `/config/` from §5 — focus prompt, voice samples, disclosure policy + footer template, escalation phrase, forum list, model names, retraining cadence, `autopost_classes`, etc. **All in the tree.**

Why tree:
- Live reactive — change voice template, agent picks it up on next call. No restart, no file watcher.
- Dashboard Settings panel is just a view bound to `/config/` queries + mutations.
- Oplog records every config change — auditable history of "when did I last edit the focus prompt?"
- Permissions enforce owner-only by default (no peer reads your voice samples).

### Secrets (not tree)

What's a secret here:
- Claude Code auth tokens (your Max session)
- Telegram bot token (from @BotFather)
- Forum auth cookies / OAuth tokens (if any plugin needs them)
- Reddit / Hacker News / etc. API keys

Why **not** tree:
- Tree is queryable, oplog-recorded, backed up, may eventually p2p-sync (Phase 5). Putting secrets there means every backup / dev session / screenshot risks leaking them.
- Tree-level encryption is fragile — easy to get wrong, hard to audit.

Where they go, in order of preference:
1. **macOS Keychain** via `keytar` or `@napi-rs/keyring` — encrypted at rest by OS, gated by user login.
2. **`.env` or `secrets.local.toml`** (gitignored) — fine for v1 / dev, simpler to wire up first.

The tree stores **references**, not values:
```
/config/models/claude/auth_ref:        "claude.max"
/config/telegram/token_ref:            "telegram.bot_token"
/config/forum-plugins/reddit/auth_ref: "reddit.app_token"
```
At agent-server load, a loader resolves each `*_ref` against keychain/env. Tree never sees the value.

### Dashboard UX

Settings panel has two visually distinct regions:

**Non-secret** (two-way bound form):
```
[Focus prompt]         [..........................]
[Disclosure footer]    [..........................]
[Forum list]           [+ add]
[Retraining cadence]   [weekly ▼]
```

**Secrets** (one-way valve, status only):
```
[Claude Code auth]      ✓ Configured  [Update] [Remove]
[Telegram bot token]    ✗ Not set     [Set]
[Reddit auth]           ✗ Not set     [Set]
```
Click `Set` / `Update` → modal with a single password-style input → writes to keychain → never readable through the dashboard again.

### v1 → v2 migration

- **Phase 1 (v1)**: secrets in gitignored `.env` at repo root. Tree refs by name. Setup is `cp .env.example .env && edit`. Done.
- **Phase 2 (v2)**: migrate to OS keychain via keytar/keyring. Dashboard gains the one-way set/update UI. Migration tool copies from `.env` to keychain on first run, then warns about removing the file.

### Peer-sovereign implications

Each peer's secrets are **theirs alone, on their machine alone**. No way to accidentally share via tree replication, no way to leak via screenshot of dashboard. If a peer's laptop dies, they reconfigure secrets on the next install — they're not in any backup of the tree (correctly).

---

## 15. Open / deferred

These are explicitly known unknowns. Not blockers for v1; flagged so they're not lost:

- **Permission dashboard UX** — CSS-devtools-inspired ACL editor. Wireframe in v2.
- **Expertise scoring** — weighted voting, 3-party interaction requirement, how scores accumulate. Full design in v3.
- **Conflict resolution** between peer reviewers — voting weights, tie-breaking, overrule paths. v3.
- **Group lifecycle automation** — exact triggers for create/close, invitation flow, status bar messaging cadence. Refined as v2 lands.
- **Cross-peer training data export** — if @alice wants to share a slice of her training data with you (e.g., she's an expert on protocol decoding), what's the export format? v3.
- **Tree-to-tree p2p sync** — when Hyperswarm `t.mount.remote` ships in samovar, this opens up direct tree-level peer access. Currently locked: Telegram-only fabric.
- **Local model authority promotion algorithm** — per-class win rate threshold, A/B testing protocol for new LoRA versions. v2.
- **Forum-posting identity** — currently user posts manually. Future option: agent has the credentials and posts on user's behalf with disclosure. Considered higher-risk; not v1.

---

## 16. References

- Recovered from prior chats: `~/.claude/projects/-Users-dmitryshusterman-WebstormProjects/a642bb5e-6de8-488d-a126-e3af64aac604.jsonl` (May 5, lines 100–141) + `aa31212e-341a-4984-b7f4-3f90b16e73eb.jsonl` (May 11, lines 223–226)
- Related memory: [project_ebike_strategy.md](../../../.claude/projects/-Users-dmitryshusterman-WebstormProjects/memory/project_ebike_strategy.md), [project_ebike_product_lineup_2026-05-11.md](../../../.claude/projects/-Users-dmitryshusterman-WebstormProjects/memory/project_ebike_product_lineup_2026-05-11.md)
- Earlier (different) forum-related design: `myPublicSpicetime/packages/components/ForumModerator/` (the QCD-tripod "Constructive Engagement App" — different scope, but the 3-party expertise-scoring requirement here echoes its core intuition)
- Samovar conventions: [spicetime-architecture/CLAUDE.md](../../../WebstormProjects/spicetime-architecture/CLAUDE.md), [packages/samovar/DESIGN.md](../../../WebstormProjects/spicetime-architecture/packages/samovar/DESIGN.md), [packages/samovar/roadmap.md](../../../WebstormProjects/spicetime-architecture/packages/samovar/roadmap.md)

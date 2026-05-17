# The dashboard

The dashboard is the webview client you open on your laptop. It's how you do power-tool work: bulk inbox review, settings editing, permission management, visualizing the team's flow.

It connects to your local agent-server over websocket (default `ws://localhost:7710`). Same underlying tree as Telegram sees — but a different visual surface, optimized for desktop work.

## Opening it

```bash
pnpm --filter @forum-manager-agent/dashboard dev
```

Opens at `http://localhost:5173`. Bookmark it.

## The views

A left-side nav lets you switch between views. Each one shows live tree data — edits update in real time without refresh.

### Inbox

The most-used view. Lists every thread waiting for your curation, with both drafts side-by-side and a diff highlighter so you can see where they disagree.

```
┌─────────────────────────────────────────────────────────────┐
│ Inbox (3 awaiting curation)                                  │
├─────────────────────────────────────────────────────────────┤
│ r/ebikes — "BBSHD MOSFETs melting at 90°C"   [peer-review]  │
│                                                              │
│ ┌────────── Claude ──────────┐ ┌────── Local ────────────┐  │
│ │ The thermal protection on  │ │ yeah BBSHD has no temp  │  │
│ │ stock BBSHD controllers... │ │ sensor on FETs. cheap   │  │
│ │                            │ │ NTC on casing works...  │  │
│ └────────────────────────────┘ └─────────────────────────┘  │
│                                                              │
│ [Edit:_________________________________________________]    │
│                                                              │
│ [Pick Claude] [Pick Local] [Write from scratch] [Abandon]   │
└─────────────────────────────────────────────────────────────┘
```

Once you hit "Pick X" then edit, then "Ready to post," the bot DMs you the final text. Copy, paste into the forum.

### Queue

Threads scrapers have surfaced but not yet drafted. Mostly informational — you can manually trigger a draft for a thread you want sooner ("draft now"), or skip ("not interesting" → marks `/seen/`).

### Tasks

Open tasks across all categories. Filterable:

- Assigned to you
- Curate-draft (your inbox tasks)
- Peer-review (drafts where peers want your input)
- Gate-approve (drafts blocked on your approval)
- Handle-escalation (forum replies that triggered escalation)

Click a task to jump to its thread context.

### People

Person cards from `/people/`. Each card:

```
@some_redditor
├─ Notes: "Strong on hub motors, weak on BMS. Prefers technical depth."
├─ Threads: 12 engagements
├─ Tags: hub-motors, controller-tuning
└─ Last engaged: 3 days ago
```

You can edit notes inline. New cards are auto-created the first time you engage with someone.

### Permissions

Visual editor for your `/permissions/` tree. Shows your team peers and what role each has. Drag-drop role changes. v1 is basic — full design (CSS-like selector editor) lands in v2.

### Settings

The big one. Your `app.config.ts` as live-editable fields:

- **Focus** — your prompt template, voice samples (drag-drop to reorder), red lines
- **Forums** — list of installed forum plugins with their props; add / remove / edit
- **Policy** — disclosure setting, footer template, escalation trigger
- **Telegram** — supergroup id (and bot token shown as `✓ configured` or `✗ not set`, with a one-way "update" button)
- **LLMs** — local model name, LoRA path (read-only — managed by retraining pipeline), Claude auth status
- **Retraining** — cadence + min new rows threshold

Edits are validated against the config zod schema. Invalid edits highlight in red; valid ones save on blur.

### Activity

Live oplog feed — every state change as it happens. Filter by event type (`draftReady`, `scanComplete`, `claudeCallStarted`, etc.). Useful for debugging or watching the system breathe.

## Tree-view-with-types (under the hood)

The dashboard is also the typed-tree-view layer. When you click "add a forum" in Settings, the dropdown is populated by querying the plugin registry — "what plugins fit the `ForumPlugin` slot?" Only valid candidates appear. When you fill the form, validation is per the plugin's own schema. Same applies to adding a peer to permissions, adding a focus topic, etc.

The whole tree has a composite zod schema. Every add / move / remove is validated against it. The dashboard prevents you from creating tree states that don't conform.

This is what makes the dashboard safe for free-form editing without breaking the agent's assumptions about the tree shape.

## Keyboard shortcuts

- `j` / `k` — next / previous item in lists
- `Enter` — open selected item
- `Esc` — close detail view
- `e` — edit (in inbox context)
- `a` — approve as-is (in inbox; triggers footer if applicable)
- `g` then `i / q / t / p / s` — go to Inbox / Queue / Tasks / People / Settings

## What it does NOT do

- It is not a forum browser. To read actual forum content, click the linked URL.
- It is not a secret manager. Secrets show only as `✓ configured` or `✗ not set`.
- It is not a Telegram client. Use Telegram for that.
- It does not work without agent-server running. The dashboard is a thin client.

## Mobile? Web?

The dashboard is Solid + Vite — works in any modern browser. You can run it on a phone browser if you bookmark `http://<your-laptop-ip>:5173` over local network. But for mobile, Telegram is generally smoother. The dashboard is meant for desktop.

A native wrapper (Tauri or Electron) is a future option if anyone cares enough to build it.

## Next

- [Settings panel details](settings.md) — (TODO when Phase 1 ships)
- [Getting started](getting-started.md)
- [Team collaboration](team-collaboration.md) — permissions, tasks, supergroup setup

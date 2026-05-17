# dashboard — what it does for you

The webview client you open on your laptop to see what your agent is doing. The Telegram bot is the mobile + team window; the dashboard is the desktop + power-tool window.

Connects to your local agent-server over websocket (default `ws://localhost:7710`). Subscribes to the tree using standard `usePath` treenity client hooks. No special protocol.

## What you see in it

- **Inbox** — every thread your agent has drafted but you haven't curated yet. Both drafts (Claude + local) side-by-side, with diff highlighting. Edit, pick, approve, abandon.
- **Queue** — scraped threads not yet drafted. Mostly informational.
- **Tasks** — open tasks across all categories (curate, peer-review, gate-approve, escalation).
- **People** — person cards from forum participants and team peers. What you know about them, threads they're in, expertise tags.
- **Permissions** — visual ACL editor (basic in v1; richer in v2).
- **Settings** — your `app.config.ts` — focus, voice samples, forum list, policy, retraining. Live editable. Secrets shown as one-way valves (set/update only; never read back).
- **Activity** — live oplog feed.

## Tree view = typed tree view

The dashboard is also the typed-tree-view layer. The tree's complete shape is described by a composite zod schema (built from each ProcessDef's own schema). When you click "add child" on a node, the menu only offers children that are valid at that path. When you edit a field, it's validated against the field's type. When you try to move a branch, the destination's schema must accept it.

This is what keeps the tree well-shaped under user edits. Without it, the tree is generic JSON and any mutation could violate node-shape expectations.

## Plugin discovery in the dashboard

Forum plugins (and any other plugin) live in a registry keyed by their schema domain. When the dashboard renders the "add a forum" menu, it queries the registry for "plugins that produce a `ForumPlugin` schema" and shows you those.

You install a new forum plugin (npm package) → restart agent-server → the plugin registers itself → next time you open the dashboard, it's in your dropdown.

## What it does NOT do

- Not a tree storage. State always lives on agent-server's tree.
- Not a permission engine. Calls into agent-server's permission resolver for every action.
- Not a secret manager. Secrets in env / keychain; dashboard never reads values, only updates.
- Not a forum browser. To read actual forum content, click the linked URL.

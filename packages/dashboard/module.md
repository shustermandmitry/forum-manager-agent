# dashboard

Webview client for the local peer's agent-server. Solid + Vite SPA. Connects to the agent-server websocket like sam-tool does.

This is one of two windows into the tree (Telegram is the other). The dashboard targets desktop / power-tool use cases — bulk actions, full inbox view, permission editing, Settings panel.

## Responsibility

- Connect to agent-server over websocket (default `ws://localhost:7710`).
- Subscribe to reactive queries (`digest`, `pendingDrafts`, `recentActivity`, etc.).
- Call mutations on user actions (approveDraft, addInstruction, setReviewMode).
- Render the views: Inbox, Queue, Tasks, People, Permissions, Settings.
- Show live oplog events in an activity feed.
- Handle reconnection on socket drop.

## Non-responsibilities

- Not a tree store of its own. State always lives on agent-server's tree.
- Not a Telegram client. Different surface, different package.
- Not an authoring tool for plugins / agents. Add-a-forum is `scraper-generator`'s job.
- Not a secret manager. Settings panel exposes secrets as one-way valves; actual values live in env/keychain (see design.md §14).

## Views (v1)

| View | Purpose |
|---|---|
| **Inbox** | Per-thread drafts side-by-side (Claude + local), curation actions |
| **Queue** | Scraped threads awaiting drafting |
| **Tasks** | Open tasks across all categories |
| **People** | Person cards from /people/ |
| **Permissions** | Visual ACL editor (basic; full design v2) |
| **Settings** | /config/ editing + secrets one-way-valves |
| **Activity** | Live oplog feed |

## Dependencies

| Package | Used for |
|---|---|
| `solid-js` | Reactive UI framework |
| `@solidjs/router` | Client-side routing between views |
| `vite` | Build + dev server |
| `vite-plugin-solid` | Solid JSX support |
| `@trpc/client` | Typed websocket calls to agent-server |
| `@samovar/runtime` | Optional — env factories, reactive composition |

## Structure

```
dashboard/
├─ module.md
├─ dashboard.abstract.md       ← user-facing module overview
├─ package.json
├─ index.html                  ← Vite entry
├─ vite.config.ts
└─ src/
   ├─ index.ts                 ← barrel
   ├─ types.ts                 ← DashboardOpts, FieldKind, NodeSchemaEntry, ...
   ├─ app.tsx                  ← root component
   ├─ treeClient.ts            ← websocket client + reactive subscriptions
   ├─ schemaRegistry.ts        ← TreeSchemaRegistry (typed-tree-view core)
   ├─ formRenderer.tsx         ← SchemaForm — generic schema-to-form
   ├─ treeNavigator.tsx        ← TreeNavigator — schema-aware add/move/remove
   ├─ views/                   ← per-view components (TBD when filling stubs)
   │  ├─ inbox.tsx, queue.tsx, tasks.tsx, people.tsx, permissions.tsx, settings.tsx
   └─ components/
      └─ draftDiff.tsx         ← Claude vs local side-by-side render
```

## Typed tree view (this is the headline primitive)

The `schemaRegistry` + `formRenderer` + `treeNavigator` trio is what makes the dashboard schema-aware. Every add/move/edit goes through the registry. Forms are auto-generated from zod schemas. The Settings view is a `TreeNavigator` rooted at `/config/`; the rest of the views are specialized layouts over the same primitives.

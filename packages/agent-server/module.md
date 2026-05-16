# agent-server

The always-on background process on one peer's machine. Hosts the treenity instance, mounts the `forumAgent` ProcessDef, exposes a websocket endpoint for clients (dashboard + bot).

This is the "brain" — everything else (telegram-bot, llm-bridge, scraper-generator, forum-plugins) plugs into this server.

## Responsibility

- Boot a treenity instance with sqlite persistence.
- Mount the `forumAgent` ProcessDef at the configured tree path.
- Resolve secret references at boot (read `*_ref` from `/config/`, look up actual secrets from env or keychain).
- Expose a websocket endpoint for in-process and cross-process clients (dashboard, telegram-bot).
- Orchestrate the outside-loop drafting pipeline (queue → both models in parallel → inbox).
- Schedule cron triggers (scrapers, retraining).
- Hold the agent's working state — every transition through the per-thread workflow lifecycle.
- Emit oplog events for every state change.

## Non-responsibilities

- Not a Telegram client (telegram-bot package handles that, in-process).
- Not an LLM (llm-bridge package handles subprocess management).
- Not a forum scraper (forum-plugins/* handle that).
- Not a UI (dashboard package handles the webview client).
- Not a config editor (Settings UI lives in dashboard).

## Public API

```typescript
// Boot the agent server. Returns a handle for graceful shutdown.
bootAgentServer({ configPath, port }: BootOptions): Promise<AgentServer>

// The ProcessDef. Mounted at `/forum-agent` by default.
forumAgent: ProcessDef<ForumAgentStore, ForumAgentSchema>
```

## Tree mount point

Default mount: `/forum-agent`. Children populated lazily as state grows.

```
/forum-agent/
├─ config/
├─ queue/<thread_id>
├─ inbox/<thread_id>/
├─ seen/<thread_id>
├─ training/<thread_id>/
├─ people/<forum_handle>/
├─ instructions/claude/<topic>.md
├─ permissions/
├─ tasks/<task_id>/
└─ chat/<session_id>/messages
```

See [../docs/design.md §5](../../docs/design.md) for the full data model.

## Dependencies

| Package | Used for |
|---|---|
| `@samovar/process-runtime` | ProcessDef + reactive store primitives |
| `@treenity/core` | Treenity host + mount + oplog |
| `@trpc/server` + `@trpc/server/adapters/ws` | Websocket endpoint for clients |
| `better-sqlite3` | Sqlite serialization of the tree |
| `@forum-manager-agent/llm-bridge` | Claude Code + local LLM subprocess drivers |
| `@forum-manager-agent/telegram-bot` | Telegram bot, runs in-process |
| `@forum-manager-agent/forum-plugins-*` | Scrapers, loaded per `/config/forums` |

## Boot sequence

1. Load workspace config from `samovar.config.ts` + per-peer `config.local.toml`.
2. Resolve secret refs (env in v1; keychain in v2).
3. Open sqlite-backed treenity instance.
4. Mount `forumAgent` at configured path.
5. Initialize llm-bridge subprocesses (Claude Code stays per-call; local LLM persistent socket).
6. Initialize telegram-bot binding.
7. Register forum-plugin scrapers.
8. Open websocket endpoint.
9. Schedule cron triggers per config.

## Structure

```
agent-server/
├─ module.md                 ← this file
├─ package.json
└─ src/
   ├─ index.ts               ← barrel
   ├─ bootAgentServer.ts     ← boot fn
   ├─ forumAgent.abstract.ts ← ProcessDef spec
   ├─ forumAgent.ts          ← ProcessDef impl
   └─ types.ts               ← BootOptions, AgentServer, etc.
```

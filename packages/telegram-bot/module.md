# telegram-bot

Telegram binding for one peer's agent. Runs in-process inside agent-server. Bot is the peer's own (their bot token, registered via @BotFather).

This package does NOT decide what to post — it renders whatever the agent's tree says and forwards user input back as mutations. State always lives on the tree, never in the bot.

## Responsibility

- Connect to Telegram Bot API (long-poll or webhook depending on deployment).
- **Render**: subscribe to forum-agent tree changes, push them to Telegram as topic messages / pinned dashboards / reactions.
- **Receive**: route incoming messages, replies, reactions, and slash commands to forum-agent mutations.
- **Topics**: create / close / archive forum-mode supergroup topics per the agent's per-thread workflow.
- **Permissions**: enforce owner permission rules before exposing any data to a non-owner peer.
- **Privacy**: never read or display secrets; surface only what the owner has authorized.

## Non-responsibilities

- Not a permission rule engine — calls into agent-server's permission resolver.
- Not a draft generator — agent decides what gets surfaced, when.
- Not a multi-bot router — each peer runs their own bot independently. Coexisting bots in the same supergroup do not coordinate.

## Public API

```typescript
// Boot the bot binding. Called from agent-server's resources.telegramBot.
bootTelegramBot(opts: TelegramBotOpts): Promise<TelegramBot>

interface TelegramBot {
  stop(): Promise<void>
}
```

## Supergroup topic model

The shared supergroup is forum-mode (topics enabled). Topics are managed by bots:

| Topic | Owner | Purpose |
|---|---|---|
| 📌 General | first bot to join | Live dashboard pinned message |
| 📋 Task Board | first bot | Open tasks across all peers |
| 🔍 Review Queue | first bot | Drafts pending peer review |
| 💬 \<forum> #\<id> | thread-owner's bot | Per-forum-thread team discussion |
| 🤖 Bot Status | each bot | Health, errors, retraining events |

A given bot only creates topics for threads its owner is the curator of. Other bots see those topics and can post comments per permission rules.

## Commands (slash + reactions)

| Command / Reaction | Acts on | Effect |
|---|---|---|
| `/approve <task>` | tasks/<id> | Mark gate-approve task complete |
| `/comment <task> <text>` | tasks/<id> | Append peer-review comment |
| `/edit <thread>` | inbox/<id> | Open inline edit (author role only) |
| `/escalate <thread>` | inbox/<id> | Force escalation — owner takes over |
| `/pause` | self | Owner-only — pause agent activity |
| `/resume` | self | Owner-only |
| 👍 reaction on draft | inbox/<id> | Soft-approve (peer-review mode) |
| ✏️ reaction on draft | inbox/<id> | Flag for edit |

## Dependencies

| Package | Used for |
|---|---|
| `grammy` | Telegram Bot API client (TS-first) |
| `@samovar/process-runtime` | Subscribe to tree changes, call mutations |

## Structure

```
telegram-bot/
├─ module.md
├─ package.json
└─ src/
   ├─ index.ts                   ← barrel
   ├─ telegramBot.abstract.ts    ← API + types
   ├─ bootTelegramBot.ts         ← boot fn
   ├─ renderer.ts                ← tree → telegram message stream
   ├─ commands.ts                ← incoming command dispatcher
   └─ topics.ts                  ← topic lifecycle (create/close/archive)
```

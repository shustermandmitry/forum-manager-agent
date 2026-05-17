# Getting started

A practical walk-through of installing forum-manager-agent on one machine, configuring it for your first forum, and seeing the dashboard come alive.

This guide assumes you're going **solo** (Phase 1 of the [roadmap](../roadmap.md)). Multi-peer with team collaboration is covered in [Team collaboration](team-collaboration.md).

> **Status today**: pre-implementation. This guide describes the intended experience. When Phase 1 ships, the steps below will be runnable.

## Prerequisites

- macOS (Apple Silicon — M1 or newer, 32 GB+ unified memory recommended)
- Node.js 20+ and pnpm 9
- A Claude Max subscription, with `claude` CLI installed and logged in
- Python + mlx-lm installed (`pip install mlx-lm`)
- A Telegram account (you'll register a bot)

Linux / Windows / smaller machines are not supported in Phase 1. Local model needs Apple Silicon mlx; without it, you'd be Claude-only, which defeats the point.

## Install

```bash
git clone https://github.com/shustermandmitry/forum-manager-agent.git
cd forum-manager-agent
pnpm install
```

## Configure

Two files:

**1. `.env` at repo root** (gitignored, you create from scratch — never commit):

```bash
# Telegram bot token from @BotFather (see Telegram setup below)
TELEGRAM_BOT_TOKEN=...

# Your Claude Code is logged in via `claude login`; no token needed here.
# Reddit needs no auth for read.
```

**2. `app.config.local.ts`** (optional overlay on `app.config.ts`):

```typescript
import baseConfig from './app.config'

export default {
  ...baseConfig,
  focus: {
    ...baseConfig.focus,
    prompt: 'Be helpful in DIY e-bike communities. Focus on thermal protection for cheap kits.',
    voiceSamples: [
      'Yeah I had the same issue on a BBSHD — controller MOSFETs at 90°C after 5 minutes of hill climb.',
      'check the casing temp with a $2 NTC, not a fancy probe — it works fine.',
    ],
  },
  forums: [
    {
      pluginName: '@forum-manager-agent/forum-plugins-reddit',
      forumId: 'reddit',
      enabled: true,
      props: {
        subreddits: ['ebikes', 'ebikebuilding', 'electric_vehicles'],
        maxPerCall: 25,
      },
      pollIntervalMinutes: 240, // every 4h
    },
  ],
  telegram: {
    token_ref: 'TELEGRAM_BOT_TOKEN',
  },
}
```

## Telegram bot setup

1. Open Telegram, chat with [@BotFather](https://t.me/botfather).
2. `/newbot` → pick a name + username for your bot.
3. Copy the token BotFather gives you into your `.env` as `TELEGRAM_BOT_TOKEN`.
4. (Optional for solo): you can use the bot in 1:1 chat for now. Supergroup setup is in [Team collaboration](team-collaboration.md).

## Start the local model

In one terminal:

```bash
mlx_lm.server --model mlx-community/Qwen2.5-32B-Instruct-4bit \
              --listen 127.0.0.1:8888
```

First boot takes ~30 seconds to load the model. Leave it running.

## Start the agent-server

In another terminal:

```bash
pnpm --filter @forum-manager-agent/agent-server dev
```

You should see:

```
[agent-server] Boot config: app.config.local.ts
[agent-server] Seeded /config/ tree branch
[agent-server] Claude Code: ready (via Max session)
[agent-server] Local model: connected to 127.0.0.1:8888
[agent-server] Telegram bot: @your_bot connected
[agent-server] Forum: reddit (3 subreddits) registered
[agent-server] Websocket listening on ws://localhost:7710
```

## Open the dashboard

In a third terminal:

```bash
pnpm --filter @forum-manager-agent/dashboard dev
```

Opens at `http://localhost:5173`. You'll see your empty Inbox. The Queue might still be empty (next scrape is in 4h). To force a scrape:

```bash
pnpm sam-tool exec /forum-agent/runScan '{"forum": "reddit"}'
```

In ~30 seconds, the Queue fills up. In another 2-5 minutes (per thread, both models drafting in parallel), the Inbox fills with side-by-side drafts.

## Your first curation

Open the Inbox. Pick a thread. You'll see:

| Column | What it is |
|---|---|
| Thread context | OP's post + key replies |
| Claude draft | Substantive, may sound a bit AI-flavored |
| Local draft | Shorter, more your voice (but base model still — no LoRA yet) |
| Edit box | Where you write the final |

Pick a starting point. Edit. Click "ready to post." The bot pings you in Telegram with the final text — you copy, switch to Reddit, paste, post.

## What just happened

You generated your first training-data row. `/training/<thread_id>` now has: `claude_draft`, `local_draft`, `userChoice`, `userFinal`, `editDistance`. Multiply this by 100-200 rows over a few weeks, and you have enough to train your first LoRA. (See [Your voice and the local model](your-voice-the-local-model.md).)

## Next

- [How it works](how-it-works.md) — what's happening under the hood
- [The dashboard](dashboard.md) — tour of each view
- [Disclosure policy](disclosure-policy.md) — what gets the AI footer and when

If something doesn't work, check `Bot Status` in your Telegram chat or `Activity` in the dashboard — both surface recent errors.

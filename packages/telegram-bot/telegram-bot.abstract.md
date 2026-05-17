# telegram-bot — what it does for you

Your Telegram bot. Yours specifically — registered under your account via @BotFather, with your bot token. Runs in-process inside agent-server.

Telegram is the mobile + team-collaboration window into your agent. The dashboard is the desktop window. Both look at the same tree; this package is one of two clients.

## Why per-peer bots

Each team member registers their own bot. Multiple bots coexist in a shared supergroup (Telegram allows this). Your bot only acts on your behalf. Alice's bot acts on hers.

This keeps each peer sovereign — there is no central bot anyone shares, no shared infrastructure to coordinate, no admin of a multi-tenant service.

## What it renders

- **General topic** in your team's supergroup: live dashboard pinned message (rewritten as state changes).
- **Per-thread topic**: when a thread is in peer-review or gated mode, a topic is created with both drafts side-by-side. Team comments live here.
- **Task Board topic**: open tasks across the team.
- **Review Queue topic**: drafts pending peer review.
- **Bot Status topic**: health, errors, retraining events.

## What you can do via Telegram

- Curate drafts (pick / edit / approve) by replying to your bot in private chat.
- Request peer review on a thread.
- Approve or comment on a peer's draft (via reactions or `/comment` command).
- Chat with your agent (private chat = a conversation; agent uses Claude under the hood).
- Pause / resume the agent (`/pause`, `/resume` — owner-only).

## What it does NOT do

- Doesn't store anything. State lives on the tree. Delete the supergroup, the bot rebuilds topics from your tree.
- Doesn't post to forums. That's still you, manually, copy-paste from your bot's output.
- Doesn't connect to other peers' bots directly. Each bot is its own world; "collaboration" happens because multiple bots are members of the same supergroup.

## Setup

1. Register a bot with [@BotFather](https://t.me/botfather), save the token in your `.env` (or keychain in v2) as `TELEGRAM_BOT_TOKEN`.
2. Create or get added to your team's shared supergroup. Make sure forum-mode (topics) is enabled.
3. Add your bot to the supergroup. Give it permission to manage topics.
4. Set `telegram.supergroupId` in your `app.config.local.ts` (a per-peer overlay).
5. Start agent-server. Your bot connects, creates / joins topics, you're online.

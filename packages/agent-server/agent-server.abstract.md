# agent-server — what it does for you

The always-on background process on your machine. Hosts the tree (your DB), runs the agent, talks to your two LLMs, exposes a websocket for the dashboard and the Telegram bot.

If forum-manager-agent is a stack, agent-server is the bottom — the foundation everything else plugs into.

## What it owns

- **Your tree** — every thread you've scraped, every draft, every edit, every person card, your training data, your config. Persisted to sqlite via treenity. Backed up by anything that backs up your files.
- **The agent loop** — when a new thread arrives, agent-server is what kicks off the dual drafting (Claude + your local model in parallel) and waits for your curation.
- **Schedules** — when scrapers should run, when to retrain your local model, when to garbage-collect old training data.
- **The websocket endpoint** — the dashboard and the Telegram bot both connect here. One source of truth.

## What it does NOT do

- It is not the UI. The dashboard is the UI. Telegram is the other UI.
- It is not a Telegram client. The `telegram-bot` package runs in-process here but is its own thing.
- It is not an LLM. The `llm-bridge` package wraps your two LLMs and runs in-process.
- It does not scrape forums itself. The `forum-plugins/*` packages do that; agent-server orchestrates them.

## How you interact with it

Mostly, you don't. It runs in the background. You interact with the dashboard (the webview) or with Telegram, and those reach agent-server over a websocket.

The one direct interaction: starting and stopping. Typically via a launcher script or as a `launchd` service on macOS. Future: a tray icon.

## How peers interact with it

They don't. Other peers in your team never touch your agent-server. They talk to YOUR Telegram bot (which talks to your agent-server). Your agent-server enforces your permissions before exposing anything.

## The mount point on the tree

By default, your forum activity lives at `/forum-agent/` on your local tree. The full subtree shape is in `docs/design.md` §5.

Your config lives at `/config/` (seeded from `app.config.ts` at boot).

# forum-manager-agent — user docs

Start here if you're using forum-manager-agent (or evaluating it). Engineering reference is at [design.md](design.md); roadmap at [roadmap.md](roadmap.md).

## Read these in order

1. **[Getting started](user/getting-started.md)** — install, configure, first scan
2. **[How it works](user/how-it-works.md)** — the dual-model + curation loop, in plain English
3. **[Your voice and the local model](user/your-voice-the-local-model.md)** — why there's a local model, how it learns you
4. **[The dashboard](user/dashboard.md)** — what each view does
5. **[Forum plugins](user/forum-plugins.md)** — adding forums, generating new ones
6. **[Disclosure policy](user/disclosure-policy.md)** — when AI is disclosed; the escalation contract
7. **[Team collaboration](user/team-collaboration.md)** — peer review, gated approval, roles, Telegram supergroup setup

## Per-package overviews

Each package has its own user-facing overview alongside its engineering `module.md`. Browse the package READMEs in `packages/`:

- [agent-server](../packages/agent-server/agent-server.abstract.md)
- [dashboard](../packages/dashboard/dashboard.abstract.md)
- [telegram-bot](../packages/telegram-bot/telegram-bot.abstract.md)
- [llm-bridge](../packages/llm-bridge/llm-bridge.abstract.md)
- [scraper-generator](../packages/scraper-generator/scraper-generator.abstract.md)
- [forum-plugins/reddit](../packages/forum-plugins/reddit/reddit.abstract.md)

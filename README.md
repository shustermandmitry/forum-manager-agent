# forum-manager-agent

> Peer-sovereign AI agent for grassroots community engagement on professional forums.

**Status**: Design locked 2026-05-16. Pre-implementation.

## What it is

A samovar/treenity app where each user runs their **own** instance — own agent, own local LLM, own Claude account, own data — and peers collaborate through Telegram (not through a shared central server).

Designed to help non-experts engage substantively in technical forum threads (endless-sphere, /r/ebikes, BAFANG, OSF Discord, etc.) by combining:

- **Claude Code** (via Max subscription) for technical substance
- **Local Qwen 2.5 32B + your LoRA** for shaping output into your authentic voice
- **Human curation** of every message until trust is earned for narrow auto-post classes
- **Telegram supergroups** as the team-collaboration fabric
- **Disclosure ethic** — only uncurated messages are marked as AI-generated; people always know whether they have your real attention

## See

- **[SPEC.md](SPEC.md) — start here if you're considering joining the team.** Describes functionalities and workflows; light on implementation.
- [docs/design.md](docs/design.md) — full engineering architecture
- [docs/roadmap.md](docs/roadmap.md) — phased build plan
- [LICENSE](LICENSE) — MIT

## Status

Phase 0 complete (scaffold + docs). Phase 1 (solo curator + Reddit + dual-model) begins after team feedback on [SPEC.md](SPEC.md).

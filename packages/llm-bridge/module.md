# llm-bridge

Subprocess management for the two LLMs the agent uses. Single `LLMClient` interface; two implementations under it.

This is the only package in the monorepo that knows how to talk to a language model. Everything else uses `LLMClient`.

## Responsibility

- Spawn `claude` CLI per call in headless mode (`claude --print`). Capture stdout. Map exit codes to errors.
- Maintain a long-running connection to `mlx_lm.server` on a unix socket. Reconnect on drop.
- Route calls based on `RouterConfig` (which model handles which call type).
- Format prompts per-model (Claude and Qwen need different system-prompt structures).
- Track per-call token counts + duration for observability.
- Surface rate-limit / capacity errors as typed errors the caller can react to.

## Non-responsibilities

- Not responsible for choosing WHICH LLM gets the call — that's the agent's `draftScheduler` worker. This package routes per the config it's handed.
- Not responsible for prompt engineering. Prompt templates come from `/config/focus` and `/instructions/claude/<topic>.md`. This package interpolates and submits.
- Not responsible for training. LoRA training is a separate pipeline (`packages/scraper-generator` does NOT do this either; LoRA training is out-of-tree, see roadmap Phase 3).
- Not responsible for managing the mlx model itself — that's mlx-lm's job. We just keep the socket open.

## Public API

```typescript
// One interface, two implementations.
interface LLMClient {
  rank(args: RankArgs): Promise<RankResult>
  draft(args: DraftArgs): Promise<DraftResult>
  voice(args: VoiceArgs): Promise<VoiceResult>   // local only — rewrite-in-voice
  chat(args: ChatArgs): Promise<ChatResult>      // for /chat conversations with the user
}

// Implementations
createClaudeCodeClient(opts: ClaudeCodeOpts): LLMClient
createLocalModelClient(opts: LocalModelOpts): LLMClient

// Router decides which client gets each call kind.
createLLMRouter(opts: { claude, local, config }): LLMClient
```

## Calls

| Call | Used by | Typically routed to |
|---|---|---|
| `rank(thread)` | draftScheduler | local (cheap; promotes once trusted) |
| `draft(thread, context)` | draftScheduler | both Claude AND local run in parallel — produces two drafts |
| `voice(claudeRaw, voiceSamples)` | two-stage technical pipeline | local only |
| `chat(message, history)` | /chat with user | Claude unless owner opts otherwise |

## Dependencies

| Package | Used for |
|---|---|
| `execa` | Spawn `claude` subprocess with structured stdio |
| (native `fetch`) | HTTP client for mlx_lm.server's OpenAI-compatible endpoint |
| `zod` | Schema validation of model JSON outputs (planned, not yet wired) |

## Subprocess wrangling

**Claude Code:**
- Spawned per call, not kept open. Cold start ~300ms is fine for our cadence.
- Auth comes from user's Max session (already on disk via `claude login`).
- MCP servers can be attached via `--mcp-config` flag for tool-use mode (Phase 3+).

**Local model (mlx-lm):**
- Long-running `mlx_lm.server` started independently (you run it; agent-server doesn't manage its lifecycle).
- Exposes an OpenAI-API-compatible HTTP endpoint (`/v1/chat/completions`).
- llm-bridge POSTs to it per call. Uses `fetch` + `AbortSignal.timeout()` for timeouts.
- `baseUrl` config supports localhost (single-machine) or LAN IP (split-host: agent on M1 Air, model on M1 Pro).
- Model + LoRA loaded once at server start (~30s for Qwen 14B q4). Server reuse across many requests.

## Structure

```
llm-bridge/
├─ module.md
├─ llm-bridge.abstract.md     ← user-facing module overview
├─ package.json
└─ src/
   ├─ index.ts                ← barrel
   ├─ types.ts                ← LLMClient interface + ProcessDef store/opts types
   ├─ parseRank.ts            ← shared rank-output parser
   ├─ claudeCode.ts           ← Claude Code subprocess driver (library)
   ├─ localModel.ts           ← mlx_lm.server HTTP client (library)
   ├─ router.ts               ← per-call routing (library)
   └─ llmBridgeProcess.ts     ← ProcessDef wrapper (mounted by agent-server)
```

## Two consumer modes

- **Library**: tests import `createClaudeCodeClient`/`createLocalModelClient`/`createLLMRouter` directly for unit testing the subprocess drivers.
- **ProcessDef**: agent-server mounts `createLLMBridgeProcess(opts)` at `/forum-agent/llm-bridge/` for in-app use. Other processes call it through the standard samovar mutation/query protocol.

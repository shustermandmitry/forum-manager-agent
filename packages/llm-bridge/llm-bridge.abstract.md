# llm-bridge — what it does for you

The bridge between your agent and the two language models you use: **Claude** (technical substance, accessed via your Claude Code Max subscription) and **your local model** (your voice, running on your own machine via mlx).

Every LLM call your agent makes goes through here. The agent itself doesn't know which model handled which call — it just gets a result back.

## Why two models?

| Model | Good at | Bad at | Cost |
|---|---|---|---|
| **Claude** (remote) | Technical depth, nuanced reasoning, broad knowledge | Sounding like you specifically; respecting your style | Subscription you already have |
| **Local Qwen + your LoRA** | Sounding like you; fast iteration on your voice | Technical depth, until you've trained it a lot | Electricity |

Used together: Claude provides substance, local shapes it into your voice. You edit. Both improve with use — Claude via accumulated prompt-instructions, local via LoRA retraining on your edits.

## What it does

- Spawns `claude --print` as a subprocess per call. Uses your Max session (no API key, no per-token bill).
- Maintains a long-running socket connection to `mlx_lm.server` running your local model. Reconnects if dropped.
- Routes each call to the right model based on a routing config (rank to local, draft to both, voice to local, chat to Claude — typical defaults).
- Surfaces rate-limit and subprocess errors as typed exceptions the agent can react to.

## What it does NOT do

- It doesn't decide WHEN to call an LLM. The agent decides. llm-bridge just answers calls.
- It doesn't engineer prompts. Prompts come from your config (focus, voice samples) + accumulated Claude instructions. llm-bridge interpolates and submits.
- It doesn't train. LoRA training is a separate pipeline run weekly. llm-bridge consumes a trained LoRA at load time.

## Slow is fine

Your local model takes ~5–15 seconds per draft on an M1 32GB Mac with quantized Qwen 32B. That's fine — drafting is not real-time. The agent surfaces drafts when ready; you review when you have a moment. If you're impatient, write it yourself.

## The "voice" call

The local model gets a special call: `voice(claudeRaw, voiceSamples)`. Takes Claude's substantive answer and rewrites it in your voice. This is the second stage of the technical pipeline — you'll see two drafts (claude_raw + local_voiced) in your inbox, plus the final you write.

Claude can't do voice well unless you flood the prompt with samples and instructions every time, which gets expensive in tokens and brittle. A small local LoRA trained on a few hundred of your edits does it cheaper and better.

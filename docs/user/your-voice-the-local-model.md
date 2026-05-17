# Your voice and the local model

The most distinctive thing about forum-manager-agent is that **a local language model on your machine learns your voice over time**, and starts doing more of the drafting work. This page explains what that means in practice.

## Why a local model at all

If we had only Claude:

- Claude is excellent at substance, weak at sounding like you specifically. Every post would need heavy editing to remove "leverage", "delve", "Furthermore,", etc.
- Each forum reply burns tokens, and you'd have to re-paste your voice samples and red-lines into every prompt.
- People reading your posts would gradually notice the AI fingerprint — even very subtle. Once they do, your reputation in that community is hard to recover.

A local model trained specifically on your edits doesn't have these problems:

- It writes how you write — same word choices, same hedging, same sentence rhythm.
- It runs on electricity, not subscriptions. Slow inference is fine; drafting isn't real-time.
- It evolves with you. If your style shifts, retraining catches up.

## The base model

The default is **Qwen 2.5 32B Instruct**, quantized to 4-bit so it fits in 32 GB unified memory on Apple Silicon. Other options work too (Llama 3.3, Mistral, smaller Qwens) but 32B q4 is the sweet spot for voice work — small enough to run on a laptop, big enough to be coherent.

Inference is slow — about 5-15 tokens per second. A draft takes 5-15 seconds. Fine, because drafting is asynchronous; you're not waiting in front of a screen.

## Day 1: no LoRA, base model only

On day 1, your local model has no LoRA. It's just Qwen 32B with whatever instruction-tuning the base model came with. Output will be:

- Coherent and on-topic
- Generic in voice — not yours, not anyone's specifically
- Probably noticeably worse than Claude's draft in quality

That's fine. **The side-by-side comparison from day 1 is how you collect training data.** Every interaction generates a row:

```
{
  claudeRaw: '...',          // Claude's draft
  localVoiced: '...',        // Local model's draft (mediocre at first)
  userFinal: '...',          // What you actually posted
  userChoice: 'claude' | 'local' | 'scratch',
  editDistance: 0.42,        // how much you changed
}
```

Hundreds of these rows are the corpus you train the first LoRA on.

## When the first LoRA gets trained

Default: **weekly**, when at least 50 new training rows have accumulated. Adjustable in `app.config.ts`:

```typescript
retraining: {
  cadence: 'weekly',
  minNewRows: 50,
}
```

Training runs overnight on your Mac via `mlx-examples` LoRA fine-tuning. Takes 1-2 hours for ~500 rows on 32B q4. You wake up to a new LoRA version. The next draft uses it.

## The shift over time

| Stage | Local model output | Your time per draft |
|---|---|---|
| Day 1 (no LoRA) | Generic, weaker than Claude | 5-10 min curation |
| Month 1 (~200 edits) | Recognizable voice, still rough on technical topics | 3-5 min curation |
| Month 3 (~600 edits) | Often better than Claude for routine threads in familiar areas | 1-3 min curation |
| Month 6+ (~1500 edits) | Solid for most threads; Claude is for novel technical | < 1 min on routine |

When local consistently beats Claude in a thread-class (e.g., "acknowledgment replies on r/ebikes" or "technical replies about MOSFETs"), the dashboard suggests authorizing that class for auto-post (Phase 3). When you authorize:

- That class skips human review (still gets the AI disclosure footer)
- You still see what went out in the morning digest
- Revoke any time if quality drifts

## "Authority shifts per class, not globally"

A subtle but important point: trust is **per thread-class**, not global. Your local model may be excellent at acknowledgment replies on r/ebikes and useless at deep BMS questions on endless-sphere. Authority for the first class doesn't mean authority for the second. Classes earn trust independently through their own win-rate tracking.

You never wake up to a Bad Post because your model improved at A and you accidentally trusted it for B.

## Training data is yours

Your `/training/` tree is on your machine. It does not sync to peers. It does not federate. It does not leave unless you export it explicitly.

This is by design:

- Your voice is yours. Two team members should not converge on a hybrid voice that's nobody's.
- Privacy: training data contains every draft you considered (including the ones you didn't post). Some of that is sensitive.
- Reversibility: if you want to start over with a fresh LoRA, you keep your raw training data — only the trained model is regenerable.

## What happens if you lose the training data

You lose everything LoRA-trainable for your voice. You go back to base model + accumulated `instructions/claude/`. You'd rebuild voice training from new edits, taking months.

**Back up your `~/WebstormProjects/forum-manager-agent/` folder regularly.** treenity sqlite is just a file. Time Machine, rsync, whatever you use — make sure it's in your routine.

## Cross-peer training data sharing — explicitly opt-in only

In Phase 3+, you can export a slice of your training data to a teammate (e.g., "@alice asks for my BMS replies because she's struggling with that topic"). It's always:

- A specific slice (filter by thread-class, by date, by tag)
- Explicit per-export, never automatic
- One-way (no live sync)
- Logged on both sides

There is no federated learning, no hidden cross-pollination, no "team voice" emerging from a shared model. Each peer's voice stays personal unless they opt in.

## Privacy summary

| Lives where | Synced where |
|---|---|
| Your training data | Your machine only. Never. (Explicit export only.) |
| Your trained LoRAs | Your machine only. Never. |
| `/instructions/claude/` files | Your machine. Synced never by default; exportable. |
| Your `/people/` notes about forum participants | Your machine. Synced never. |
| Voice config (`focus.voiceSamples`) | Your machine. |

The shared narrative — what's happening in team Telegram, who's working on what — is shared by design. The personal training corpus is not.

## Next

- [The dashboard](dashboard.md) — see your training stats + retraining schedule
- [How it works](how-it-works.md) — the broader curation loop

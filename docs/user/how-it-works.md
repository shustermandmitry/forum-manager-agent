# How it works

A non-technical tour of what happens between "a new forum thread appears" and "you post a reply." If you want engineering depth, read [docs/design.md](../design.md) — this is the same picture in plain English.

## The loop, in one paragraph

Every few hours, scrapers fetch new threads from your forums. Each interesting thread becomes a row in your Inbox, with **two drafts side-by-side** — one from Claude (technical depth), one from your local model (your voice). You review both, pick a starting point, edit, post. Your edit becomes training data for your local model, which gets better at your voice over time. Eventually your local model handles the routine cases on its own; Claude is the consult for hard ones.

That's it. Everything below is detail.

## Why two models

A single model gets you stuck in one corner:

- **Claude alone**: high quality, technically deep, but sounds like Claude. Even with extensive voice samples in the prompt, it drifts. Over time, forum readers notice. You can't afford that.
- **Local model alone**: sounds like you (after training), but technical depth is shallow. You'd be a fluent-sounding non-expert. Worse than not engaging.
- **Both, together**: Claude provides substance, local shapes it into your voice. You edit. Each model's weakness is the other's strength.

Both run from day 1 — even before your local model has any training data. That's intentional: the side-by-side comparison from day 1 IS how you collect the training data. You're not waiting for the local model to be "ready" — you start it bad and improve it through use.

## The dual pipeline for technical threads

For threads where you don't have full domain expertise:

```
Forum thread
    ↓
Claude generates substantive answer (claude_raw)
    ↓
Local model rewrites it in your voice (local_voiced)
    ↓
You read local_voiced — does it sound like you?
   ↓                       ↓
Yes → edit lightly        No → start over, write yourself with Claude assist
   ↓                       ↓
post                      post

(Either way, your final text + the drafts → training data)
```

A typical 4-minute interaction beats a 20-minute attempt to write something both substantive and voice-correct from scratch.

## The growing "instructions for Claude" library

When you find yourself thinking "Claude should have known this" — there's a button to append a note to `/instructions/claude/<topic>.md`. Next time Claude drafts on that topic, it sees your accumulated guidance.

Example growth path:

```
/instructions/claude/bms-questions.md:
- Always specify BMS chemistry (LiFePO4 vs NMC vs LTO) — different voltage windows
- Don't recommend Daly BMSes for builds > 1000W — they have known FET failures
- Mention isolation if discussing ground-referenced sensing
```

After a month, this file has 20 entries; Claude's first drafts on BMS questions need much less editing. This is the path to "training Claude" without an API fine-tune — you can't fine-tune the model, but you can iteratively engineer your prompt context.

## Why you (not the agent) post to forums

In v1, the agent never posts on your behalf. You copy from your bot's clipboard prompt, paste into Reddit / endless-sphere / wherever, hit submit. Why:

1. **Account safety** — forums ban accounts that smell like bots. If the agent posts and gets flagged, you lose your account and your reputation.
2. **Trust calibration** — until your local model has earned class-specific trust (Phase 3), every post deserves a final human look.
3. **Disclosure clarity** — you posting = your voice contributed (no footer). Agent posting = AI generated (footer required). The ethics are simpler when the human is the one hitting submit.

Phase 3+ allows auto-post for specific narrow message classes (e.g., "thanks-for-the-suggestion" acknowledgments), still with the AI disclosure footer. The handle is still yours, you still chose to authorize the class — the agent just handles the typing.

## What the dashboard and Telegram are for

Two windows into the same tree (your local DB):

- **Telegram** — mobile, fast, real-time. Notifications when a draft is ready. Curation via reply, react, edit. Team collaboration through shared supergroups.
- **Dashboard** — desktop, full-power. Bulk view of inbox, queue, tasks, people. Settings. Permission editor.

Both look at the same source of truth. Edit in either, the other updates live.

## What gets stored where

Everything lives on **one tree** persisted in sqlite (treenity handles serialization, you don't think about the DB).

| Tree path | What |
|---|---|
| `/forum-agent/queue/` | Scraped threads, not yet drafted |
| `/forum-agent/inbox/` | Drafted threads, awaiting your curation |
| `/forum-agent/seen/` | Dedupe cache |
| `/forum-agent/training/` | Your edit history — feeds future LoRA training |
| `/forum-agent/people/` | What you know about forum participants |
| `/forum-agent/instructions/claude/` | Your growing Claude prompt-augmentation library |
| `/forum-agent/tasks/` | Work items (curate, review, approve) |
| `/forum-agent/chat/` | Your conversation history with the agent |
| `/config/` | Your app config (seeded from `app.config.ts` at boot) |

Backup your repo folder and you've backed up all of this (training data is gold — don't lose it).

## What the agent ISN'T

- Not an autoposter. (Until v3, and even then, only narrow classes you authorize.)
- Not a marketing tool. The disclosure ethic and the human-curation default kill most marketing use cases by design.
- Not a hosted service. Each peer runs their own.
- Not anonymous. You post under your real forum handle.

## Next

- [Your voice and the local model](your-voice-the-local-model.md) — the LoRA part in depth
- [The dashboard](dashboard.md) — view-by-view tour
- [Disclosure policy](disclosure-policy.md) — the ethical boundary

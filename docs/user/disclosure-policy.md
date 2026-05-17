# Disclosure policy

When does a post you make carry an AI-generated footer, and when doesn't it? This page is the contract.

## The rule

**A footer is added if and only if no human contributed final language to the post.**

In practice:

| Situation | Footer? |
|---|---|
| You read the draft, edit any words, post | NO (your post; AI helped you draft) |
| You read the draft, approve as-is without edits, post | YES (AI-generated; you only validated) |
| You authorized a class for auto-post (Phase 3+) and the agent posted without your review | YES (AI-generated; you only authorized the class) |
| Your peer with `author` role edited your draft text, you posted | NO (their words contributed) |
| Your peer with `peer` role commented but didn't edit, you posted unchanged | YES (no one with edit authority changed final language) |
| You translated AI output across languages and posted | Open question — see below |
| You paraphrased AI output substantially | NO (your words; AI was inspiration only) |

This is the **no-human-edit** policy. It's the default; you can override in `app.config.ts` (`policy.disclosure: 'strict' | 'no-human-edit' | 'never'`), but doing so changes the ethical contract — be deliberate.

## The footer

Default template:

> _This reply was drafted by an AI assistant and posted without my review. Reply to me directly or DM @\<handle> for personal attention._

Customizable per peer in `/config/policy/disclosure_footer`. Your handle gets substituted automatically.

## The escalation contract

Any forum reply to a footer-disclosed post that contains your **escalation trigger phrase** (default: `@<your_handle> human please`) causes:

1. Your agent immediately stops auto-posting in that thread.
2. You get a Telegram notification with the thread context + the reply that triggered escalation.
3. The forum thread is marked "escalation-active" — every subsequent reply in that thread is surfaced for human review only.
4. You take over the conversation from there, under your same forum handle.

You can configure the trigger phrase. Make it natural in your voice — something a person would actually type. Suggestions:

- `@<handle> can you reply yourself`
- `actual human plz`
- `@<handle> need your actual take`

The point is to give people a clear, simple way to ask for your real attention. Don't make it cryptic.

## Why this specific rule

We considered three policies:

| Policy | Pros | Cons |
|---|---|---|
| **strict** — any AI involvement triggers footer, even when edited 80% | Most honest | High friction; punishes you for using AI tools at all |
| **no-human-edit** (chosen) | Disclose when no human contributed final language. Symmetric with how you'd treat Grammarly or autocomplete. | Requires a clear definition of "edit" |
| **never** — no disclosure ever | Friction-free | Deceives readers about AI involvement; betrays the project's intent |

`no-human-edit` is the middle ground that respects readers without paying the high-friction cost of `strict`. It treats AI like any other writing tool — fine to use, your words at the end.

## What counts as "edit"

Technically: any character-level difference between the draft you were shown and the text you submit. Even a comma change.

Practically: don't game this. If you read the draft, paused, didn't change a thing, and posted — that's "no edit", regardless of whether you also re-read it three times. The rule is about whose **words** went out, not whose **eyes** looked at them.

## Author-role peer edits

If a teammate with the `author` role edited your draft, their words contributed. No footer. You're the one posting under your handle, so you're still responsible — but the language is partly theirs, just like any collaborative writing.

A teammate with the `peer` role can comment and react but cannot edit your text. Their input shapes your decision, but didn't contribute final language. If you post unedited after a peer-review pass — footer.

This means **bumping a peer up to author role is a real escalation of trust.** They can rewrite anything you've drafted. Don't grant lightly.

## "Reply to me directly" vs "DM @\<handle>"

Both are offered in the footer. Pick whichever you actually monitor:

- **Reply** — works if you check the thread regularly (forum-level). Good for short threads.
- **DM** — works if the platform has DMs you check (Reddit chat, Telegram via handle, etc.). Good if you don't want to keep watching the thread.

Customize the footer to match your real attention channels.

## Multiple footers per post — what about reposts

If you copy text from one disclosed post to another forum, the footer stays. The new post is still "drafted by AI, posted without review." Don't strip it; that defeats the disclosure ethic.

If you paraphrase substantially across the move, the footer doesn't apply to the new post — but be honest about the paraphrase being you, not the original AI output.

## Edge cases worth thinking about

- **Translation** — does translating AI output into another language count as edit? Argue both ways. Default policy: if you wrote the translation, yes — your words. If you used another AI to translate, no.
- **Quotation** — quoting another forum post in your draft, then posting unchanged: still no-edit on YOUR words. Footer applies.
- **Code-blocks** — you didn't write the included `npm install ...` — but you decided to include it. Code blocks in disclosed posts are still part of an AI-drafted post. Footer applies.
- **Reactions and votes** — neither counts as a post in our model. No footers on upvotes or 👍 reactions.

Tell the team about edge cases as they come up. The policy evolves as we learn what feels right.

## Auditing

Your `/training/` tree records `userChoice` (claude | local | scratch) and `editDistance` (Levenshtein distance from chosen draft to final). For any past post you can verify: did this trigger footer, and was the correct decision made? Your bot logs every disclosure event to `/forum-agent/disclosures/` for audit.

## If you accidentally posted without disclosure

It happens. Edit the post on the forum to add the footer manually (if the platform allows edits). If it's old enough that an edit looks suspicious, post a follow-up reply admitting the missed disclosure. Better than letting it stand.

The community's trust in you is what's actually at stake — protect it.

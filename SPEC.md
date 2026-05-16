# forum-manager-agent — Specification

**Audience:** anyone considering joining the team or contributing.

**Purpose:** describes what the system does and how it feels to use it. Not how it's built — see [docs/design.md](docs/design.md) for engineering depth.

**Status:** design locked 2026-05-16. Pre-implementation. Reviewing this spec before Phase 1 build is the point.

---

## 1. Abstract

forum-manager-agent helps a small team engage substantively in technical online forums without sounding artificial, without faking expertise, and without deceiving anyone about who's typing.

Each team member runs their own instance on their own machine — their own AI, their own data, their own voice. Two language models work for each member side-by-side: a strong one (Claude) for technical substance, and a small local one trained continuously on the member's own edits, learning their authentic voice over time. Every message is human-curated by default. The team collaborates through a shared Telegram supergroup — there is no central server, no shared database, no one with admin rights over anyone else's setup.

When a message goes out without human review, it carries a disclosure footer. People always know whether they have your real attention.

The first use case is grassroots community engagement around the Smart E-Bike open-hardware project, on forums like /r/ebikes, endless-sphere, BAFANG aftermarket communities, and the OSF Discord.

---

## 2. The problem

A founder of a small open-hardware project wants to be present in the communities where their users live. Engaging well in those communities requires:

- **Technical depth** the founder may not yet have on every subtopic
- **An authentic voice** that doesn't sound like marketing copy or AI output
- **Time** — far more than one person has
- **A team** that's geographically scattered, has day jobs, and trusts each other

Existing options fail this:

- **Hire a community manager** — expensive, sound generic, lose technical credibility
- **Use Claude/ChatGPT manually to draft replies** — quality is good but voice is wrong; over time people notice; trust collapses
- **Hire a marketing agency** — they don't know your domain; their output is detectable; community gets hostile
- **Don't engage** — the project fades from the discourse

forum-manager-agent is the path that uses AI thoughtfully, with the human firmly in the loop, with disclosure when AI alone speaks, and with each team member's voice modeled and protected.

---

## 3. What the system does

### For each team member's instance:

1. **Watches the forums you've chosen** — pulls new threads from configured sources (Reddit, web forums, Discord, etc.) every few hours.
2. **Ranks threads** for engagement value based on your stated focus (e.g., "be helpful to e-bike DIY builders" or "promote our open-source thermal-protection adapter").
3. **Drafts two candidate replies** for each interesting thread — one from Claude (technical depth), one from your local model (your voice).
4. **Surfaces both drafts** to you in Telegram and in your dashboard, side-by-side.
5. **Captures your decisions** — which draft you picked, what you edited, what you wrote from scratch. Every edit becomes training data for your local model.
6. **Maintains a knowledge graph** of people, threads, and topics you've engaged with — so it remembers context next time you encounter the same person.
7. **Helps you coordinate with teammates** through a shared Telegram supergroup — request peer review, see what others are working on, comment on drafts.
8. **Enforces disclosure** — when you authorize a message to post without your review, it carries an AI-generated footer.

### For the team as a whole:

- A shared Telegram supergroup serves as the meeting room — a topic per active forum thread, a task board, a review queue.
- Each member's bot acts only for them. No central admin.
- Members can ask each other for peer review on specific threads.
- High-trust members can be designated as "authors" who can edit each other's drafts.
- Optional future: peers earn expertise weights on specific topics through review history.

---

## 4. Day in the life — workflows

### A. Solo curation (the everyday case)

> *Tuesday morning. Three notifications in Telegram from your bot.*

You tap the first. The bot shows:
- **Thread context** — title, OP, key snippets from the discussion
- **Claude's draft** — technically deep, addresses the OP's specific motor controller question
- **Your local model's draft** — shorter, conversational, sounds like you, but technically vaguer

You pick Claude's draft as the starting point. You edit it: change "leverage" to "use" (you never say "leverage"), add a personal anecdote about your own bench test, soften the recommendation.

You hit "ready to post." The bot puts the edited text in your clipboard. You switch to the forum, paste, post. **No AI footer** — you contributed final language, this is your post.

Your edits are saved to your local training data. Next week's LoRA retraining will pull your local model's voice slightly closer to yours.

Total time: 4 minutes for a high-quality, technically sound, authentically-voiced reply you couldn't have written from scratch in 20.

### B. Asking a teammate for review

> *Same day, harder thread. Someone on endless-sphere is asking a deep question about BMS topology — past your knowledge.*

You set the thread's review mode to **peer-review** and designate @alice (who's the team's strongest battery person).

Your bot posts a topic in the team's Telegram supergroup tagged "review-needed":

> 💬 ES #98765 — BMS balancing question
> Your draft (Claude+edited) attached. @alice — review when you have a sec?

Alice gets the notification from your bot in her Telegram. She opens the draft, reacts ✏️, replies with a correction: "The voltage threshold you cited is for LiFePO4 — OP has NMC, should be 4.15V not 3.55V."

You see her comment in your bot's notification. You fix the draft, post.

### C. Gated approval for high-stakes posts

> *You want to post a major release announcement for the Smart E-Bike kit.*

You set the thread to **gated** mode with `gate_peers: [@alice, @bob]`. The bot blocks posting until both approve.

Your bot posts the draft in the review queue topic. Alice and Bob review independently. Bob suggests an edit; you accept it. Both react 👍.

The bot unblocks the thread. You post.

### D. Auto-post for an earned class (Phase 3 future)

> *Six months in. Your local model has been trained on hundreds of your edits. It's now stable at writing your routine "thanks for the suggestion!" acknowledgments.*

You've authorized auto-post for the class `acknowledgment-replies-on-r-ebikes`. A new thread fits the class. Your local model drafts. Confidence is high. The bot posts on your behalf, **with the AI disclosure footer**.

The next morning the bot shows you what went out. You glance, see it's fine, move on. If you'd seen something wrong, you'd revoke the class.

---

## 5. Team governance

### Each peer is sovereign on their own node

- You install the app on your own machine.
- You connect your own AI accounts (Claude Max sub, your local model).
- You register your own Telegram bot.
- Your data lives on your machine — your drafts, your edits, your knowledge graph, your voice model.
- Nobody else has admin rights on your instance.

### Peers connect through Telegram, not databases

- One shared supergroup is the "office."
- Topics within the supergroup organize the work (per-thread topics, review queue, task board).
- Your bot only exposes what you've granted access to.

### Roles within the team

| Role     | What they can do                                                       |
|----------|------------------------------------------------------------------------|
| Guest    | Default. Can see public messages from your bot.                        |
| Viewer   | Sees what you publish in shared topics.                                |
| Peer     | Full team member. Can request reviews, comment on your drafts.         |
| Author   | Highest trust. Can edit your draft text (their words contribute, so disclosure handling adjusts accordingly). |

### Coordination, not control

There's no "team lead" with override authority by design. Conflicts are resolved by the affected peer making the call, with optional weighted input from designated reviewers. A scoring layer (Phase 4) will eventually let topic-expertise inform tie-breaking — but always as input to a human decision, never as override.

### Each member's voice is theirs

Local LoRA models train on your edits only. There is no federated learning across team members. If two of you sound different, that's correct. You can choose to export specific training data to a teammate if you want to — but it's always explicit, never default.

---

## 6. Ethics & disclosure

### Disclosure policy: no-human-edit triggers a footer

When **any** human language contribution went into the final post, no disclosure footer is added. The post is yours — same standard as anyone using grammar check or autocomplete.

When the **final text was generated by AI with zero human edits** (you approved-as-is), a footer appears:

> _This reply was drafted by an AI assistant and posted without my review. Reply to me directly or DM @\<handle> for personal attention._

This means: people you talk to always know whether they have your real attention. They can ask for it explicitly.

### Escalation: people can always reach the human

Any forum reply containing an agreed trigger phrase (default: `@<handle> human please`) halts the agent's activity in that thread and pings you. You take over from there, under your same forum handle.

### Privacy

- Your training data never leaves your machine without explicit export.
- Your voice model is yours alone.
- The forum participants you engage with are tracked in your personal knowledge graph (`/people/<handle>`); other team members can't see these notes unless you explicitly share.
- Secrets (API tokens, bot tokens, forum credentials) are stored in your OS keychain, never in the shared database.

### Authenticity guardrails

- **Don't fake expertise.** When you don't know something, the system should help you find out (Claude calls) and learn (record in /instructions/), not fabricate authority.
- **Don't manufacture consensus.** No multiple-account posting, no astroturfing, no fake-organic engagement.
- **Don't deceive about identity.** When AI speaks, it says so.

---

## 7. What this is NOT

- **Not a hosted SaaS.** Each peer runs their own instance.
- **Not a posting bot.** Until specific narrow message-classes have earned trust over time, every message has human review.
- **Not a marketing automation tool.** It is a team-collaboration tool with strong ethics around AI disclosure. Using it to mass-post promotional content would violate forum norms and the disclosure ethic.
- **Not anonymous.** You post under your own forum handle. Your bot acts on your behalf with your accountability.
- **Not free of work.** Especially early on, it adds to your work (you're curating + training the local model). The payoff compounds — your local model gets better, your time per message drops.
- **Not federated learning.** Your voice stays your voice. No cross-pollination of training data between team members.

---

## 8. What we're asking the team to review

Before we start building Phase 1, we'd like the team to push back on:

1. **The disclosure language** — does the proposed footer feel right? Should the trigger phrase be different?
2. **The escalation contract** — is "any post with the trigger phrase" enough, or should escalation be richer (e.g., reactions, DMs)?
3. **Workflow assumptions** — does "solo / peer-review / gated" cover real cases, or are there review modes missing?
4. **Forums to cover** — Phase 1 starts with Reddit. What forums matter most after that?
5. **Voice training cadence** — weekly retraining feels right; objections?
6. **Authority roles** — is the four-tier role model (guest/viewer/peer/author) enough for v1? What capabilities should differentiate?
7. **Ethical edge cases** — what scenarios aren't covered? Specifically:
   - Quoting or paraphrasing other forum posts: AI-assisted or not?
   - Translating posts across languages: counts as authorship or not?
   - DM responses from people who reached out via the escalation trigger: are those bot-assisted or always pure-human?

---

## 9. Status & next steps

**Done (Phase 0):**
- Repository scaffolded
- Design + roadmap + license written
- Memory entry persisted (so the design doesn't get lost across sessions)

**Next (Phase 1):**
- Per-package module specs (`module.md` + `.abstract.ts` stubs) for team review
- Then code, package by package, with the design + spec as fixed reference

**Building the first version requires:**
- One peer (initially: Dmitry)
- One forum (Reddit)
- Two models running (Claude Code + local Qwen 32B)
- Telegram bot + dashboard

**Multi-peer (Phase 2) is the second milestone**, once the solo workflow is proven.

---

## 10. Where to look next

- [README.md](README.md) — quick overview
- [docs/design.md](docs/design.md) — full engineering design
- [docs/roadmap.md](docs/roadmap.md) — phased build plan
- [LICENSE](LICENSE) — MIT

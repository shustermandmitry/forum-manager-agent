# Team collaboration

How a small team of peers — say, 2-5 people — works together without giving up sovereignty over their own data, voice, or schedule.

## The model

Each peer runs their own full installation. There is **no central server**, no shared database, no admin who can see everyone's data. Collaboration happens through Telegram supergroups — peers' bots all live there, talking to peers, with each bot enforcing its owner's permissions before exposing anything.

Think of it like a group of contractors who all happen to use Slack — they coordinate, they review each other's work, but each one's actual tools and files live on their own laptop.

## Setting up the team

### One supergroup, one topic-per-thing

A team uses one shared **forum-mode supergroup** (Telegram allows multiple topics within a supergroup). Topics auto-organize the work:

```
📌 General         — live dashboard pinned by the first bot to join
📋 Task Board      — open tasks across all peers
🔍 Review Queue    — drafts awaiting peer review
💬 r/ebikes #12345 — per-forum-thread topic, team discussion + draft
💬 ES #98765       — another forum thread
🤖 Bot Status      — health, errors, retraining events (one entry per peer's bot)
```

Each thread that goes into peer-review or gated mode gets its own topic. Topics close when the thread is posted or abandoned.

### Each peer brings their own bot

Each team member:

1. Registers their own bot with [@BotFather](https://t.me/botfather). Their token, their bot.
2. Adds their bot to the shared supergroup, gives it permission to manage topics.
3. Configures their own `app.config.local.ts` with the supergroup ID + their token reference.
4. Starts their agent-server. Their bot connects.

When done, the supergroup has N bots (one per peer). Multiple bots coexist in the same Telegram supergroup — Telegram handles this fine.

## Review modes per thread

When you draft a reply to a forum thread, you decide who else (if anyone) should see it before you post. Each thread carries a `reviewMode`:

| Mode | Behavior |
|---|---|
| **solo** | Default. You review, you post. No one else sees the draft. |
| **peer-review** | A topic opens in the supergroup. Designated peers (`reviewPeers`) get notified. They comment/react. Their input is advisory — you still decide. |
| **gated** | A topic opens. Designated approvers (`gatePeers`) must each give a 👍 or `/approve` before posting is unblocked. |

Setting review mode is a per-thread choice you make in your dashboard (or via Telegram command):

```
/review-mode <threadId> peer-review @alice
/review-mode <threadId> gated @alice,@bob
```

You can also set defaults per thread-class — e.g., "any thread on r/ebikes with motor-cooling tag → auto peer-review @alice."

## The four roles

When you grant a peer access to your tree (via your bot), you assign a role:

| Role | Can do |
|---|---|
| **guest** | Default for anyone reaching your bot. See public messages, nothing else. |
| **viewer** | See what you publish in shared topics. No comment privilege. |
| **peer** | Full team member. Can comment on your drafts when invited; see review queue. |
| **author** | Highest trust. Can **edit** your draft text directly. Their words contribute, so disclosure handling changes (see [Disclosure policy](disclosure-policy.md)). |

Roles are assigned per-peer in your `/config/permissions/peers/<peerId>`. Defaults: nobody is automatically `peer` — you elevate explicitly.

## Author role: when to grant it

Granting `author` is a real escalation. The peer can rewrite anything you've drafted. They could (intentionally or by accident) post text under your handle that you wouldn't have written yourself.

Reasonable cases:

- A teammate with deep expertise in a domain where you defer to them ("@bob is our battery person — let him sharpen technical drafts on BMS topics")
- A team lead who reviews high-stakes posts and may rewrite the closing paragraph

Not-reasonable cases:

- "Easier" reviewing — peer role + commenting is fine, doesn't require author
- "Trusted friend" — friendship isn't a content-credibility signal; assess by domain

**Author edits remove the AI disclosure footer** for the post, because human language contributed. This means an author edit changes your post's ethical status. Don't grant author casually.

## The tasking system

Every action that needs human attention is a **task**. Tasks are visible to the team in the Task Board topic and the dashboard.

Task types:

- **curate-draft** — a draft is waiting for the owner to review
- **peer-review** — a peer's input is requested on someone else's draft
- **gate-approve** — a peer must approve before posting (in `gated` mode)
- **handle-escalation** — a forum reply triggered escalation; owner needs to take the thread over manually
- **retrain-prompt** — accumulated `/instructions/claude/` updates warrant a model refresh (Phase 3+)

Tasks have status: `open | in-progress | completed | blocked`. They auto-assign on tree state transitions. The Task Board shows who's blocked on what.

## Working out disagreements

You and @alice disagree on the right reply for a thread. What happens:

- **Peer-review mode**: she comments her objection in the thread's topic. You read it, decide, post the version you think is right. Her comment is on the record.
- **Gated mode with her as gate**: you can't post until she approves. If she withholds approval, the post stays in inbox.
- **Author mode (her on your draft)**: she rewrites; you decide whether to keep her edit. You can revert and post anyway.

There is no automatic conflict resolution in v1. Disagreements get resolved by talking (or by the affected peer making the call). Phase 4+ adds optional expertise-weighted voting for thread-classes where multiple peers have logged history — but always as an input to a human decision, never as override.

## Privacy across peers

Your `/training/`, your `/instructions/claude/`, your `/people/` notes, your voice profile — **never** exposed, even to author-role peers. These are your private volume.

What IS exposed (to roles that have access):

- Drafts shared in review topics (visible to designated reviewers)
- The general activity stream in shared topics (visible to all members)
- Tasks (visible to assignees + visible to all in shared topics)
- Person cards' factual fields (handle, tags) if a peer has read access; the prose notes are yours

You explicitly control what gets shared by your permission rules. Default is private; you grant outward.

## Onboarding a new team member

Practical sequence:

1. Send them this repo's link + the [Getting started](getting-started.md) guide.
2. Once they have their own working install (own bot, own config), invite their bot to the team supergroup.
3. In your `app.config.local.ts`, add their Telegram user_id to `/permissions/peers/<id>` with role `peer`.
4. Welcome them in the General topic. Show them the Task Board.

Estimated onboarding time, once they have prerequisites installed: 1-2 hours.

## When to use peer-review vs gated vs solo

| Situation | Suggested mode |
|---|---|
| Routine reply on a familiar topic | solo |
| Technical thread outside your strong areas | peer-review (with the right expert peer) |
| High-stakes / public-facing announcement | gated (with 1-2 peers) |
| First post in a new community | peer-review (sanity check) |
| Reply when you're tired / not at full attention | peer-review (sanity check) |

Don't over-use gated mode. It blocks posting; it should be reserved for posts where the cost of being wrong is high (community announcements, controversial topics).

## Cross-peer escalation triggers

In addition to forum-reader escalation (covered in [Disclosure policy](disclosure-policy.md)), team members can escalate from inside Telegram:

```
/escalate <threadId>
```

This forces the thread into solo human-only mode. The agent stops drafting; you take over the thread manually. Use when a peer notices an active thread getting heated or politically charged and wants to make sure no AI-assisted reply goes out.

## Decay

If a team member stops participating, their bot eventually drops offline (no health pings to Bot Status). Their topics stay; their permissions persist; their absence doesn't break the team's operation. When they return, their bot reconnects and picks up where things left off.

If someone leaves the team permanently, you can revoke their role:

```
/permission-set <peerId> guest
```

That demotes them; if they reach your bot afterward, they see only public content.

## Next

- [Disclosure policy](disclosure-policy.md) — the disclosure rules in detail
- [The dashboard](dashboard.md) — Permissions view + Task Board
- [Getting started](getting-started.md) — solo setup before adding teammates

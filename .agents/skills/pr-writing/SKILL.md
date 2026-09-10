---
name: pr-writing
description: >
  Writing PR prose for the StarterKit repo: pull request descriptions, review comments,
  replies to reviewers. Use before posting any of those, and when asked to shorten,
  tighten or de-slop PR text. Adapted from the ai-dlc `mr-writing` skill.
---

# Writing PR prose

Reviewers **scan**. A sentence that carries no claim, no location and no decision costs them
time and gets the whole comment skimmed instead of read. Everything below serves the scan.

This is the house style for anything an agent posts to a GitHub PR on this repo. It says
nothing about *what* to review (that is `pr-review`) or *whether the branch is ready*
(that is `docs/standards/pr-readiness.md`). It governs the words.

## The three artifacts and their budgets

| Artifact | Budget | Opens with |
|---|---|---|
| Review comment | 60 prose words, gated | the severity label, then the defect in the first clause |
| Reply to a reviewer | 60 prose words, gated | the verdict: fixed in `<sha>`, or why you disagree |
| PR description | the template's sections, 120 prose words, gated | what changes for the reader |

Budgets are for the prose. A code block, a diff, a stack trace, the E2E attestation line, an
HTML comment and the template's checklists do not count against them, and never trim evidence
to hit a word count. Over budget with nothing to cut means the comment is really two comments:
split it.

All three are **gates, not advice**. `.claude/hooks/pr-prose-guard.mjs` strips the exempt
material, then denies a comment over 60 words and a description over 120, and denies a
line-anchored review comment that does not open with a severity label. The description cap sits
above its ~80-word target so a paragraph that runs a little long still posts; 30 words is the
target for a comment, not 60.

**Read `ARTIFACTS.md` for the artifact you are about to write.** It carries the shape, the
worked before/after, and the per-artifact contracts.

## The four rules that matter most

They are in priority order. Where two conflict, the earlier one wins.

### 1. Claim first

The finding is the lede. No setup, no restatement of the file's purpose, no "I noticed that
while reviewing".

Bad: "While reviewing the check-in reminder job, I looked at how the slot window is computed
and noticed something about the timezone handling that might be worth considering."
Good: "`CheckInReminderJob` computes the slot window in UTC but compares against a local
`DateTime`."

For a reply, the verdict is the lede. "Fixed in `a3719ba`." / "Disagree: `SlotOptions.cs:41`
already covers this." Then, at most, the reason.

### 2. Never narrate the diff

The reviewer has the diff open next to your words. Describing what the patch does line by line
is the single largest source of unreadable PR text. Write what is now true, why it is worth
having, and what you had to decide.

Bad: "This PR adds a `CheckInReminderSlotOptions` record, moves `JobIntervalMinutes` into it,
updates `CheckInReminderJob` to read from it, and adds four tests."
Good: "Reminder slots are configured rather than hardcoded, so a tenant on a different cadence
no longer needs a deploy."

Exception: where behaviour changed for someone else. A migration step, a breaking flag, a
default that flipped, a config key that is now required. That is not narration, it is the point.

The same rule applies to anything already written down elsewhere. **Never restate the
reviewer's finding, the CI output or your own commit message.** A reply that did what was asked
is a SHA, not a summary.

### 3. Plain English, short

Say it the way you would say it out loud to the reviewer. Ordinary word order, one idea per
sentence, short words. Notation instead of prose where notation is exact:
`CheckInReminderJob.cs:88`, `176/176`, `fixed in a3719ba`.

Bad: "It appears that the options object is not being validated before it is read, which could
cause a crash at runtime."
Good: "Nothing validates the options before they are read. A missing `SlotMinutes` throws at
the first tick."

Bad: "I have verified that the full test suite passes, with 176 tests passing and 0 failing."
Good: "Suite green, 176/176."

#### The six rules

Orwell's six, from *Politics and the English Language*, are the test for this rule. Run every
sentence past them before you post it.

| Rule | What it means in PR text |
|---|---|
| 1. No figure of speech you are used to seeing in print | No epigram, no antithesis, no "footgun", no "heavy lifting", no "can of worms". Name the mechanism instead |
| 2. No long word where a short one will do | "prior to" is "before", "in order to" is "to", "utilise" is "use", "surfaces an error" is "shows an error" |
| 3. If you can cut a word, cut it | Start with whole sentences: any one carrying no claim, no location and no fix. Rule 6 says where to stop |
| 4. Active, never passive | "The value is not validated" hides who should validate it. "Nothing validates the value" names the actor, and on a finding the actor is half the claim |
| 5. Everyday English over jargon | "orthogonal", "surface area" and "idempotency concerns" all have plainer equivalents. An identifier, a `file:line`, a test count and a framework term with one exact meaning are names, not jargon: keep `IgnoreQueryFilters` |
| 6. Break any of these sooner than say anything outright barbarous | Short is the goal, but a comment the reviewer reads twice is not short. It is expensive |

Orwell's rule 6 settles his rule 3, the one an agent overshoots. **Cut whole sentences, not the
grammar inside them.** Dropping a subject or a verb to fit the cap makes a comment shorter and
harder. Deleting a sentence that was carrying no claim makes it shorter and easier. Do the
second one.

Six habits break rules 1 and 3 while passing the word cap, so nothing catches them but you.

| Habit | Bad | Good |
|---|---|---|
| Epigram as a closer | "A job nobody can diagnose is nearly as expensive as one that never runs." | "The log line named the wrong tenant, so nobody could act on it." |
| Antithesis for rhythm | "It is unreachable, not merely untested." | "Nothing calls this branch, so no test can cover it." |
| Fronted or inverted clause | "Measured, it returns 401." | "I measured it. It returns 401." |
| Three clauses in one sentence | "Breaking in principle, a no-op in practice, taken in the only window where both hold." | "This breaks the config format. No tenant has set the key yet, so nothing breaks in practice." |
| Abstract noun doing the work | "That distinction changes what the guard buys." | "So the guard adds no safety. It makes the existing check automatic." |
| "rather than" as a tic | "Regenerated rather than hand-merged." | "I regenerated it instead of merging by hand." |

Read each sentence back before you post. If it sounds like a saying, write the plain fact
behind it instead.

### 4. One comment, one claim

A review comment carries one defect, one location, one suggested fix. Bundling three findings
into a paragraph means the author fixes the first and the thread resolves with two live. Post
three comments, each anchored to its own line.

## Strip these before posting

Check these first, in rough order of how often they show up in agent-written PR text:

1. **Significance puffing.** "comprehensive", "robust", "significant improvement", "critical
   fix", "greatly enhances". State the change; let the reader rate it.
2. **AI vocabulary.** "delve", "leverage", "utilize", "seamless", "streamline", "ensure that",
   "it is important to note", "crucially", "notably".
3. **Em dashes.** Zero `—` and zero `–` in posted PR text. Use a colon, a full stop, or a
   comma. (This repo's *docs* use em dashes freely; PR text does not.)
4. **Chatbot artifacts.** "Happy to discuss", "Let me know if you'd like me to expand", "Hope
   this helps", "Great question".
5. **Sycophancy.** "You're absolutely right", "Great catch", "Excellent point". A reviewer who
   was right does not need to be told.
6. **Filler and hedging.** "just", "simply", "basically", "actually", "it may be worth
   considering", "might potentially", "I think perhaps".
7. **Signposting.** "Here's what changed", "In this PR, we...", "To summarise". The heading
   already said it.
8. **Rule of three.** "faster, cleaner, and more maintainable". Pick the one that is true and
   say how you know.
9. **Diff narration.** Rule 2 above. The largest single source of unreadable PR text.
10. **Vague appeal to authority.** "best practices", "conventional wisdom", "it is generally
    recommended". Cite the repo's own rule (`docs/standards/<file>.md § <section>`), the
    framework's documented behaviour, or nothing.

11. **The compressed epigram.** Short, well formed, and still hard to read: the six habits in
    rule 3. This one fits inside the word cap, so the hook will never catch it for you.

### Not slop, leave them alone

Commit SHAs, `file:line` anchors, test counts, coverage numbers, tool output, the E2E
attestation line, the severity emoji in `ARTIFACTS.md`, and the template's own bolded field
names and checkboxes. Specificity is the opposite of slop. Short sentences are not a tell
either: rule 3 asks for one idea per sentence, which makes sentences short.

## When not to run this

A one-line comment is finished when it is written. "Typo: `recieve`." needs no pass.

## Before posting, check

Every sentence, not every paragraph:

1. Does the first sentence carry the lede?
2. Does it avoid saying what the diff already says?
3. Does it still make sense with the diff open next to it?
4. Any `—`, any `–`, any curly quote?
5. Within budget? If not, is it two comments? The hook denies the post either way.
6. Anything asserted but not verified? Numbers you did not run are worse than no numbers.
7. Any pattern left from the shortlist above?
8. Any sentence you had to read twice? Rewrite it in ordinary word order, or cut it. Passive
   where there is an actor to name, or a long word where a short one works? Rules 4 and 2.
9. Replying? Is any sentence already in the reviewer's comment, the CI output or the diff? Cut
   it. If everything goes, the SHA plus a one-line evidence note is the finished reply.

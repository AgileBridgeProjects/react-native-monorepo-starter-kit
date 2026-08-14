# Per-artifact shape

One section per artifact. Read the one you are writing.

## Review comment

Always **line-anchored**. A floating PR comment for a defect that lives on a line is a defect
the author has to go find. `pr-review` posts these through the batched review API; the shape
below is the `body` of a single entry in that batch.

```text
<severity> <the defect, first clause>. <where, if not obvious from the anchor>.
<the fix, concretely>. [<what you verified, if it is not obvious>]
```

Severity labels, exactly these three:

| Label | Means |
|---|---|
| 🔴 blocker | merging this ships a bug, a security hole or a broken contract |
| 🟡 nit | real but not merge-blocking: naming, a missed edge, a standards deviation |
| 💡 suggestion | optional. The author may decline without arguing |

Verify before you assert. A comment claiming a test fails should say which test and against
which commit.

Before (94 words):

> While reviewing the reminder module, I noticed something worth considering regarding the
> `BuildSlots` method. It appears that the method currently accepts any integer value for the
> `intervalMinutes` parameter, which means that the validation in `CheckInReminderSlotOptions`
> is effectively only enforced at configuration binding time. This could potentially lead to a
> situation where a caller passing zero would cause an infinite loop without any indication of
> an error. It might be worth considering adding some form of guard here.

After (32 words):

> 🔴 `BuildSlots` takes any int for `intervalMinutes`, so the options validation only runs at
> bind time. A caller passing `0` loops forever. Guard at the method, not just the binder.

## Reply to a reviewer

Verdict, then evidence, then nothing. Do not re-explain the reviewer's own finding back to them.

- Fixed: "Fixed in `<sha>`." Add one clause only if the fix differs from what was asked.
- Disagree: "Disagree: `<file>:<line>` already covers this because <reason>." Leave the thread
  open for the reviewer to close.
- Partially: say which part you did and which you did not, and why the remainder is a
  follow-up rather than a fix. Name the ticket.

**If you did exactly what was asked, the SHA is the entire reply.** They wrote the diagnosis;
they will read the diff. Explain only what the diff and the CI output do not already show: a
fix that differs from what was asked, or a limit you knowingly shipped.

Never re-post what the tooling reports. Per-job CI status and the list of findings are already
on the PR. `Suite 176/176, Repo CI green.` is the whole evidence line.

### Replying to a multi-finding review

A batch reply is still 3 sentences. Counts, not an enumeration.

- Fixed items: the count and one SHA. `Blocker fixed in 2df3431, plus 5 of 9 nits.`
- Declined items: **name** them so nothing looks silently dropped, and point at where the
  argument lives. A one-clause reason each turns 4 declines into a paragraph.
- Anything invisible in the diff and absent from the review: one sentence. Usually a known
  limit you chose to ship.

Before (61 words):

> Thanks so much for catching this! You're absolutely right that this is an important
> consideration. I've gone ahead and addressed this in commit a3719ba by adding a validation
> step. This should help ensure that the options are properly enforced going forward. Let me
> know if you'd like me to make any further adjustments to this approach!

After (34 words):

> Fixed in `a3719ba`. `BuildSlots` now throws `ArgumentOutOfRangeException` below 1 rather than
> clamping: a zero interval is a config error, and clamping would hide it behind a job that
> silently runs every minute.

## PR description

The shape is `.github/pull_request_template.md`. Fill every section; do not invent new ones and
do not delete the checklists.

| Section | What goes in it |
|---|---|
| **What** | One sentence. What is now true. |
| **Why** | The reason it is worth having, from the Linear ticket. Keep `Closes #` only if a real GitHub issue maps. |
| **How** | The approach and the decisions you had to make. 3 to 6 sentences, and only where the diff does not already say it. Skip entirely if obvious. |
| **E2E** | The attestation line from `npm run e2e:affected`, verbatim. Or the stated reason no specs were selected. Never both, never neither. |
| **Checklist** | Leave unchecked. The author ticks these. |
| **App Store Compliance** | Complete for any PR touching `apps/expo/`. Delete nothing; skip for backend-only PRs. |
| **Screenshots** | Leave the placeholder unless you have actual images. |

The prose budget covers What, Why and How together: about 80 words. Rationale, alternatives and
design detail go in the linked spec or ADR. A reviewer opening the PR wants to know what
changed and whether it is safe, and finds neither if both are buried in a wall.

Give the number rather than a sentence about the number: `176/176`, not "the full suite passes".
Anything not verified says so, explicitly, with what is missing.

Before, the **How** section:

> This PR introduces a comprehensive set of changes to the check-in reminder implementation. It
> adds a new `CheckInReminderSlotOptions` record that is capable of holding the interval
> configuration, updates `CheckInReminderJob` to leverage this new capability, and includes a
> robust suite of tests to ensure correctness. These changes represent a significant
> improvement in the reliability of our scheduling.

After, the whole description:

> ## What
>
> Check-in reminder slots are configured per tenant instead of hardcoded.
>
> ## Why
>
> Resolves [the identity split](https://linear.app/starterkit/issue/the identity split). Tenants on a non-hourly cadence
> needed a deploy to change their reminder window.
>
> ## How
>
> Delivery is dual-path: SignalR for connected clients, idle-gated push for everyone else, so a
> user with the app open does not get both. The broadcast loop is deliberately not bulked;
> `CheckInReminderJob.cs:112` carries the reason.
>
> ## E2E
>
> ```text
> e2e: sha=2df3431 result=passed specs=check-ins.spec.ts at=2026-08-06T09:12:04Z
> ```

The **How** carries the one thing a reader must act on, the dual-delivery decision, and points
at the code comment for the part that looks wrong but is not. Everything else is a field they
scan.

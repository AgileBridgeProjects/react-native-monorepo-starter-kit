# PR readiness — the standards sweep

The checks that must pass **before a PR is opened**, and that no script can prove.

`check:architecture`, `check:standards`, biome, `tsc` and the git hooks already block
everything mechanically expressible (see `enforcement.md`). This file is the other half:
judgement calls that were previously caught by a human in PR review, written down so an agent
performs them instead.

> **This is mandatory, not advisory.** Every workflow that opens a PR runs this sweep first:
> `.agents/commands/pr.md` (step 0).
> "The gates are green" is not readiness. Green gates plus this sweep is readiness.

---

## How to run it

Scope: **the branch diff against `dev`** — `git diff dev` (include uncommitted work). Judge
only what the branch touched; do not audit the whole repo.

For each section, either state it passes or fix it. If something is a deliberate exception,
say so **in a code comment at the site**, not only in the PR description — the next reader is
in the file, not the PR.

---

## 1. Shared before local

- Is any new constant, type, regex, or helper a **copy** of something that already exists?
  Search `packages/shared/src/lib/` and the sibling app before adding it.
- Does a new value **mirror a server-side value** (an allowlist, a size cap, a page size)? If
  so it belongs in `packages/shared` next to its siblings, with a comment naming the
  server-side source of truth — never in a feature folder.
- Does a new UI value **mirror a CSS utility** (a touch target, a breakpoint, a duration)? It
  needs one home that both sides read from.
- Is a JS constant duplicating a Tailwind class's value in a different syntax (`44` vs
  `h-11`)? They will drift. Link them.

> A comment saying "keep in step with X" is not a mechanism. If drift would be silent,
> either derive one from the other, or add a gate that compares them.

## 2. Comments describe the code as it is now

Comment rot caused real defects on this codebase, so this is not cosmetic.

- Does every comment you touched still describe what the code does **after** the change?
- Do any comments reference constructs the branch **deleted or renamed** (a guard, a flag, a
  hook, a file)?
- Does any comment claim a behaviour the code does not implement ("idempotent under every
  interleaving", "this cannot happen", "matches the backend")? Either prove it or soften it.
- Do test comments describe the mechanism the test actually relies on? A test can pass for a
  reason its comment gets wrong, which makes the next failure baffling.

## 3. Failures are visible and typed

- Does every `catch` either handle the error or surface it? A bare `catch {}` or a
  `catch { toast.error('generic') }` that discards a specific cause is a silent failure.
- Is every `void somePromise()` call safe — i.e. does the callee catch internally? A `void`
  on a rejecting promise swallows it entirely.
- Do datasources translate errors into typed `*Failure` classes with `localeKey`s, rather than
  letting `ApiError` or a raw `Error` reach a screen? (`raw-error-toast` catches the toast
  case; this catches the rest.)
- Where a check exists on one code path, does it exist on **all equivalent paths**? A guard on
  one of three pickers is worse than none, because it implies coverage that isn't there.

## 4. Optimistic and cached state

- For every optimistic cache write: walk the interleavings of mutate / success / error against
  a concurrent refetch or invalidation. Can the item be **lost**, **duplicated**, or land on
  the wrong page?
- Does the update keep sibling fields consistent (`totalCount` alongside `items`)? Paging
  arithmetic reads them together.
- Are optimistic ids collision-proof? `Date.now()` is not — it repeats within a millisecond
  and is not monotonic.

## 5. i18n and copy

- Every user-visible string via `useTranslation()`. No raw server or exception text, and no
  splicing untranslated text into a translated sentence.
- New keys added to `en-ZA` **and** registered in `src/lib/i18n/index.ts` / `i18n.d.ts`.
- Interpolated values are human-meaningful. A raw MIME type or status code in a sentence
  aimed at an athlete or parent is a leak, not a message.

## 6. Layout and tokens

- No hardcoded dimensions that assume a screen size. Check the smallest supported width
  (320pt) by arithmetic, not by eye.
- Inline `style={{}}` only for the documented exceptions in `frontend.md`, **with** the
  comment explaining why a class cannot do it.
- Values inside an inline style still come from tokens, not literals.

## 7. Accessibility

- New interactive elements: `accessibilityRole`, an `accessibilityLabel`, and a ≥44pt target.
- `accessibilityLabel` on a plain `View` announces nothing without `accessible`. Put the label
  on the touchable, or make the wrapper accessible.
- Anything decorative is hidden from the reader rather than left to be announced as noise.

## 8. Cross-surface blast radius

- Did you widen a **shared** option, type, or constant to satisfy one caller? Enumerate the
  other consumers and confirm the change is safe for each. (Shared upload options are the
  standing example: widening them for the chat composer also affected notification
  attachments, on a surface that could not render the new type.)
- Does a new content type / media kind actually **render** everywhere it can now be stored —
  mobile, web, and the admin portal?

## 9. Diagnostics removed

- No `console.log`, no `TEMP`/`DEBUG` markers, no `__DEV__`-only UI left behind.
- Grep the branch, don't rely on memory.

## 10. Verification actually ran

- Full test suites for every touched workspace, plus `tsc` and biome — and **quote the
  counts** in the PR body. "Tests pass" without numbers is not evidence.
- Anything claimed as verified on a device was verified on a device. If it wasn't, say so
  explicitly in the PR and keep it in draft.

---

## Output

Report per section: pass, or what was fixed. Then state plainly:

- what is **deferred**, and why (with a ticket if it is real work);
- what is **unverified**, and what would verify it.

A PR that hides either is worse than one that admits both.

---

## Then: writing it, and reviewing it

This sweep decides whether the branch is ready. Two skills cover what happens next, and both
are mandatory for agent-authored PR traffic.

| Skill / command | For |
|---|---|
| `.agents/skills/pr-writing/SKILL.md` | Every word posted to a PR: the description, review comments, replies to reviewers. Gated budgets, the claim-first rule, the plain-English rule and Orwell's six, the no-diff-narration rule, and the list of tics to strip. `ARTIFACTS.md` carries the per-artifact shape |
| `.agents/skills/pr-review/SKILL.md`, `/review-pr` | Reviewing a PR. Findings are **line-anchored** through the batched review API, never floating. Scope comes from `scripts/pr-review-diff.mjs`, which excludes tests, e2e, `src/proxy/**`, Markdown and generated artefacts before the diff reaches context |

`.claude/hooks/pr-prose-guard.mjs` puts the house style in front of the agent the first time a
session publishes each kind of PR prose, and hard-denies the rules that are decidable rather
than judgement calls:

| Denied | Why it is code and not prose |
|---|---|
| Em and en dashes, sycophancy, chatbot sign-offs | Literal string matches with no honest use in PR text |
| A comment or reply over **60 prose words** | A word budget in prose is unenforceable by construction: the model has no counter to hold itself to |
| A description over **120 prose words** | Same. The cap sits above the ~80-word target so a paragraph that runs a little long still posts |
| A line-anchored review comment that does not open with a severity label | The label rule was already written down and reviews went out unlabelled anyway. The nudge fires once per kind, so posts 2..n of a batch saw nothing |

Fenced code, HTML comments and the template's headings and checkboxes are stripped before
counting: evidence is exempt from every budget, and nothing here asks anyone to trim a stack
trace to hit a number. The gate reads the batched review payload out of its `--input` file, so
a review is judged comment by comment and every fault is reported in one denial. Everything
else in the skill is a judgement call, which is why it is a skill and not a regex.
`.claude/hooks/pr-prose-guard.test.mjs` covers the caps and runs in `npm run test:scripts`.

Both skills are adapted from the `mr-writing` skill in the ai-dlc project. The budgets, the
four rules and the artifact shapes are theirs; the template sections, the exclusion list and
the GitHub review API mechanics are this repo's.

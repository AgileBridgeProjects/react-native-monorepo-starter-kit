---
name: pr-review
description: >
  Review a StarterKit pull request and post the findings as line-anchored GitHub review
  comments. Use when asked to review a PR, review the current branch's diff, or when
  running the /review-pr command. Scope is filtered mechanically by
  scripts/pr-review-diff.mjs; prose follows the pr-writing skill.
---

# Reviewing a PR

Two hard rules, and the rest of this file serves them.

**Every finding is anchored to a line.** A floating comment for a defect that lives on a line
makes the author go find it, and there is no thread to resolve when they fix it. Findings go
through the batched review API with a `path` and a `line`. The only comments that may float are
the review's own one-line summary and a finding that is genuinely about the PR as a whole (a
missing migration, a contract with no consumer).

**Scope is decided by the script, not by judgement.** Run `scripts/pr-review-diff.mjs` first
and review exactly what it prints. Tests, e2e, the generated proxy, Markdown and generated
artefacts are excluded on purpose: each is governed by its own standard and its own gate, and
pulling them into context spends the budget that the reviewable code needs. Do not go read an
excluded file to "get context" — that is the exclusion failing open.

## 1. Scope

```bash
node scripts/pr-review-diff.mjs --pr <number>     # an open PR
node scripts/pr-review-diff.mjs --base origin/dev # the local branch
```

It prints the in-scope file list, a count of what it excluded and why, and the diff with every
line carrying an anchor: `R<n>` is the new-file line (`"side": "RIGHT"`), `L<n>` is the old-file
line (`"side": "LEFT"`). Those numbers are the only valid values for `line`. A `line` outside a
hunk is rejected by the API with a bare 422.

If it reports a truncation, either re-run with a higher `--max-lines` or say in the review that
you covered part of the diff and which part. Never let the cap pass silently as full coverage.

## 2. Read what has already been said

With `--pr`, the scope report ends in an **Already commented** section: every existing line
comment and PR-level comment, with its author and anchor.

Copilot reviews every PR on this repo, and humans review on top of it. A second reviewer that
re-reports what thread 3 already says wastes the author's time and teaches them to skim the
whole review. So:

- A finding already raised, in any thread, is not a finding. Skip it.
- A finding the author has already answered with a SHA or a reasoned decline is not a finding
  either, even if you disagree with the answer. Reply in that thread instead of opening a new
  one, and say what their answer missed.
- A materially different claim about the same line is fair. Say how it differs in the first
  clause: "Separate from the caching thread: this also ...".

If the section says the threads could not be read, treat every finding as possibly duplicate
and check the PR before posting.

## 3. What to look for

The scripted gates already ran (`docs/standards/enforcement.md`). Do not re-report what
`check:architecture`, biome, `tsc` or the test suite would have caught: that is noise, and it
teaches the author to skim your comments. Review what a script cannot express.

| Dimension | The question |
|---|---|
| Correctness | What input makes this wrong? Off-by-one, null path, empty collection, concurrent call, timezone, first run, retry |
| Contracts | Does the caller's assumption still hold? A widened enum, a nullable that became required, a default that flipped |
| Failure paths | Is the failure visible and typed? Swallowed exceptions, `catch {}`, an error that reaches the user as untranslated English (`frontend.md` § localization hard law) |
| Data access | Repositories in `StarterKit.Data` only, query filters and soft-delete honoured, no N+1 in a loop (`backend/repositories.md`, `backend/multitenancy.md`) |
| Altitude | Business logic in `StarterKit.Core`, controllers and MCP tools thin, one MCP tool class per controller (`backend/controllers.md`, `backend/mcp.md`) |
| Shared before local | Is this new helper already in `packages/shared`, or does it belong there? (`pr-readiness.md` § 1) |
| Comment accuracy | Does each touched comment still describe the code under it? (`pr-readiness.md` § 2) |
| Frontend layering | Screen → Hook → Datasource → Proxy. No datasource imported into a component, no raw `@lib/http` in a datasource |
| Tokens and i18n | No literal colours, no hardcoded user-facing strings (`frontend.md`) |
| Diagnostics | Leftover `console.log`, commented-out code, a TODO with no ticket |

Read the standards file before asserting a standards violation. Citing a rule that does not say
what you claimed is worse than saying nothing.

### What actually gets caught here

Counts from the 300 top-level review comments on StarterKit PRs 1 to 57. Every one of these is a
documented rule that agent-written code kept breaking anyway, which is exactly why they are
worth a targeted pass. Check the frontend list on any diff touching `apps/expo/` or
`apps/web/`: it is 253 of those 300 comments.

| Seen | Finding | Rule |
|---|---|---|
| 23 | **Inline JSX ternary for conditional rendering.** Hoist the branch to a `const` above the `return` and reference it | `frontend.md` § 366, `frontend-mobile.md` § 230 |
| 21 | **Hardcoded pixels instead of Tailwind sizing.** Includes arbitrary values like `bottom-[12%]` where a scale class exists | `frontend-mobile.md` § tokens |
| 19 | **Should be shared, not local.** A component, style block or helper that a second feature will want. Often paired with "and it should be feature-agnostic, and renamed" | `pr-readiness.md` § 1 |
| 13 | **A comment or doc that no longer describes the code.** Stale TODOs, doc comments contradicting the implementation, ERD rows naming the wrong column | `pr-readiness.md` § 2 |
| 8 | **Magic value that should be config or a constant.** "wildcard for 200 please", a 10MB limit inline, hour boundaries hardcoded in a job | `backend/patterns.md` § Options |
| 6 | **Inline `style` where a Tailwind class works** | `frontend-mobile.md` § 69 |
| 6 | **Component doing too much.** Split it into smaller reusable pieces | `frontend.md` |
| 6 | **UI rendered for a permission the user lacks.** The route guard redirects, so the control looks live and does nothing. Gate the control, not just the route | `nfr-security.md` |
| 5 | **Dead code shipped.** Unused export, orphaned variable, a branch nothing reaches | knip catches some, not all |
| 5 | **Timezone and clock.** `new Date('YYYY-MM-DD')` shifting by a day, a `utcNow` parameter that is not from `TimeProvider`/`clock.Now()` | `backend/jobs.md` |
| 5 | **Web-surface leftovers.** StarterKit ships iOS and Android. Web nav entries, `.web.tsx` mappings and web-only styling are scope, not polish | `docs/starterkit-brd.md` |
| 5 | **Accessible element with no label.** An image marked `accessible` with an optional label the caller did not pass | `nfr-accessibility.md` |
| 4 | **Naming drift after a rename.** Old terms surviving in variables and, worse, in React Query keys | |
| 3 | **Manual mapping where Mapperly belongs** | `backend/patterns.md` § Mapperly |
| 3 | **Vendor baked into a config name.** `SendGridOptions`, `RESEND_KEY`. Name the capability, not the supplier | |
| 2 | **Per-row loop where a bulk insert or update belongs** | `nfr-performance.md` |
| 2 | **Query key missing an argument it varies on**, or a hook omitting the `queryCacheConfig` spread its siblings use | `caching.md` |
| 2 | **Hardcoded hex instead of a design token.** Add the token if it is missing | `frontend.md` § design tokens |

Two patterns worth knowing about that the table cannot express:

- **A token added on one side only.** A new CSS custom property in `packages/shared/tokens.css`
  with no runtime counterpart in `tokens.ts` (or the reverse) is half a token: one surface
  silently falls back.
- **Guarded there, not here.** A validation the codebase already performs somewhere else and
  this path skips. `endDate < startDate` was accepted by season creation while the report
  service guarded it. Grep for the guard before assuming there is none.

This list is evidence, not a checklist to run top to bottom, and it is a snapshot: when a new
class of finding shows up twice, add it here. When one of these becomes mechanically
enforceable, it belongs in `check-architecture.mjs` instead and should come off this list.

## 4. Verify before you post

A finding you did not check is a guess, and a wrong blocker costs the author more than a missed
nit. For each candidate finding, before it goes in the payload:

1. Open the actual file, not just the hunk. The hunk hides the guard clause 20 lines up.
2. State the failure concretely: which input, which call order, which state. If you cannot, it
   is not a finding.
3. Check it is not already handled elsewhere: an options validator, a global exception handler,
   a query filter, a `[Authorize]` policy.
4. Drop anything you cannot defend. An empty review is a valid outcome and takes ten seconds to
   read.

## 5. Write the comments

**Read the `pr-writing` skill and its `ARTIFACTS.md` § Review comment before writing any of
them.** That is the house style and it is not optional: severity label, defect in the first
clause, the fix concretely, 4 sentences maximum, one claim per comment. No praise, no "overall
this looks good", no restating what the diff shows.

## 6. Post it

Build the payload as a file, then POST it. One API call, one review, one notification for the
author, instead of N comments arriving as N emails.

```json
{
  "event": "COMMENT",
  "body": "<one line: counts by severity, and any coverage gap>",
  "comments": [
    { "path": "apps/backend/src/StarterKit.Core/CheckIns/CheckInSlotResolver.cs", "line": 26, "side": "RIGHT", "body": "🔴 ..." },
    { "path": "apps/web/src/features/x/y.ts", "start_line": 40, "start_side": "RIGHT", "line": 44, "side": "RIGHT", "body": "🟡 ..." }
  ]
}
```

```bash
gh api repos/{owner}/{repo}/pulls/<number>/reviews \
  --method POST --input review.json
```

- `event` is **always** `COMMENT`. Never `APPROVE`, never `REQUEST_CHANGES`: approval is a
  human decision on this repo, and an agent-approved PR reads as a reviewed PR.
- `side: "RIGHT"` with an `R<n>` anchor for added and unchanged lines; `"LEFT"` with `L<n>` for
  a line the PR deleted.
- Multi-line: `start_line`/`start_side` plus `line`/`side`, both inside the same hunk, with
  `start_line` less than `line`.
- The summary `body` is one line. Counts and any coverage gap, nothing else. The findings are
  the review.

### When it 422s

The API does not say which comment failed. In order: the `line` is not in a hunk (re-read the
anchors from the script output), the `path` is not in the PR (check the exact string, including
case), `start_line` is greater than `line`, or the PR head moved since you ran the script.
Anchors are bound to a commit: if the author pushed while you were reviewing, re-run the script
and rebuild the payload.

## 7. Report back

The PR URL and the counts. Do not paste the findings into chat as well: they are on the PR, and
repeating them is the chat equivalent of narrating the diff.

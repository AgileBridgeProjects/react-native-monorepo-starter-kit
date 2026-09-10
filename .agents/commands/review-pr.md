# review-pr — Review a PR and post line-anchored comments

Review a GitHub pull request (or the current branch's diff) and post the findings as a single
batched GitHub review with every comment anchored to a line.

Argument: a PR number, a PR URL, or nothing. With nothing, review the current branch against
`origin/dev` and resolve the PR number with `gh pr view --json number`. If there is no open PR,
say so and print the findings in chat instead of posting.

## Instructions

Follow these steps **in order**. Do not ask for confirmation except where noted.

1. **Load the method.** Read `.agents/skills/pr-review/SKILL.md` in full. It carries the review
   dimensions, the verification bar and the API mechanics. Read
   `.agents/skills/pr-writing/SKILL.md` and its `ARTIFACTS.md` § Review comment before writing
   any comment prose.

2. **Scope the diff — mechanically.**

   ```bash
   node scripts/pr-review-diff.mjs --pr <number>
   ```

   Review exactly what it prints and nothing else. Tests, e2e, `src/proxy/**`, Markdown and
   generated artefacts are excluded by design. **Do not open an excluded file.** If you believe
   an exclusion is wrong for this PR, say so in the summary line rather than reading it anyway.

   If the output reports a truncation, re-run with a higher `--max-lines`. If the diff is
   genuinely too large for one pass, review it in named slices and say in the summary which
   slice this review covers.

3. **Read the existing threads.** The scope report's **Already commented** section lists every
   comment on the PR. Copilot reviews every PR here and humans review on top of it, so most of
   the obvious findings are already taken. Anything raised there is off your list before you
   start looking.

4. **Read the ticket.** Pull the Linear identifier from the branch name or the PR title and
   fetch the issue. A PR that does something other than what the ticket asked is the finding
   most worth catching, and the only one the diff cannot show you.

5. **Find candidates.** Work the dimension table in the skill against the in-scope diff, then
   the § What actually gets caught here table, which is the frequency-ranked list of what
   reviewers on this repo have actually had to say 300 times. Note the anchor (`R<n>` / `L<n>`)
   for each candidate as you go.

6. **Verify each candidate — blocking.** Two filters, both of them blocking:

   - **Not a duplicate.** Cross-check every candidate against the Already commented list. Same
     claim, same line, any author: drop it. Already answered with a SHA or a reasoned decline:
     drop it, or reply in that thread if the answer genuinely missed something.
   - **Not a guess.** Open the real file around the anchor, not just the hunk. Confirm the
     failure with a concrete input or call order. Confirm it is not already handled by a
     validator, an exception handler, a query filter or a policy.

   Drop anything that does not survive both. Posting an unverified blocker is worse than
   posting nothing.

7. **Write the comments** in the `pr-writing` house style: severity label as the first
   character, defect first, the fix concretely, one claim per comment. **60 prose words each,
   and 30 is the target.** Fenced code does not count, so a ```suggestion block is free.

   Plain English, not compressed grammar. Run every comment past Orwell's six rules, which
   `pr-writing` § rule 3 states in PR terms: no figure of speech you have seen in print, no
   long word where a short one will do, cut every word you can cut, active never passive,
   everyday English over jargon, and break any of those sooner than write something the author
   has to read twice.

   Rule 4 matters most in a review comment. "The tenant id is not checked" hides who should
   check it; "`OrderService` does not check the tenant id" names the actor, which is half the
   finding. Rule 6 settles rule 3: cut whole sentences, never the grammar inside them. No
   praise, no summary of the diff, no epigram as a closer. All six fit inside the word cap, so
   the hook will not catch them for you.

   `.claude/hooks/pr-prose-guard.mjs` denies the whole review payload if any comment runs over
   the cap or does not open with 🔴, 🟡 or 💡, and names the file:line that failed. It reads
   the `--input` file, so writing the payload does not get you past it.

8. **Build the payload** at `<scratch>/review.json`:

   ```json
   {
     "event": "COMMENT",
     "body": "<counts by severity, plus any coverage gap. One line, capped at 60 words like any other comment: the findings live on the lines they are about, not in here.>",
     "comments": [
       { "path": "<in-scope path>", "line": 26, "side": "RIGHT", "body": "🔴 ..." }
     ]
   }
   ```

   `event` is always `COMMENT`. Never `APPROVE` or `REQUEST_CHANGES`.

9. **Post it.**

   ```bash
   gh api repos/AgileBridgeProjects/react-native-monorepo-starter-kit/pulls/<number>/reviews --method POST --input <scratch>/review.json
   ```

   On a 422, work the causes listed in the skill § When it 422s. Re-run step 2 if the head SHA
   moved: anchors are bound to a commit.

10. **Report** the PR URL and the counts by severity. Nothing else — the findings live on the PR.

## Notes

- Zero findings is a valid review. Post the summary line saying so; do not manufacture nits.
- If `gh` is not authenticated, report it and print the findings in chat rather than dropping
  them.
- This command reviews. It does not fix. If the user wants the findings applied, that is a
  separate pass after they have read them.

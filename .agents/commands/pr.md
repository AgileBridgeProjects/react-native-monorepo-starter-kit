# pr — Create a PR

Create a GitHub pull request for the current branch with a generated description.

## Instructions

Follow these steps **in order** without asking for confirmation unless noted:

1. **Standards sweep — blocking.** Read `docs/standards/pr-readiness.md` and run every section
   of it against `git diff dev`. Fix what it turns up before going any further.

   This is not optional and not a formality. Green gates are necessary, not sufficient: the
   gates in `docs/standards/enforcement.md` catch what a script can express, and this sweep
   exists for what it cannot (is the shared thing actually shared, do the comments still
   describe the code, is the failure path visible, does the cache update survive a concurrent
   refetch). Skipping it is how these end up as PR comments.

   Then run the gates and **record the numbers** for step 3:

   ```bash
   npm run check:architecture && npm run check:standards && npm run check:locale-casing
   ```

   plus `tsc --noEmit`, biome, and the full test suite for every workspace the branch touches.

   If any of it fails, fix it and re-run. Do not open a PR on red.

2. Gather context to write the PR description:
   - Run `git log origin/dev..HEAD --oneline` to get the commit list
   - Run `git diff origin/dev --stat` to get a summary of changed files
   - Run `git diff origin/dev` to read the actual diff (for understanding what changed)
   - If the branch name or commits contain a ticket identifier (e.g. `ABC-123`) and Linear is available, fetch the issue with `mcp_linear_get_issue` to get the full ticket title, description, and acceptance criteria

3. Generate the PR title and body using the PR template structure from `.github/pull_request_template.md`.

   **Read `.agents/skills/pr-writing/SKILL.md` and its `ARTIFACTS.md` § PR description first.**
   The house style is not optional: claim first, never narrate the diff, ~80 words of prose
   across What/Why/How, and zero em dashes. `.claude/hooks/pr-prose-guard.mjs` denies the
   string-matchable rules at the `gh` call, so a body that ignores them will not post.

   **Title:** `[IDENTIFIER]: [ticket title]` — e.g. `ABC-123: Implement Audit Logging`. If no Linear ticket, derive from the branch name.

   **Body:** Fill in every section of the template:
   - **What** — one sentence summarising what the PR does, derived from the diff
   - **Why** — why the change is needed, based on the Linear ticket context (or commits if no ticket)
   - **How** — a concise explanation of the technical approach taken, based on the actual diff (key files changed, patterns used, notable decisions)
   - **Verification** — the actual numbers from step 1 (test counts per workspace, gates run).
     Never write "tests pass" without counts. State explicitly anything NOT verified on a
     device, and anything deferred (with its ticket).
   - **Checklist** — leave all checkboxes as-is (unchecked); the author completes these
   - **Screenshots / Screen recordings** — leave as the template comment placeholder
   - At the bottom, add `Closes #` only if a Linear issue number can be mapped to a GitHub issue; otherwise omit it

4. Write the generated body to a temp file (`/tmp/pr-body.txt`) to avoid shell escaping issues, then run:

   ```bash
   git push -u origin HEAD
   gh pr create --base dev --repo AgileBridgeProjects/react-native-monorepo-starter-kit --title "<title>" --body-file /tmp/pr-body.txt --draft
   ```

   - Push first so `gh` never needs to prompt about where to push.
   - Always pass `--draft`. PRs are created as drafts by default to save CI minutes; the author marks them ready when complete.
   - No `--web`. The PR is created directly — no browser, no prompts.

5. Reply with:
   - The PR URL (from the `gh` output)
   - The generated title

## Notes

- If `gh` is not authenticated or errors, report it clearly and stop.
- Keep the How section technical but concise — 3–6 sentences is ideal.
- Do not invent acceptance criteria or requirements not visible in the diff or ticket.

# resolve — Address and Resolve PR Review Comments

Systematically read, triage, fix, and dismiss all actionable review comments on the active PR.

---

## Input

Optional: a PR number (e.g. `resolve 123`). If omitted, uses the active PR on the current branch.

---

## Instructions

Follow these steps **in order** without asking for confirmation unless a comment is ambiguous.

### Step 1 — Load the PR

1. Call `github-pull-request_activePullRequest` **without** `refresh` first.
2. Check `lastUpdatedAt` — if it is less than 3 minutes ago, call the tool again with `refresh: true`.
3. Collect:
   - All `comments` where `commentState === "unresolved"` → these are inline thread comments.
   - All `timelineComments` where `commentType === "CHANGES_REQUESTED"` → these are review-level requests.
   - Ignore `timelineComments` with `commentType === "COMMENTED"` that are pure overview summaries (no specific code reference, no action requested).

### Step 2 — Triage comments

Classify each unresolved comment into one of three buckets:

| Bucket | Criteria | Action |
|---|---|---|
| **Fix** | Factual bug, incorrect behaviour, broken CI, missing requirement, clear standard violation | Implement the fix |
| **Acknowledge** | Valid suggestion but out of scope for this PR, stylistic preference with no objective basis, "nice to have" that doesn't affect correctness | Skip the code change; note it as out of scope |
| **Dismiss** | Already addressed by another change, duplicate, based on a misread of the code, or auto-generated noise with no actionable content | Skip with a brief explanation |

Write out the triage table before touching any files, so the reasoning is visible.

### Step 3 — Implement fixes

For each **Fix** comment:

1. Read the relevant file before editing.
2. Apply the minimal correct change — do not refactor unrelated code.
3. Enforce StarterKit standards:
   - Backend: dependency direction, CSharpier formatting, test coverage rules (`docs/standards/backend.md`)
   - Frontend: no hardcoded tokens, correct primitives, no cross-feature relative imports (`docs/standards/frontend.md`)
   - Architecture: no direction violations (`docs/standards/architecture.md`)
4. If a change makes no tests necessary (config/infra/docs), note that explicitly.
5. After all fixes, verify with build or lint as appropriate:
   - Backend `.cs` changes → `dotnet build apps/backend/StarterKit.slnx --no-restore` and `dotnet csharpier --check src/ tests/` (from `apps/backend/`)
   - Frontend changes → `npm run check` in the relevant workspace

### Step 4 — Commit and push

1. Stage only the files changed to address review comments: `git add <files>`
2. Commit with format:
   `fix(PR-NNN): address review comments`
   Body: bullet list of what each fix addressed.
3. Push: `git push`

The pre-commit hook will re-run proxy generation if any `.cs` files are staged — both APIs must be running (`localhost:5001` and `localhost:5002`) for this to succeed.

### Step 5 — Resolve threads on GitHub

After pushing, resolve every comment thread that was **Fixed** or **Dismissed** using the GitHub GraphQL API via `gh api graphql`.

First, load the PR data again to get the current thread IDs:

```bash
gh api graphql -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) {
          nodes { id isResolved comments(first:1) { nodes { body } } }
        }
      }
    }
  }
' -F owner=OWNER -F repo=REPO -F pr=PR_NUMBER
```

Then resolve each thread that corresponds to a Fixed or Dismissed comment:

```bash
gh api graphql -f query='
  mutation($threadId:ID!) {
    resolveReviewThread(input:{threadId:$threadId}) {
      thread { id isResolved }
    }
  }
' -F threadId=THREAD_ID
```

Match threads to comments by comparing the first comment `body` text against the comments addressed. Resolve only threads that were Fixed or Dismissed — leave **Acknowledged / out of scope** threads unresolved so reviewers can see they were intentionally deferred.

If the GraphQL query returns an error (e.g. actor lacks write access), note it in the report and skip — do not fail the whole workflow.

### Step 6 — Report

Reply with a structured summary:

**Fixed** (with code change):
- List each comment, the file, and a one-sentence description of the change made.

**Acknowledged / out of scope** (no code change):
- List each comment and why it was deferred.

**Dismissed** (noise or already resolved):
- List each comment and why.

---

## Rules

- NEVER skip a **Fix** comment without explanation.
- NEVER refactor code beyond what the comment asks for.
- If a comment requires understanding the broader codebase, use workspace search (`semantic_search`, `grep_search`) before editing.
- If two comments conflict, note the conflict and implement the more conservative fix.
- Do NOT open a new PR — fixes go on the existing branch.

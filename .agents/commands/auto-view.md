# auto-view — Mark Generated / Test Files as Viewed in a PR

Auto-mark files in a GitHub PR as "viewed" for any file that is auto-generated (proxy layer) or is a test file (unit or E2E). These are never manually reviewed, so bulk-viewing them clears the noise.

## Usage

```
auto-view <PR number>
```

## Instructions

Follow these steps **in order** without asking for confirmation:

### 1. Resolve the PR node ID and file list

Run a single GraphQL query to fetch both the pull request node ID and all changed file paths (paginate if the PR has more than 100 files):

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        id
        files(first: 100) {
          nodes { path }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
' -f owner=AgileBridgeProjects -f repo=StarterKit -F pr=<PR_NUMBER>
```

Capture the `pullRequest.id` (the GraphQL node ID, e.g. `PR_kwDOA...`) and the full list of file paths.

If `pageInfo.hasNextPage` is true, re-run the query with `files(first: 100, after: "<endCursor>")` until all paths are collected.

### 2. Classify files to auto-view

For each file path, mark it for auto-viewing if **any** of the following conditions is true:

| Category | Match rule |
|---|---|
| Proxy (Orval-generated) | Path contains `/src/proxy/` |
| OpenAPI schema snapshots | Path starts with `openapi/` and ends with `.json` |
| Web unit / integration tests | Path ends with `.test.ts` or `.spec.ts` |
| .NET unit / integration tests | Path ends with `.Tests.cs` or `Tests.cs` (case-insensitive) |
| E2E tests (Playwright) | Path starts with `e2e/` |
| E2E tests (Maestro) | Path starts with `e2e/maestro/` (covered by the rule above) |

### 3. Mark each matched file as viewed

For each matched path, call the `markFileAsViewed` GraphQL mutation:

```bash
gh api graphql -f query='
  mutation($prId: ID!, $path: String!) {
    markFileAsViewed(input: { pullRequestId: $prId, path: $path }) {
      pullRequest { id }
    }
  }
' -f prId=<NODE_ID> -f path=<FILE_PATH>
```

Run these sequentially (not in parallel) to avoid rate-limiting. If any call fails, note the path but continue with the rest.

### 4. Reply with a summary

After all mutations complete, reply with:

- **PR**: `#<number>` link
- **Auto-viewed** (`N` files): a grouped list by category (Proxy, OpenAPI schema, Unit tests, E2E tests)
- **Skipped** (any failures): list paths that errored, with the error message
- **Remaining unviewed**: count of files in the PR that were NOT auto-viewed (so the developer knows what still needs manual review)

## Notes

- Never mark hand-written source files, migrations, or configuration files as viewed — only the categories in step 2.
- If the PR number is not provided, ask the user for it before proceeding.
- The repo is always `AgileBridgeProjects/react-native-monorepo-starter-kit` unless the user specifies otherwise.

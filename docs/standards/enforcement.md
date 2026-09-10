# Enforcement & quality gates

How the standards in this folder are **mechanically enforced**. This file describes the
gate machinery only — the rules themselves live in the other `docs/standards/` files and
always win. Nothing here duplicates a rule; it maps each gate to where it runs.

Semantic correctness, authorization intent, accessibility usability and product-scope
coverage cannot be proven by a script and remain review responsibilities.

**Two halves, and both are mandatory.** A rule that can be expressed as a script belongs in
one of the gates below — never in a reviewer's head, and never in a checklist a human is
trusted to remember. What genuinely cannot be scripted (is this shared thing actually shared?
does this comment still describe the code? is this abstraction the right one?) belongs to the
**standards sweep** in `pr-readiness.md`, which every agent workflow runs before opening a PR.

When a reviewer finds the same class of problem twice, that is a signal the gate is missing:
add the rule to `check-architecture.mjs` (with a baseline entry for existing violations) so it
is never found by a human a third time.

---

## Local gates

Two git hooks (husky). Both can be bypassed with `--no-verify`; **CI is the backstop, and
that is the design** — see § CI gates. `--no-verify` cannot be blocked on a developer's
machine by any mechanism, so every hook gate is repeated server-side where it blocks the
merge instead of the push. A gate added to a hook but not to `ci.yml` is a bypassable
gate; `check:standards` asserts both halves stay wired.

### `pre-commit` — fast, runs on every commit

Kept under ~10s: no Docker, no network. Order:

| Step | What |
|---|---|
| `lint-staged` | Biome format+lint on staged JS/TS/JSON; csharpier on staged `.cs`; markdownlint on staged `.md`; secretlint on staged files |
| `check:locale-casing` | locale JSON values stay sentence-case |
| `check:architecture` | layering / dependency boundaries (see below) |
| proxy-drift reminder | non-blocking note if backend `.cs` is staged |

### `pre-push` — heavier, runs before push

| Step | What |
|---|---|
| `typecheck` | `tsc --noEmit` across all workspaces |
| `check:secrets` | secretlint over the branch's changed files (`--all` scans everything) |
| `knip` | dead code / unused dependencies (blocking) |
| `check:standards` | repo-config invariants (see below) |
| `check-e2e-receipt` | if the push touches spec-covered code, require a passing local E2E run (`e2e-testing.md` § The pre-push receipt gate) |
| `mobile-version check --if-mobile` | if the push touches the mobile scope, require the production and runtime bumps it owes in `apps/expo/version.json` (`ota-updates.md` § Versioning). A no-op for backend-, web- and docs-only branches |

A tag push skips this whole suite, but only when the commits it publishes are already on a
remote branch where they passed — `scripts/pre-push-tag-skip.mjs` decides, and is unit-tested.
Skipping unconditionally would let `git tag t <local-commit>` publish ungated code, since no
workflow triggers on tags.

### `commit-msg`

Conventional Commits enforced via commitlint (`feat`, `fix`, `chore`, `docs`, …).

---

## Agent hooks

Development here is agentic, so the git hooks are no longer the earliest gate — an agent
writes dozens of files between commits. `.claude/hooks/` moves the cheap half of the
checks to the moment of the edit, where feedback is still free: the agent is mid-task, the
context is loaded, and a diagnostic it reads now costs nothing to act on.

They are **ergonomics, not enforcement**. Every rule below is already enforced by a hook,
a CI job or a documented standard; nothing depends on them running, and Claude Code is the
only thing that executes them. What they buy is that the agent stops producing the problem
instead of discovering it at commit time. `check:standards` asserts each one stays wired
into `.claude/settings.json`, because an unwired hook fails nothing — it just stops
running, silently.

| Hook | Event | What |
|---|---|---|
| `lint-on-edit.mjs` | `PostToolUse` on `Write`/`Edit`/`MultiEdit` | Formats and lints the one file just written — biome for JS/TS/JSON, csharpier for `.cs`, markdownlint for `.md`, `check:locale-casing` when a locale JSON is touched. Fixes what it can; reports the rest on exit 2 so the agent corrects it in the same turn |
| `guard-write.mjs` | `PreToolUse` on write tools | Denies edits to generated or locked files — `src/proxy/**` (Orval), `package-lock.json`, EF `Migrations/*.Designer.cs` and `*ModelSnapshot.cs`, real `.env` files — and names the generator to run instead |
| `guard-bash.mjs` | `PreToolUse` on `Bash` | Denies `pnpm`/`yarn`/`bun` (npm-only), `git commit\|push --no-verify`, and `dotnet format` (csharpier is the formatter) |
| `pr-readiness-nudge.mjs` | `PreToolUse` on `Bash` | On a PR-creating command, injects the standards sweep (`pr-readiness.md`) and the E2E attestation requirement. Never blocks; fires once per session |
| `pr-prose-guard.mjs` | `PreToolUse` on `Bash` | On any command publishing prose to a PR, injects the `pr-writing` contract for that artifact kind (description, review comment, reply — once each per session) and denies what is decidable: em/en dashes, sycophancy, chatbot sign-offs, a comment over 60 prose words, a description over 120, and a line-anchored review comment that does not open with 🔴, 🟡 or 💡. Read-only `gh` never fires |

The prose guard reads the body out of `--body`, `--title`, `--body-file`, `--input` and gh's
`-f`/`-F`/`--field` forms in both quote placements. Two lessons are baked into it, both learned
by watching it fail: a pattern anchored on a bare `-F body=@` misses the `-F "body=@file"`
spelling that `gh` users actually write, and a single once-per-session nudge spent on
`gh pr create` leaves every later thread reply ungoverned. Extraction is best-effort by
design — a body assembled through command substitution is invisible to it — so a miss always
means *allow*, never *block*.

Each hook fails open — a hook that cannot parse its own input must never wedge a session —
and each is single-file scoped, so the whole `lint-on-edit` pass is a few hundred
milliseconds. It resolves binaries from `node_modules/.bin` rather than `npx`, which is
worth roughly a second per edit.

`lint-on-edit` runs **synchronously**, deliberately. Every formatter it invokes rewrites
the file; a detached writer racing the agent's next read produces "file modified since
read" failures and silently clobbered edits. Per-file scope is what keeps it cheap enough
not to need backgrounding.

Disable with `SK_HOOK_LINT=0`, `SK_HOOK_GUARD=0`, `SK_HOOK_NUDGE=0`.

### These do not replace husky

Three layers, and removing any one of them opens a hole the others do not cover:

| Layer | Runs for | Can be bypassed by |
|---|---|---|
| Agent hooks | Claude Code only | using any other tool, or another agent |
| husky | every local commit and push, whoever made it | `--no-verify` |
| CI | every push and PR, server-side | nothing |

The agent hooks catch the most, earliest, for the narrowest audience. husky is the only gate
that sees a commit made by a human in an editor, by Copilot, by Codex, or by `git` in a
terminal, and it is what `check:standards` and `ci.yml` are wired to assert. CI is the only one
that cannot be skipped.

So: agent hooks are an accelerator on top of husky, never a replacement for it. Delete husky
and every non-Claude contributor loses their gates entirely, `check:standards` § 6 starts
failing, and CI becomes the first place anyone learns the branch is broken. The same logic runs
the other way: never put a rule *only* in an agent hook if it matters to the repo. Put it in
husky and `ci.yml`, and let the agent hook be the fast copy that catches it first.

---

## CI gates

| Workflow | Trigger | What |
|---|---|---|
| `ci.yml` | push/PR on `main`,`dev`,`uat` | **the hook mirror** — lint, locale casing, architecture, markdown, typecheck, secrets, knip, standards, unit tests |
| `ci-backend.yml` / `ci-web.yml` / `ci-expo.yml` | per-app paths | build + app-specific checks |
| `e2e-attestation.yml` | PR into `dev` | verifies the pasted E2E attestation line binds to the PR head SHA — **runs no tests** |
| `e2e-post-merge.yml` | push to `dev` | affected specs only; failures open a Linear ticket assigned to the merge author |
| `e2e.yml` | weekly sweep, PR into `uat`, manual | the full E2E suites (see `e2e-testing.md`) |

Every workflow above reports through a single always-running `gate` job (`Repo CI`,
`Web CI`, …). A required status check that can be *skipped* blocks a PR forever, so the
gate job runs unconditionally and passes when its dependencies succeeded or were skipped.
Add new required checks the same way.

Every hook gate is mirrored above; `check:standards` asserts the mirror stays intact.

> `check:markdown` scopes itself by *ignore list*, not by a file allow-list.
> `markdownlint` skips the agent-tooling trees (`.claude/skills`, `.claude/commands`,
> `.agents/skills`, `.agents/commands`, `.github/prompts`) because they are mirrored
> across three locations and partly installed from upstream (`skills-lock.json`), so
> local edits get overwritten. It also skips `.claude/worktrees/**` and generated
> `test-results/` — without those the `**/*.md` glob re-lints the whole repo once per git
> worktree. 88 of 562 tracked `.md` files are linted; all 55 under `docs/` are included.

### `check:e2e-attestation` (`scripts/check-e2e-attestation.mjs`)

E2E is deliberately **not** a required per-PR check — the suite is too expensive for that.
What is required instead is a verifiable claim that it was run locally. The gate costs
seconds: it maps the PR diff through `e2e/scripts/affected-specs.mjs`, and if any spec is
selected it requires an attestation line in the PR body whose SHA matches the PR head and
whose timestamp post-dates that commit.

The full rule set, the line format and the `skip-e2e` escape hatch live in
`e2e-testing.md` § Pre-push attestation — that file is the source of truth.

Run it locally against an open PR with:

```bash
node scripts/check-e2e-attestation.mjs --pr <number>
```

Its local counterpart is `check:e2e-receipt` (pre-push). Both read the same change → spec
mapping in `e2e/scripts/affected-specs.mjs`, so they cannot disagree about what a diff
needs to cover.

---

## `check:architecture` (`scripts/check-architecture.mjs`)

Static scan of the web, Expo and backend source trees. Complements `biome.json` (which
already blocks the datasource → raw-`@lib/http` edge) rather than repeating it.

| Rule | Enforces | Source of the rule |
|---|---|---|
| `router-shell` | web `app/**/page.tsx` stay thin routing shells — no state/effect hooks, no store imports | `architecture.md`, `frontend-web.md` |
| `proxy-access` | generated proxy **service** functions (`@/proxy/services/*`) are only called from `infrastructure/**` (datasources) or `src/lib/**`; proxy **models** (types/enums) are unrestricted | `frontend.md`, `frontend-web.md` |
| `cs-namespace` | C# uses file-scoped namespaces (generated `Migrations/**` excluded) | `backend/structure.md` |
| `cs-repo-location` | repository implementations live only in `StarterKit.Data` | `backend/repositories.md` |
| `csproj-ref` | `StarterKit.Data` references no other project; the APIs do not reference `StarterKit.Data` | `architecture.md`, `backend/structure.md` |
| `thin-controller` | API controllers hold no data access (no `DbContext`/EF Core/repository) — delegate to a `StarterKit.Core` service | `backend/controllers.md` |
| `thin-mcp-tool` | MCP tool classes hold no data access — same altitude as controllers | `backend/mcp.md` |
| `mcp-tool-parity` | every API controller has a sibling `Mcp/<X>McpTools.cs` (exemptions in `MCP_EXEMPT_CONTROLLERS`) | `backend/mcp.md` |
| `raw-color` | no literal hex / `rgb()` / `rgba()` in frontend source — colours come from the token system. Token files are exempt; brand-mandated logo marks are listed in `RAW_COLOR_EXEMPT` | `frontend.md` § design tokens |
| `jsx-ternary` | no inline JSX ternary — use `cond && <X />` when the false branch renders nothing, or hoist the choice into a variable above the JSX. Only ternaries whose *branches* are JSX are flagged; a prop-value ternary (`className={a ? 'x' : 'y'}`) is idiomatic and allowed | `frontend.md` § 366, `frontend-mobile.md` § 230 |
| `raw-error-toast` | no `error.message` piped into `toast.*()` / `notify()` — raw exception text is untranslated developer English. Map to a typed `*Failure` carrying a `localeKey` and resolve with `getErrorMessage()` | `frontend.md` § localization hard law |

The frontend rules scan `apps/web/src`, `apps/expo/app`, `apps/expo/src` and
`apps/expo/components`. **`packages/**` is not scanned** — 43 tracked `.ts`/`.tsx` files,
including the shared icon components, get none of these rules. That is a coverage gap, not a
decision.

## `check:standards` (`scripts/check-standards.mjs`)

Config-invariant assertions a linter can't express: the single-source-of-truth docs and
agent-instruction files exist; npm is the only package manager; `package.json` keeps its
workspace shape and required scripts; TypeScript strictness stays on; the `biome.json`
guard-rails survive (proxy lint-disabled, the datasource `noRestrictedImports` guard); and
every gate above stays wired into the hooks.

---

## Baselines (burn-down, not suppression)

Both dead-code and architecture gates went live on a real codebase, so pre-existing
violations are recorded explicitly and **new** violations still fail:

- **knip** — intentional build-ahead exports carry a `@knipignore` JSDoc tag
  (`tags: ["-knipignore"]` in `knip.json`). Grep `@knipignore` for the list.
- **check:architecture** — the `BASELINE` set at the top of the script lists each accepted
  debt as `path::rule` with the fix in a comment.

To retire a baseline entry: fix the file, then delete its tag / line. Do not add new ones
without a deliberate reason.

---

## Deliberately not enforced

- **Cross-feature imports** — StarterKit features share hooks/components/entities freely; this
  is not an invariant here, so it is not gated.

---

## Running gates manually

```bash
npm run check:architecture   # layering / dependency boundaries
npm run check:standards      # repo-config invariants
npm run knip                 # dead code / unused deps
npm run check:secrets        # secret scan (branch diff); add :all for whole repo
npm run check                # biome + typecheck + tests + all of the above
npm run check:markdown       # markdownlint over tracked docs (mirrored in CI)
npm run e2e:affected         # E2E specs the branch diff selects (prints the attestation line)
npm run e2e:affected -- --dry-run   # show the selection without running anything
```

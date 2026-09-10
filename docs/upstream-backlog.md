# Upstream back-port backlog

This kit was extracted from a production monorepo on 2026-08-14 and re-synced on
2026-09-10. The sync covered mobile release automation, E2E performance, PR prose tooling
and a set of verified defects. This file records what was researched and **deliberately
left out**, so the next sync starts from a list rather than from another survey.

Ordered by value. Each entry says what it is, why it was deferred, and what it costs.

---

## 1. The work-item gate and `/dev-loop`

A state record per work item, with eleven arms (gate1, ambiguity-scan, checks-green,
gate2, e2e-evidence, broken-test-scan, review-evidence, review-verdict, gate3,
readiness-sweep, stale-checks) and one rules module behind three entry points: a
`check-gate-state.mjs` CLI, a `gate-guard.mjs` hook for ergonomics, and a `gate-state.yml`
workflow that actually binds. `/dev-loop` is the command that walks it.

**Why deferred:** it is the largest single port and it changes how the whole repo is
worked, which is a decision for whoever adopts the kit rather than a defect fix.

**Note:** this kit still ships ten `spec-*` commands and a **mandatory** rule in
`AGENTS.md` and `docs/standards/monorepo.md` saying never to start a feature without an
approved spec. Those commands drive an MCP server that is not registered in `.mcp.json`,
so every one of them aborts on its first step while the rule still stands. Either wire
that server up, port the gate, or delete the commands and the rule. Do not leave it as
it is.

## 2. Repo intelligence (`docs/intel/`)

Nine explorer subagents that map the backend domains, the API surface, the frontend, the
integrations, the platform and the observed-versus-declared standards into a generated
tree, plus `intel-churn.mjs` to measure staleness and a SessionStart hook to report it.
Three trust rules bind every explorer: always cite sample size, never declare a standard
from one example, and where declared and observed disagree, observed wins.

This is the replacement for the `graphify-out/` references that this sync deleted. Until
it lands, there is no repo-map layer at all, which is the correct state — a pointer to a
tree that does not exist is worse than no pointer.

## 3. The PR review tooling rewrite

`scripts/pr-review-diff.mjs` grows from one file to a module set (`patch`, `detect`,
`reuse`, `digest`) with flag detection, structural clone detection, reuse hints and a
`--window` mode, and the `pr-review` skill becomes script-driven. Measured upstream at
17,167 tokens of standards files per Expo review down to 2,534.

**Blocked on:** `docs/standards/_digest.md`, one line per enforceable rule anchored to a
heading. It cannot be copied — every anchor must resolve against *this* repo's standards
headings, and `check:standards` verifies that. Budget the digest as its own piece of work.

**Also needs:** the flag citations repointed at headings that exist here, and a
configurable ticket prefix (the upstream `detect.mjs` hardcodes one).

## 4. E2E: the renderer pool and the mocked web config

Two upstream changes this sync did not take, both with real measurements behind them:

- **Renderer pool.** One `next start` process serving every worker is the parallelism
  ceiling, because Node is single-threaded and page requests queue through one event
  loop. N renderers behind a round-robin proxy fixed it. Measured 28-core A/B: web
  28.3 min at 1 worker, 11.2 min at 14 with 25 flaky. Requires moving the E2E web server
  off `npm run dev:web` onto a production build first, which is its own change.
- **Mocked web config.** Run the mock-driven web specs with no backend at all by
  supplying a synthetic session plus a mocked `/api/auth/me`. Measured: 187 tests in
  2.2 min with nothing listening on the API port. The implementation is auth-provider
  specific and would need rewriting against this kit's GoTrue injector; the pattern
  ports, the code does not.

Also skipped: the reverse-import-graph narrowing (upstream measured only 36 of 776 files
narrowing, so low payoff) and the containerised Playwright runner (newest and least
settled part of the source repo, four follow-up fixes in three days).

## 5. Infrastructure provisioning

`infra/provision-env.sh` stands up an Azure environment in one idempotent command, and
`grant-rbac.sh` makes the role assignments Contributor cannot. Encodes three hard-won
constraints: ARM read-after-create lag, soft-deleted Key Vaults recovering into their
original region, and the Git Bash path-mangling escapes. Comes with a deploy/runtime
principal split, so a compromised app can read its own config and write blobs but cannot
push an image or reconfigure its own web app.

Needs name templating before it is useful to a fork.

## 6. Smaller items

| Item | Note |
|---|---|
| `pull-backend-env.mjs` | Populates the backend `.env` from Key Vault so a new starter never creates a service principal to run Docker locally. Edits in place, preserving comments and local-only keys |
| `backend/mcp.md` loop-safety chapter | Why MCP calls must not re-enter MCP, and a security-reasoned "excluded from MCP" taxonomy. This kit enforces MCP tool parity without documenting why |
| Telemetry noise processor | Trace-id-keyed dependency sampling. Upstream found 17.77 GB of 22 GB in 30 days was dependency spans. Never samples requests, never drops slow or errored spans |
| `RedactFromAuditLog` attribute | Field-level redaction, complementing the existing `ExcludeFromAuditLog` |
| Hangfire `QueuePollInterval`, concrete job argument types | Generic hardening, documented in the source's `backend/jobs.md` |
| Personal access tokens | The auth story for a product MCP server. Self-contained and generic, but feature-sized |
| Maestro whole-suite retry | Only useful once the Maestro CI job here is re-enabled |
| Huawei AppGallery pipeline | A market requirement of the source product, not a starter-kit default |

---

## Found by audit, not yet fixed

Two audits ran over the published repo on 2026-09-10 (public-exposure, and cold-clone
onboarding). What they found that is still open:

| Item | Why it is still here |
|---|---|
| `JOURNAL_ENCRYPTION_KEY` **rotation** | The committed default is gone, but if any deployed environment ever booted with it, every journal row encrypted at rest under it is decryptable by anyone who cloned this repo before today. Check the vault, rotate, re-encrypt. This is an operational action, not a code change |
| The value is still in **git history** | Blanking it in the working tree does not remove it from the published history. `git log -S` finds it. Same for the Microsoft client id, Firebase key and Apple Team ID. All are public-by-design client identifiers rather than secrets, so the fix is rotation where it matters, not a history rewrite |
| `spec-*` commands vs the mandatory spec rule | Still unresolved. See the top of this file |
| Dead standards docs | `ai-prompts.md`, `pdf-reports.md` and `dev-timezone-testing.md` govern code that does not exist here; `caching.md` and `signalr.md` are each half-fictional. `check-standards.mjs` actively requires `ai-prompts.md`, so deleting it means editing the gate too |
| `docs/contributing.md`, `docs/standards/monorepo.md` | Both carry stale claims: `dev → main` as the release path, `npm run check` described as three steps when it is seven, Firebase/Azure B2C named as the auth stack when it is Supabase GoTrue, and a `docker-compose up` line that cannot work |
| `docs/erd.md` | Ships as a template while `AppDbContext` has 20 real DbSets. Its own warning about stale ERDs applies to itself |
| `/onboarding` and `/pull-secrets` | Both drive Azure Key Vault against a vault a forker has no access to. The commands most specifically aimed at new starters are the ones that cannot run for them |
| `.codex/config.toml` is empty | Five docs describe MCP servers it does not configure |
| `add-secret` and `backfill-snapshots` | Present in `.agents/commands/` only, so Claude and Copilot users cannot reach them. `AGENTS.md` lists `add-secret` as available |
| `markdownlint-cli2` advisory | High severity, via its dependency tree, no non-major fix at time of writing |
| Node 20 deprecation warning in Actions | `actions/checkout@v4`, `setup-node@v4` and `upload-artifact@v4` target Node 20 and are being forced onto Node 24. Bump to v5 when convenient |

## Repo settings this kit cannot ship

Three things live in GitHub configuration, and cloning gets you none of them:

1. A `production` environment with a **deployment-branch policy of `main` only**. That
   policy, not `deploy-mobile-prod.yml`, is what stops a production binary building from
   a feature branch. The workflow's comments claim a protection it does not have on its
   own.
2. The `dev` / `uat` / `production` environments themselves, and the secrets on each.
3. The required status checks. `Playwright (Web)` and `Playwright (Expo Web)` must be the
   **aggregator** jobs, never the shards — a matrix job reports as "… (1)" and satisfies
   neither.

## Bootstrap steps

- Seed `mobile-v1.0.0` before the first Expo PR, or `mobile-version.mjs` has no anchor to
  count from: `git tag -a mobile-v1.0.0 -m "baseline" && git push origin mobile-v1.0.0`.
- Fill in `docs/erd.md` and `docs/starterkit-brd.md`. Both ship as templates and both are
  required by `check:standards`.
- Replace the `YOUR-*` placeholders in `apps/expo/eas.json`, the two
  `apple-app-site-association` files and `deploy-mobile-dev.yml`.

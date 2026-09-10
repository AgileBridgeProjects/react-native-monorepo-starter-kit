# Branching & promotion

`dev → uat → main`. Each branch is promoted into the next by a **merge commit** (never a
squash), so every head branch is a strict superset of its base.

## Why "require branches to be up to date" is OFF on uat and main

`strict_required_status_checks_policy` is disabled on `protect-uat` and `protect-main`. The
**`Promotion base contained`** check (`.github/workflows/promotion-base-contained.yml`) was
written to take its place.

It is **not in either ruleset's required-checks list**, so it advises rather than blocks. The
workflow runs on every PR into `uat` and `main` and reports its result there, but a red result
does not stop the merge. Read it before promoting. To make it blocking, add the context
`Promotion base contained` to `protect-uat` and `protect-main`.

Strict was structurally unable to do anything useful here. Because promotion is linear and
merge-only, every `dev → uat` merge leaves a merge commit on `uat` that `dev` can never
contain — and the same for `uat → main`. Strict sees "base is ahead of head" and blocks,
even though the content of that commit came *from the head branch in the first place*. So
every release opened "out of date" with nothing missing, and clearing it meant hand-cranking
a back-merge — which, because these branches have no bypass actors, meant temporarily
disabling branch protection to push. That happened on 2026-07-20, 2026-08-03 and 2026-08-15
for `dev → uat`, and on 2026-08-03 and 2026-08-15 for `uat → main`.

Strict did protect one real case, and it is worth keeping: **a hotfix committed directly to
`uat` or `main`**. Then the base holds code the head has never seen, and promoting would
quietly regress it. This has happened — 17 commits went straight to `main` once and turned
the next `uat → main` into a conflict wall (PR #633).

`Promotion base contained` asks the question strict was a blunt proxy for: **does the base
contain any content the head does not?**

| base commits not in head | their content | result |
|---|---|---|
| promotion merge commits | already in head | **pass** |
| a direct hotfix | not in head | **fail**, naming the commits, the files and the fix |

The comparison is on content (`git diff head...base`, i.e. merge-base to base), not on commit
identity — which is precisely the distinction strict could not make.

## Back-merges

`.github/workflows/backmerge-promotion-branches.yml` still merges `uat` back into `dev` after every
promotion, and `main` back into `uat` after every release. This is now **hygiene, not a
gate**: it keeps ancestry clean so `git log dev..uat` stays meaningful and future comparisons
are honest. Nothing blocks on it.

Merge those PRs with **Create a merge commit**. A squash discards the merge parent, which is
why PR #574 fixed nothing.

## If `Promotion base contained` fails

It means someone committed straight to `uat` or `main`. Nothing blocks the merge, so act on it
yourself. Back-merge it — the check prints the exact commands:

```bash
git fetch origin
git checkout <head branch>
git merge origin/<base branch>
git push
```

Then prefer landing the fix on `dev` and promoting it, so it cannot be lost.

## Required checks

| ruleset | required checks | strict |
|---|---|---|
| `protect-dev` | `Expo CI`, `Web CI`, `Backend CI`, `Verify E2E attestation` | off |
| `protect-uat` | the above minus attestation, plus `Playwright (Web)`, `Playwright (Expo Web)`, `Maestro (Android)` | **off** |
| `protect-main` | `Source Branch Check`, `Expo CI`, `Web CI`, `Backend CI`, the three E2E suites | **off** |

`Promotion base contained` is in neither promotion row. It runs and reports on every `uat` and
`main` PR, but no ruleset requires it.

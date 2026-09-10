# Security

## Reporting a vulnerability

Report privately through this repository's **Security → Report a vulnerability**
(GitHub private vulnerability reporting). Do not open a public issue: an issue is
readable by everyone the moment it is filed, including whoever would exploit it.

Include what you did, what happened, and what you expected. A proof of concept helps but
is not required to report.

## What this repository is

A starter kit. The code here is a template you are expected to fork and change, so the
threat model is unusual in two ways worth stating:

- **Every placeholder is a live risk if you do not replace it.** `YOUR-*` values,
  `example.com` hosts, the empty `JOURNAL_ENCRYPTION_KEY`, the seeded development admin
  and the published Supabase demo JWTs in `infra/supabase/.env.example` are all
  deliberately non-functional. Shipping any of them to a real environment is the most
  likely way this kit hurts you. `docs/upstream-backlog.md` lists what a clone does not
  get and what you must stand up yourself.
- **The pipelines assume repository settings that do not travel with a clone.** The
  production mobile pipeline in particular relies on a `production` environment
  restricted to `main`; without it, the workflow's own comments describe a protection it
  does not have. See `docs/deployment/prod-mobile-store-setup.md` § Repo setup.

## What is enforced here

`npm run check:secrets` runs secretlint over staged files on commit, the whole tree on
push, and the whole tree in CI. Dependabot watches npm, NuGet and GitHub Actions weekly.
Neither catches a plain high-entropy string with no recognisable key prefix, so a
generated key committed as a "demo value" will pass all three. Do not commit one.

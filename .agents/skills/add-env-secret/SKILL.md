---
name: add-env-secret
description: >
  Add a new environment secret to Azure Key Vault and wire it up across the correct
  app(s). Use when the user says "add a secret", "add an env var", "add a Key Vault
  secret", or "we need a new environment variable".
---

# Add Environment Secret

Adds a secret to Azure Key Vault with the correct tags so CI picks it up automatically.
Never requires pipeline changes. May require a `.env.local` update and/or a Dockerfile
`ARG`/`ENV` pair depending on the app — this skill tells you when.

---

## Conventions

| Convention | Rule |
|---|---|
| Secret name | kebab-case of the env var: `MY_API_KEY` → `my-api-key` |
| Tags required | `app=<app> env=<env>` — determines which pipeline pulls it |
| App tags | `web` · `expo` · `backend` · `e2e` |
| Env tags | `dev` · `staging` · `prod` |
| `local=true` tag | Add this **as well** on any secret a developer's machine should pull into its local `.env`. The web/expo `pull:env` scripts filter `app=<app> && local=true` (CI pulls the broader `app=<app>`), so a secret with **no** `local=true` is CI/deploy-only and will not land in a local `.env.local`. `e2e` pulls every `app=e2e` secret and ignores `local`. |
| Supabase URL + anon key | Local dev: committed demo defaults in the app supabase configs — never pulled. Deployed envs: stored in Key Vault per env (`next-public-supabase-*` / `expo-public-supabase-*`, tags `app=<app> env=<env>` — **no `local=true`**) so CI injects them at build (see docs/standards/supabase.md) |
| Non-public infra tokens | Never in Key Vault — stay as GitHub secrets (`AZURE_STATIC_WEB_APPS_API_TOKEN_*`, `EXPO_TOKEN`, `AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID`) |

---

## Step 0 — Classify the secret

Ask (or infer):

1. **Which app(s) need it?** `web` / `expo` / `backend` / multiple
2. **Is it a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` var?** (client-side, baked at build time)
3. **Is it actually a secret?** Supabase URL/anon key are public by design — in-code defaults, not vault secrets.
4. **Which environment?** Usually `dev` first, then repeat for `staging`/`prod`.

---

## Step 1 — Add to Key Vault

```bash
az keyvault secret set \
  --vault-name kv-starterkit-dev \
  --name "<kebab-case-name>" \
  --value "<value>" \
  --tags app=<web|expo|backend|e2e> env=dev
# Add local=true if a developer's machine should pull it into .env.local:
#   --tags app=web env=dev local=true
```

For staging/prod, repeat with `kv-starterkit-staging` / `kv-starterkit-prod`.

**Multiple apps** — add once per app tag (Key Vault secrets are per-name; use different names or add both tags as separate secrets with different names).

---

## Step 2 — App-specific wiring

### `app=web` — Next.js (Dockerised, `NEXT_PUBLIC_*`)

The CI pipeline already writes all `app=web` Key Vault secrets into `apps/web/.env.local`
before `docker build`. Next.js reads this file automatically during `next build`.

**No Dockerfile or pipeline changes needed.** ✓

Update `apps/web/.env.example` to document the var (use a placeholder value, not the real one):
```bash
# apps/web/.env.example
NEXT_PUBLIC_MY_NEW_VAR=your-value-here
```

Update developer `.env.local` locally or via `scripts/pull-secrets.sh`.

---

### `app=expo` — Expo web (`EXPO_PUBLIC_*`)

The CI pipeline writes all `app=expo` Key Vault secrets to `$GITHUB_ENV` before `npx expo export`.
Metro substitutes `EXPO_PUBLIC_*` vars at bundle time from the environment.

**No pipeline or config changes needed.** ✓

Update `apps/expo/.env.example` to document the var:
```bash
# apps/expo/.env.example
EXPO_PUBLIC_MY_NEW_VAR=your-value-here
```

---

### `app=backend` — .NET backend (runtime config)

The backend uses `AddAzureKeyVault` with `DefaultAzureCredential` — it reads Key Vault directly
at runtime in non-Development environments. No CI injection step needed for the deployed app.

For local dev, add to `dotnet user-secrets`:
```bash
cd apps/backend
dotnet user-secrets set "SectionName:MyNewVar" "<value>"
```

Ensure the config key in `appsettings.json` matches the Key Vault secret name
(Key Vault maps `section--key` → `Section:Key` automatically via the configuration provider).

---

## Step 3 — Update GitHub environment for additional envs

If adding to `staging` or `prod`:
```bash
az keyvault secret set \
  --vault-name kv-starterkit-staging \
  --name "<kebab-case-name>" \
  --value "<staging-value>" \
  --tags app=<app> env=staging
```

---

## Step 4 — Verify

After the next deploy, confirm the secret is available:
- **web**: check the running Next.js app exposes the `NEXT_PUBLIC_*` var
- **expo**: check the exported bundle includes the var
- **backend**: check app logs / health endpoint on startup

---

## Quick reference

```bash
# List all secrets for an app
az keyvault secret list --vault-name kv-starterkit-dev \
  --query "[?tags.app=='web'].name" -o tsv

# Update a secret value
az keyvault secret set --vault-name kv-starterkit-dev \
  --name "my-secret-name" --value "new-value" --tags app=web env=dev

# Rotate (same command — Key Vault versions automatically)
az keyvault secret set --vault-name kv-starterkit-dev \
  --name "my-secret-name" --value "rotated-value" --tags app=web env=dev
```

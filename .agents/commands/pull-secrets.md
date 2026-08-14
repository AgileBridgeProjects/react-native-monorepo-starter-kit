# pull-secrets — Pull all env files from Key Vault

Run `npm run pull:env` in every app workspace that has the script, so all `.env.local`/`.env.e2e` files
are up to date in one shot.

## Instructions

Run the following commands **in sequence**. Report the outcome of each step.

### Step 1 — Pull expo env

```bash
cd apps/expo && npm run pull:env
```

Report how many vars were written to `apps/expo/.env.local`.

### Step 2 — Pull web env

```bash
cd apps/web && npm run pull:env
```

Report how many vars were written to `apps/web/.env.local`.

### Step 3 — Pull e2e env

```bash
cd e2e && npm run pull:env
```

Report how many vars were written to `e2e/.env.e2e`.

> **Note:** This file is only needed when running `npx playwright test` directly.
> `npm run e2e` and `npm run e2e:playwright` fetch from Key Vault at runtime without a file.

### Step 4 — Summary

Reply with a table:

| App | Vars written | Status |
|---|---|---|
| `apps/expo` | N | ✅ / ❌ |
| `apps/web` | N | ✅ / ❌ |
| `e2e` | N | ✅ / ❌ |

If any step fails, show the error output and stop — do not proceed to the next app.
Common causes:
- Not logged in → run `az login` then retry
- Key Vault access denied → check your Azure RBAC role on `kv-starterkit-dev`

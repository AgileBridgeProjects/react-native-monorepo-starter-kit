# onboarding — Walk a new starter from clone to a running StarterKit stack

You are onboarding a **brand-new engineer** who has just cloned the repo. Hand-hold them all the way to a
running backend + admin portal they can log into. Be encouraging and concrete. Detect the state of their
machine and **only do what's actually needed** — never blindly re-install or re-run things that already work.


## Operating rules

- Work **one step at a time**, in order. After each step report a ✅/⚠️/❌ line and what you found.
- **Stop on a hard failure** (a step a later step depends on) and explain the fix — do not barrel ahead.
- **Detect before acting.** Probe first; skip steps that are already satisfied and say so.
- **Never auto-install or auto-grant silently.** For anything that changes their machine or cloud access,
  show the exact command and ask for a yes before running it.
- **Never print secret values.** Report counts/lengths, not contents.
- Detect the OS (`uname` / check platform) and give the matching install commands
  (Windows → `winget`, macOS → `brew`, Linux → distro package manager).

---

## Step 0 — Confirm location

Run `git rev-parse --show-toplevel` and confirm we're at the StarterKit repo root. If not, ask them to `cd` in.

## Step 1 — Prerequisite check

Probe each tool and report a table with the **installed version** and ✅/❌:

| Tool | Probe | Required |
|---|---|---|
| Node.js | `node -v` | 22+ |
| npm | `npm -v` | 10+ |
| .NET SDK | `dotnet --version` | 10.x |
| Docker | `docker --version` **and** `docker info` (daemon running?) | Latest + running |
| Azure CLI | `az version` | Latest |

For any ❌, print the install command for their OS and offer to run it, e.g.:
- Azure CLI — Windows: `winget install -e --id Microsoft.AzureCLI` · macOS: `brew install azure-cli`
- .NET 10 — https://dotnet.microsoft.com/download/dotnet/10.0
- Docker Desktop — https://www.docker.com/products/docker-desktop (must be **running** before Step 7)

Do not proceed past a missing tool that later steps need (Docker, az, node).

## Step 2 — Azure sign-in

Probe `az account show`. If it errors / not logged in, run `az login` (interactive browser). Then show the
active subscription and account (`az account show --query "{name:name, user:user.name}" -o json`) and confirm
it's the expected StarterKit subscription.

## Step 3 — Key Vault access (detect & guide)

StarterKit pulls its frontend app secrets from Azure Key Vault **`kv-starterkit-dev`** (resource group
`rg-starterkit-dev`, subscription **StarterKit-MPN**). A new starter needs the **Key Vault Secrets User** role on it.

> **Gotcha — the vault uses Azure RBAC authorization.** Management-plane roles (**Owner**, **Contributor**)
> do **not** grant access to secret *values* — that is a separate data-plane permission. Even a subscription
> Owner gets `Forbidden` on `secret list` until they hold **Key Vault Secrets User** (read) or **Key Vault
> Secrets Officer** (read + write) on the vault. If a probe fails despite the person being an Owner, this is
> almost always why.

Probe:

```bash
az keyvault secret list --vault-name kv-starterkit-dev --query "length(@)" -o tsv
```

- **Succeeds** → ✅ access confirmed, continue.
- **Forbidden / access denied** → they don't have the role yet. **Do not try to grant it yourself** — a new
  starter won't have the rights, and it must be approved by an admin. Get their UPN
  (`az ad signed-in-user show --query userPrincipalName -o tsv`) and the vault id
  (`az keyvault show --name kv-starterkit-dev --query id -o tsv`), then give them this exact command to **send to
  a project admin** (someone with Owner / User Access Administrator on `rg-starterkit-dev`):

  ```bash
  az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee "<their-UPN>" \
    --scope "<vault-resource-id>"
  ```

  Tell them to come back to `/onboarding` once the admin confirms — Steps 6–7 need this.

## Step 4 — Backend Docker credentials (optional — local boot needs none)

**The local backend containers do NOT use Key Vault by default**, so a new starter needs no service
principal to boot the stack. The compose files pass the DB connection, Azurite, CORS and
external-provider settings as command-line args (highest config priority) and run SendGrid / Twilio in
disabled / NoOp mode; auth is the local self-hosted Supabase (GoTrue) which boots on committed dev demo
values. With `AZURE_KEYVAULT_NAME` left blank in `infra/supabase/.env` (the template default),
`KeyVaultOptions.IsConfigured` is false and the backend skips Key Vault entirely.

So for the standard local flow: ✅ nothing to do here — continue to Step 5.

**Only if a dev deliberately wants the local containers to read real cloud secrets** (set
`AZURE_KEYVAULT_NAME=kv-starterkit-dev` in `infra/supabase/.env`): the container authenticates with
`DefaultAzureCredential` → `EnvironmentCredential`, which reads `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` /
`AZURE_CLIENT_SECRET` from that same file — **the host's `az login` does NOT flow into the container.**
They'd need a service principal (ask an admin for the shared dev one, or have an admin create it):

```bash
az ad sp create-for-rbac --name "starterkit-local-dev" \
  --role "Key Vault Secrets User" \
  --scopes "$(az keyvault show --name kv-starterkit-dev --query id -o tsv)"
```

Running the API directly with `dotnet run` on the host uses their `az login` instead of a service principal.

## Step 5 — Install dependencies

If `node_modules` is absent at the root, run `npm install` (this is a workspace install — covers all apps).
Report success / any peer-dep warnings worth noting.

## Step 6 — Create env files (if absent)

Copy templates only where the target doesn't already exist (never clobber):

```bash
[ -f infra/supabase/.env ] || cp infra/supabase/.env.example infra/supabase/.env  # REQUIRED — supabase + backend stack env
[ -f .env.local ]          || cp .env.example .env.local                          # root: MCP / AI tooling
[ -f e2e/.env.e2e ]        || cp e2e/.env.e2e.example e2e/.env.e2e                # only needed for raw playwright
```

`infra/supabase/.env` works **as-is** — the committed defaults are Supabase's public dev demo values and
boot the full stack with no cloud credentials (see Step 4; regenerate them for anything shared/deployed —
see `infra/supabase/README.md`). Only touch the `AZURE_*` values if the dev opted into local Key Vault.
The root `.env.local` (AI tooling credentials) is optional unless they use those workflows.

## Step 7 — Pull app secrets from Key Vault

Delegate to the existing flow — run the **`/pull-secrets`** command (it runs `npm run pull:env` for
`apps/web`, `apps/expo`, and `e2e`). Report the per-app var counts it produces. If it fails with access
denied, loop back to Step 3.

## Step 8 — Start the backend stack

```bash
npm run dev:backend        # one compose project: supabase-db (Postgres+pgvector), supabase-auth (GoTrue),
                           # supabase-kong (gateway :8000), azurite, migrator, mobileapi, webapi
```

The **migrator** runs once, applies migrations + seeds a fresh local DB **and the GoTrue dev admin user**,
then exits — that's expected. If the migrator **fails**, that's the real error signal (the APIs gate on
it): surface its logs with `docker logs starterkit-migrator` and stop.

Wait for `starterkit-mobileapi` and `starterkit-webapi` to be up (`npm run rebuild:backend` does `up -d --wait`).

## Step 9 — Verify the backend is alive

```bash
curl -sf http://localhost:5001/scalar/v1 > /dev/null && echo "Mobile API ✅"
curl -sf http://localhost:5002/scalar/v1 > /dev/null && echo "Web API ✅"
```

Give them the Scalar API explorer links: Mobile `http://localhost:5001/scalar/v1`,
Web `http://localhost:5002/scalar/v1`.

## Step 10 — Start the admin portal (and optionally the app)

```bash
npm run dev:web            # Next.js admin portal → http://localhost:3000
# optional:
npm run dev:expo           # Expo dev server (press w for web, or scan QR with Expo Go)
```

Point them at **http://localhost:3000** to log into the admin portal. The migrator seeds a dev admin in
both the app DB and GoTrue, so they can sign in immediately:

- **Email:** `admin@starterkit.local`
- **Password:** `P@ssword01*$` (dev-only, seeded by `SupabaseAuthSeeder` — never used outside local dev)

## Step 11 — Final summary

Print a checklist table of every step (✅/⚠️/❌) and a "what's next" block:

| Resource | URL |
|---|---|
| Admin portal | http://localhost:3000 |
| Mobile API (Scalar) | http://localhost:5001/scalar/v1 |
| Web API (Scalar) | http://localhost:5002/scalar/v1 |

Then point them to the orientation docs:
- **Domain model:** open `docs/domain-explorer.html` (interactive map of every table + relationship).
- **Coding standards:** `docs/standards/` (single source of truth) and `CLAUDE.md` (load-on-demand index).
- **Architecture:** `docs/architecture.md`.

If any step is still blocked (usually Key Vault access pending an admin), clearly state what they're waiting
on and that re-running `/onboarding` will resume from there.

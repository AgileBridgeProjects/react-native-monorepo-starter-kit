# Self-hosted Supabase (DB + Auth)

StarterKit self-hosts a **slimmed** Supabase stack — Postgres + GoTrue (Auth) + a Kong
gateway that exposes **only** `/auth/v1/*`. We use our **own .NET endpoints** for all
data access and never expose Supabase's auto-generated Data API (PostgREST). See
[`docs/standards/supabase.md`](../../docs/standards/supabase.md) for the full law.

| Service | Image | Role |
|---|---|---|
| `db` | `supabase/postgres` | Postgres — ships `pgvector` + the `auth` schema/roles. EF Core owns `public`, GoTrue owns `auth`. |
| `auth` | `supabase/gotrue` | JWT auth API (sign-up / login / refresh). |
| `kong` | `kong/kong` | Gateway on `:8000`, exposes `/auth/v1/*` only. |
| `meta`, `studio` | `supabase/*` | Optional local DB inspection — `--profile tools`. |

**Omitted on purpose:** PostgREST (`rest`), `realtime`, `storage`, `imgproxy`,
`functions`, `supavisor`, analytics.

## Local development

```bash
cp infra/supabase/.env.example infra/supabase/.env      # demo secrets boot as-is
npm run dev:backend        # brings up Supabase + migrator + .NET APIs together
```

`dev:backend` / `rebuild:backend` merge this file with `apps/backend/docker-compose.yml`
into one Compose project on one network, so the .NET APIs reach `db` and `auth` by
hostname. Health checks:

```bash
curl http://localhost:8000/auth/v1/health          # GoTrue via Kong -> {"...":true}
PGPASSWORD=postgres psql "postgresql://postgres@localhost:5432/postgres" -c '\dn'   # local dev password; schemas: public, auth, ...
```

Optional DB dashboard (run from the repo root — paths and `--project-directory` are repo-root-relative):
`docker compose --project-directory . --env-file infra/supabase/.env -f infra/supabase/docker-compose.supabase.yml --profile tools up studio` → <http://localhost:54323>.

## Regenerating secrets (required before any shared/public deployment)

The committed `.env.example` uses Supabase's **public demo** keys — safe only for
local dev. For anything else, regenerate:

```bash
# 1. Strong secrets
openssl rand -base64 48   # -> JWT_SECRET (>= 32 chars)
openssl rand -base64 24   # -> POSTGRES_PASSWORD

# 2. ANON_KEY + SERVICE_ROLE_KEY are JWTs signed with JWT_SECRET, role = anon / service_role.
#    Generate with Supabase's helper (https://supabase.com/docs/guides/self-hosting/docker)
#    or any JWT tool. Payload: {"role":"anon","iss":"supabase","iat":...,"exp":...}
```

Keep these aligned or auth breaks:

- `JWT_SECRET` — must match the `Supabase:JwtSecret` the .NET API validates with.
- `API_EXTERNAL_URL` — `GOTRUE_JWT_ISSUER` is `${API_EXTERNAL_URL}/auth/v1`; the .NET
  `SupabaseAuthHandler` validates the token issuer against this exact value.

## OAuth (Google, Apple)

GoTrue brokers social sign-in — the app calls `supabase.auth.signInWithOAuth` (web, redirect
flow) or `supabase.auth.signInWithIdToken` (native mobile). You must create the provider apps
in each vendor's console; then set the `*_ENABLED=true` + credentials in `infra/supabase/.env`
(the compose already wires `GOTRUE_EXTERNAL_GOOGLE_*` / `GOTRUE_EXTERNAL_APPLE_*`).

### Google — yes, you need a Google Cloud OAuth app

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID**.
2. Create **three** clients (one project, share the consent screen):
   - **Web application** → Authorized redirect URI `http://localhost:8000/auth/v1/callback`
     (and your prod `https://<domain>/auth/v1/callback`). This client's id+secret →
     `GOOGLE_CLIENT_ID` (first entry) + `GOOGLE_SECRET`.
   - **iOS** → bundle id from `apps/expo/app.json`. Its client id is added to `GOOGLE_CLIENT_ID`.
   - **Android** → package name + SHA-1 (from your EAS keystore). Its client id is added too.
3. `GOOGLE_CLIENT_ID` = comma-separated `web,ios,android` client ids; `GOOGLE_SECRET` = the
   **web** client secret. Set `GOOGLE_ENABLED=true`.

### Apple — yes, Apple Developer setup is required

1. Apple Developer → Certificates, IDs & Profiles:
   - An **App ID** with *Sign in with Apple* enabled (your iOS bundle id).
   - A **Services ID** (for web/redirect) with *Sign in with Apple* → configure the return URL
     `https://<domain>/auth/v1/callback` (Apple rejects `http`/localhost — use a tunnel or your
     staging domain to test web Apple sign-in).
   - A **Sign in with Apple Key** (.p8) → note the Key ID + your Team ID.
2. `APPLE_CLIENT_ID` = your Services ID and/or bundle id (comma-separated). `APPLE_SECRET` = a
   **client-secret JWT** signed with the .p8 (ES256; `iss`=TeamID, `sub`=ClientID, `aud`=
   `https://appleid.apple.com`, max 6-month expiry — regenerate before it lapses).
3. Set `APPLE_ENABLED=true`. On iOS, *Sign in with Apple* is mandatory if you offer any other
   social login (App Store review rule) — the Expo app uses `expo-apple-authentication` natively.

After editing `.env`, restart: `npm run dev:backend`. Verify: `GET http://localhost:8000/auth/v1/settings`
should list the enabled `external` providers.

## Azure hosting notes

- **Postgres**: run `db` as a container (Azure Container Apps / AKS with a persistent
  volume) **or** point GoTrue + EF at **Azure Database for PostgreSQL Flexible Server**
  (enable the `pgvector` extension; set `GOTRUE_DB_DATABASE_URL` and
  `ConnectionStrings__DefaultConnection` to the managed instance, `PGSSLMODE=require`).
  Managed Postgres is recommended for prod — drop the `db` service and keep `auth` + `kong`.
- **Secrets**: source `JWT_SECRET`, `POSTGRES_PASSWORD`, `SERVICE_ROLE_KEY` from
  **Azure Key Vault** (the .NET app already supports Key Vault via `KeyVault__Enabled`).
- **TLS**: terminate at Azure Front Door / App Gateway; set `API_EXTERNAL_URL` and
  `SITE_URL` to the public HTTPS URLs.

## Updating the vendored files

`volumes/api/kong.yml` is a hand-trimmed (auth-only) copy of upstream. `kong-entrypoint.sh`,
`volumes/db/init/99-roles.sql`, and `99-jwt.sql` are vendored **unchanged** from
`github.com/supabase/supabase/tree/master/docker` — diff against upstream when bumping
image tags (`db`, `auth`, `kong` versions are pinned in the compose file).

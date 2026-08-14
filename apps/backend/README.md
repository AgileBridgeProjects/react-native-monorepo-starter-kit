# ⚙️ StarterKit Backend

Backend API services for the StarterKit platform, built with **.NET 10** and **C#**.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Notes |
|---|---|
| .NET 10 SDK | [Download](https://dotnet.microsoft.com/download/dotnet/10.0) |
| Docker Desktop | For the local stack (APIs, migrator, Azurite) |
| Azure CLI | `az login` required — secrets come from Key Vault |
| Visual Studio 2022 v17.8+ or Rider | IDE |

> Ask a project admin to grant you **Key Vault Secrets User** on `kv-starterkit-dev` before running locally.

### Option A — Docker (recommended)

```bash
cd apps/backend

# 1. Authenticate with Azure (secrets pulled from Key Vault at runtime)
az login

# 2. Create the compose env (committed public demo values — boots with no cloud creds)
cp ../../infra/supabase/.env.example ../../infra/supabase/.env

# 3. Restore local .NET tools (CSharpier, EF CLI)
dotnet tool restore

# 4. Start all containers
docker-compose up --build
```

Verify the APIs are up:

- Mobile API: <http://localhost:5001/scalar/v1>
- Web API: <http://localhost:5002/scalar/v1>

### Option B — Without Docker

```bash
cd apps/backend

# 1. Authenticate with Azure
az login

# 2. Restore dependencies and tools
dotnet restore
dotnet tool restore

# 3. Point each API at Key Vault (one-time per machine)
dotnet user-secrets set "KeyVault:Name" "kv-starterkit-dev" --project src/StarterKit.MobileApi
dotnet user-secrets set "KeyVault:Name" "kv-starterkit-dev" --project src/StarterKit.WebApi

# 4. Point at the local Supabase Postgres (docker stack must be running — see Option A)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres" \
  --project src/StarterKit.MobileApi
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres" \
  --project src/StarterKit.WebApi

# 5. Apply migrations
dotnet ef database update --project src/StarterKit.Data --context AppDbContext

# 6. Run the APIs
dotnet run --project src/StarterKit.MobileApi
dotnet run --project src/StarterKit.WebApi
```

---

## 🔐 Secrets & Environment

Deployed environments store secrets (connection strings, Supabase JWT secret, service-role key, etc.) in **Azure Key Vault** (`kv-starterkit-dev`) and load them automatically at startup via `AddAzureKeyVault` + `DefaultAzureCredential`.

**Local dev needs no Key Vault at all** — the compose stack boots the self-hosted Supabase (GoTrue + Postgres) with committed demo values from `infra/supabase/.env` and passes everything as command-line args. Deployed environments use the **hosted** Supabase project instead (see `docs/standards/supabase.md` § Deployed environments).

---

## 🗂️ Solution Structure

```text
apps/backend/
  src/
    StarterKit.MobileApi        # ASP.NET Core Web API — mobile client
    StarterKit.WebApi           # ASP.NET Core Web API — web client
    StarterKit.Core             # Shared business logic (services, domain models)
    StarterKit.Data             # EF Core (DbContext, migrations, repositories)
    StarterKit.Mcp              # Shared MCP server wiring (both APIs host /mcp — see docs/standards/backend/mcp.md)
  tests/
    StarterKit.MobileApi.Tests  # Integration tests
    StarterKit.WebApi.Tests     # Integration tests
    StarterKit.Core.Tests       # Unit tests
    StarterKit.Data.Tests       # Database tests (Testcontainers)
  docker-compose.yml
  StarterKit.slnx
```

---

## 🏛️ Architecture

```text
StarterKit.MobileApi  ──┐
                    ├──▶  StarterKit.Core  ──▶  StarterKit.Data  ──▶  Postgres (Supabase: local docker / hosted when deployed)
StarterKit.WebApi     ──┘
```

| Project | Responsibility |
|---|---|
| **MobileApi** | Validates Supabase (GoTrue) JWTs; mobile-optimised endpoints |
| **WebApi** | Validates Supabase (GoTrue) JWTs; web-optimised endpoints |
| **Core** | All business logic; auth-provider agnostic; receives resolved internal `UserId` |
| **Data** | EF Core `AppDbContext`, migrations, repository implementations |

### User identity

GoTrue issues the external identity: the token `sub` (a UUID from `auth.users`) is stored in `Users.ExternalAuthId`. Each API resolves the external identity to the internal `Guid` on every authenticated request (`RoleClaimsTransformer`, with a verified-email fallback for pre-registered users).

---

## 🔒 Authentication

| API | Provider | Mechanism |
|---|---|---|
| `StarterKit.MobileApi` | Supabase (GoTrue) | JWT validated by `SupabaseAuthHandler` — HS256 shared secret locally, ES256 via JWKS on hosted projects (see `docs/standards/supabase.md`) |
| `StarterKit.WebApi` | Supabase (GoTrue) | Same `SupabaseAuthHandler` contract |

---

## 📡 API Documentation

Available in Development only (Scalar UI):

| API | Scalar UI | OpenAPI JSON |
|---|---|---|
| Mobile API | <http://localhost:5001/scalar/v1> | <http://localhost:5001/openapi/v1.json> |
| Web API | <http://localhost:5002/scalar/v1> | <http://localhost:5002/openapi/v1.json> |

---

## 🐳 Docker

| Container | Port |
|---|---|
| `starterkit-mobileapi` | `5001` |
| `starterkit-webapi` | `5002` |
| `starterkit-azurite` | `10000` (Blob), `10001` (Queue), `10002` (Table) |

```bash
docker-compose up --build   # First run or after code changes
docker-compose up           # Subsequent runs (no rebuild)
docker-compose down         # Stop all containers
docker-compose down -v      # Stop and wipe all volumes (fresh state)
docker-compose ps           # View running containers
```

### Browsing blob storage locally (Azurite)

Uploaded files are stored in **Azurite** (Azure Storage emulator) when running via docker-compose.
The real Azure dev storage account (`ststarterkitdev`) is never touched during local development.

**Blob data persists** across `docker-compose up/down` runs via the `azurite_data` named volume.
Run `docker-compose down -v` to wipe it and start fresh.

To browse blobs visually:

1. Install **Azure Storage Explorer** (free): <https://azure.microsoft.com/products/storage/storage-explorer>
2. Open it → click the plug icon (**Connect to Azure resources**) in the left sidebar
3. Choose **Local storage emulator** → click **Next** → **Connect**
4. Expand **Emulator & Attached → Storage Accounts → (Emulator - Default Ports) → Blob Containers**

> Make sure `docker-compose up` is running first so Azurite is reachable on `localhost:10000`.

---

## 🧪 Testing

| Project | Strategy |
|---|---|
| `StarterKit.Core.Tests` | Pure unit tests — all deps mocked with Moq |
| `StarterKit.Data.Tests` | Real SQL Server via Testcontainers — validates EF mappings and queries |
| `StarterKit.MobileApi.Tests` | In-process HTTP via `WebApplicationFactory` — auth replaced with `TestAuthHandler` |
| `StarterKit.WebApi.Tests` | Same approach as MobileApi.Tests |

```bash
dotnet test
```

**Key packages:** `xunit`, `Moq`, `Testcontainers.MsSql`, `FluentAssertions`, `Bogus`, `Microsoft.AspNetCore.Mvc.Testing`

---

## 🗄️ Database Migrations

```bash
# Add a migration (run from apps/backend/)
dotnet ef migrations add <Name> --project src/StarterKit.Data --context AppDbContext

# Apply migrations
dotnet ef database update --project src/StarterKit.Data --context AppDbContext
```

---

## 🩺 Troubleshooting

### `ports are not available: exposing port TCP 0.0.0.0:5001` (or 5002)

**Cause:** Windows Hyper-V / WinNAT dynamically reserves port ranges at startup and can claim 5001–5002 after a Docker Desktop restart, update, or machine reboot. This is a known Windows issue unrelated to the project code.

**Fix (run once in an Administrator PowerShell):**

```powershell
# 1. Release the dynamic reservation — ports 5001/5002 become available again
net stop winnat
net start winnat

# 2. Permanently reserve these ports so Hyper-V can never claim them again
netsh int ipv4 add excludedportrange protocol=tcp startport=5001 numberofports=2
```

Then bring the containers up normally:

```bash
cd apps/backend
docker compose up -d
```

> The `netsh` reservation survives reboots. You only need to do step 2 once per machine. If you ever wipe the registry or reset Hyper-V, re-run step 2.

**Why did it work before?** Hyper-V's dynamic exclusion ranges change on each boot/restart cycle. Yesterday the range didn't include 5001/5002; after Docker Desktop restarted it did.

---

## ✨ Code Quality

| Tool | Purpose |
|---|---|
| **CSharpier** | Opinionated C# formatter (like Prettier) |
| **EditorConfig** | Indentation, line endings, naming conventions |
| **Roslyn Analysers** | Built-in .NET code quality analysis |
| **Threading Analyzers** | Enforces correct async/await patterns |

```bash
dotnet csharpier src/ tests/          # Format
dotnet csharpier --check src/ tests/  # Check only (used in CI)
```

> CSharpier is enforced at build time via `Directory.Build.props` and in CI — unformatted files fail the build.

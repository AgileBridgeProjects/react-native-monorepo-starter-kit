# psql CLI Setup

AI agents (and developers) query the development database directly using the `psql` CLI.
StarterKit uses **PostgreSQL** as its database.

---

## Install psql (required for every developer)

`psql` is the standard PostgreSQL command-line client, shipped with the PostgreSQL client tools.

| Platform | Command |
|---|---|
| **Windows** | `winget install PostgreSQL.PostgreSQL` (or install the client-only tools) |
| **macOS** | `brew install libpq && brew link --force libpq` (client only) or `brew install postgresql@16` |
| **Linux (Ubuntu/Debian)** | `sudo apt-get install postgresql-client` |

Verify:

```bash
psql --version
```

---

## Connection details (.env.local)

Copy `.env.example` to `.env.local` and fill in the `PG*` values.
`psql` reads these env vars automatically — no flags needed.

```ini
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=starterkit
```

For local Docker development the defaults above match `apps/backend/docker-compose.yml`.

---

## Run a query

Once `.env.local` is set, load the vars into your shell and run queries:

```bash
# Load .env.local (bash)
set -a && source .env.local && set +a

# Run a quick query
psql -c "SELECT * FROM users LIMIT 5"

# Run a query against a specific database (overrides PGDATABASE)
psql -d starterkit -c "SELECT COUNT(*) FROM companies"

# Connect interactively
psql
```

Flags reference:

| Flag | Purpose |
|---|---|
| `-c "<query>"` | Run query and exit |
| `-d <database>` | Override database |
| `-A -F ","` | Unaligned CSV output (field separator) |
| `-t` | Tuples only (no headers/footers) |
| `-o <file>` | Write output to file |

A full connection string also works:

```bash
# Local dev password defaults to "postgres"; export it rather than inlining it in the URI.
PGPASSWORD=postgres psql "postgresql://postgres@localhost:5432/starterkit" -c "SELECT version()"
```

---

## Azure / staging connection

StarterKit's cloud database is **Azure Database for PostgreSQL (Flexible Server)**.

```ini
PGHOST=your-server.postgres.database.azure.com
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=starterkit
PGSSLMODE=require
```

Azure Database for PostgreSQL requires TLS — set `PGSSLMODE=require` (or `verify-full` with a CA cert).

```bash
psql -c "SELECT version()"
```

---

## AI agent usage

See the `query-database` skill (`.agents/skills/query-database/SKILL.md`) — it teaches agents
the correct `psql` patterns to use when querying the dev database.

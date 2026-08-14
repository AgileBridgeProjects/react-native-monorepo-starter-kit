#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# run-e2e.sh — Orchestrates the full local E2E test lifecycle:
#   1. Start the ephemeral Postgres (pgvector) container
#   2. Run migrator to apply schema + seed deterministic data
#   3. Start the isolated WebApi
#   4. Run the requested E2E suite (playwright, maestro, or both)
#   5. Tear down containers (unless E2E_KEEP_UP=1)
#
# Environment (all optional — see docs/standards/e2e-testing.md):
#   E2E_TEARDOWN=1    Tear the containers down after the run. The DEFAULT is to keep
#                     them up: a later run reuses the healthy containers and skips the
#                     image rebuild + migration — the difference between a ~5-minute
#                     cold run and a ~30-second warm one. Stop them any time with
#                     `npm run e2e:down`. (E2E_KEEP_UP=1 is still honoured for
#                     back-compat and simply reasserts the default.)
#   E2E_SPECS         Space-separated spec paths to run instead of the whole suite.
#   E2E_PROJECTS      Space-separated Playwright projects (default: all).
#   E2E_SERVERS       web | expo | both — which dev server Playwright starts.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# Prevent Git Bash (MSYS) from mangling Unix paths passed to Docker
export MSYS_NO_PATHCONV=1

# Disable Docker Compose v2 interactive TUI (prevents blocking after container exits)
export COMPOSE_INTERACTIVE_NO_CLI=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# Use a Windows-compatible path for Docker on MSYS/Git Bash.
# Without this, Docker prepends C: to the Unix path and gets C:\c\dev\...
if command -v cygpath &>/dev/null; then
  COMPOSE_FILE="$(cygpath -m "$E2E_DIR/docker-compose.e2e.yml")"
else
  COMPOSE_FILE="$E2E_DIR/docker-compose.e2e.yml"
fi

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No colour

# ── Helpers ───────────────────────────────────────────────────
info()  { echo -e "${GREEN}[e2e]${NC} $*"; }
warn()  { echo -e "${YELLOW}[e2e]${NC} $*"; }
error() { echo -e "${RED}[e2e]${NC} $*" >&2; }

# Track whether cleanup is needed
CLEANUP_NEEDED=false

cleanup() {
  # Keep-up is the default: the next run reuses the healthy containers and skips
  # the image rebuild + migration. Opt in to teardown with E2E_TEARDOWN=1.
  if [ "${E2E_TEARDOWN:-0}" != "1" ]; then
    warn "Leaving containers running for the next (warm) run — stop them with: npm run e2e:down"
    return
  fi
  if [ "$CLEANUP_NEEDED" = true ]; then
    info "Tearing down E2E containers..."
    docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ${COMPOSE_ENV_ARG[@]+"${COMPOSE_ENV_ARG[@]}"} down -v --remove-orphans 2>/dev/null || true
    info "Cleanup complete."
  fi
}

# True when a compose service is already running (used to take the warm path).
service_running() {
  local service="$1"
  local id
  id="$(docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ps -q "$service" 2>/dev/null | tr -d '\r')"
  [ -n "$id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null)" = "true" ]
}

# Always clean up, even on failure or Ctrl+C
trap cleanup EXIT

# ── Parse arguments ───────────────────────────────────────────
SUITE="${1:-all}"  # playwright | maestro | all

usage() {
  echo "Usage: $0 [playwright|maestro|all]"
  echo ""
  echo "  playwright  — Run Playwright tests only (Admin Portal)"
  echo "  maestro     — Run Maestro flows only (Mobile)"
  echo "  all         — Run both suites (default)"
  echo ""
  echo "Prerequisites:"
  echo "  - Docker Desktop running"
  echo "  - For Playwright: Next.js dev server on http://localhost:3000"
  echo "  - For Maestro: Expo dev server + emulator/simulator running"
  exit 1
}

case "$SUITE" in
  playwright|maestro|all) ;;
  -h|--help) usage ;;
  *) error "Unknown suite: $SUITE"; usage ;;
esac

# ── Fetch E2E secrets from Key Vault ─────────────────────────
# Uses the developer's active `az login` session — no .env file needed.
# Falls back to .env.e2e if az CLI is unavailable or KV access fails.
KV_NAME="${AZURE_KEYVAULT_NAME:-kv-starterkit-dev}"
COMPOSE_ENV_ARG=()

kv_fetch_all() {
  info "Fetching E2E secrets from Key Vault ($KV_NAME, tag: app=e2e)..."
  local names
  names="$(az keyvault secret list --vault-name "$KV_NAME" \
    --query "[?tags.app=='e2e'].name" -o tsv 2>/dev/null | tr -d '\r')" || return 1

  if [ -z "$names" ]; then
    warn "No secrets found with tag app=e2e in $KV_NAME."
    return 1
  fi

  while IFS= read -r name; do
    # Strip any trailing carriage return (Windows line endings from az CLI)
    name="${name//$'\r'/}"
    [ -z "$name" ] && continue
    local value
    value="$(az keyvault secret show --vault-name "$KV_NAME" --name "$name" \
      --query value -o tsv 2>/dev/null)" || { warn "Failed to fetch secret: $name"; continue; }
    # Auto-map: kebab-case → UPPER_SNAKE_CASE (e2e-admin-email → E2E_ADMIN_EMAIL)
    local var_name="${name//-/_}"
    var_name="${var_name^^}"
    export "$var_name=$value"
  done <<< "$names"

  info "E2E secrets loaded from Key Vault."
}

if command -v az &>/dev/null; then
  kv_fetch_all || {
    warn "Key Vault fetch failed (run 'az login'?). Falling back to .env.e2e file."
    if [ -f "$E2E_DIR/.env.e2e" ]; then
      set -a; source "$E2E_DIR/.env.e2e"; set +a
      COMPOSE_ENV_ARG=("--env-file" "$E2E_DIR/.env.e2e")
      info "Loaded credentials from .env.e2e."
    else
      warn ".env.e2e not found either. Run 'npm run pull:env' in e2e/ to create it."
    fi
  }
else
  warn "Azure CLI not found — falling back to .env.e2e file. Install az: https://aka.ms/InstallAzureCLI"
  if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a; source "$E2E_DIR/.env.e2e"; set +a
    COMPOSE_ENV_ARG=("--env-file" "$E2E_DIR/.env.e2e")
    info "Loaded credentials from .env.e2e."
  else
    warn ".env.e2e not found. Run 'npm run pull:env' in e2e/ to create it."
  fi
fi

# ── Steps 1-3: Bring up the stack (skipped entirely when already warm) ────────
# A previous run left Postgres + WebApi healthy (keep-up is the default — see above).
# Reusing them skips the image rebuild and the migration — the difference between a
# ~5-minute cold run and a ~30-second warm one.
export BACKEND_URL="http://localhost:5003"

if service_running postgres-e2e && service_running webapi-e2e; then
  CLEANUP_NEEDED=true
  info "Reusing the running E2E stack (skipping build + migrations)."
  info "Backend API ready at $BACKEND_URL"
else
  # ── Step 1: Start DB container ───────────────────────────────
  info "Starting E2E database container..."
  docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ${COMPOSE_ENV_ARG[@]+"${COMPOSE_ENV_ARG[@]}"} up -d postgres-e2e
  CLEANUP_NEEDED=true

  info "Waiting for database to be healthy..."
  docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ${COMPOSE_ENV_ARG[@]+"${COMPOSE_ENV_ARG[@]}"} up -d --wait postgres-e2e

  # ── Step 2: Run migrator (applies schema + seeds deterministic data) ──────────
  info "Running database migrations..."
  docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ${COMPOSE_ENV_ARG[@]+"${COMPOSE_ENV_ARG[@]}"} up migrator-e2e --build --abort-on-container-exit < /dev/null
  info "Migrations complete."

  # ── Step 3: Start backend API ────────────────────────────────
  info "Building and starting WebApi (E2E) — this may take a minute on first run..."
  docker compose -f "$COMPOSE_FILE" -p starterkit-e2e ${COMPOSE_ENV_ARG[@]+"${COMPOSE_ENV_ARG[@]}"} up -d --wait webapi-e2e --build
  info "Backend API ready at $BACKEND_URL"
fi

# ── Step 4: Run tests ────────────────────────────────────────
EXIT_CODE=0

run_playwright() {
  info "Running Playwright tests (Admin Portal)..."
  cd "$E2E_DIR"

  # Narrow the run when the caller selected specs/projects (npm run e2e:affected).
  # Unset means "whole suite", preserving the original behaviour.
  local args=(--config playwright.config.ts)
  local project spec
  for project in ${E2E_PROJECTS:-}; do
    # `--project=x`, not `--project x`: the flag is variadic, so the space form
    # swallows the spec paths that follow it as extra project names.
    args+=("--project=$project")
  done
  for spec in ${E2E_SPECS:-}; do
    args+=("$spec")
  done

  npx playwright test "${args[@]}" || EXIT_CODE=$?
  cd - > /dev/null
}

run_maestro() {
  info "Running Maestro flows (Mobile)..."
  # Load E2E credentials and pass to Maestro as env vars
  if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$E2E_DIR/.env.e2e"
    set +a
  fi
  # Generate a unique email for the register flow
  export E2E_REGISTER_EMAIL="e2e-maestro-$(date +%s)@starterkit.local"
  maestro test "$E2E_DIR/maestro/" || EXIT_CODE=$?
}

case "$SUITE" in
  playwright) run_playwright ;;
  maestro)    run_maestro ;;
  all)
    run_playwright
    run_maestro
    ;;
esac

# ── Step 5: Report ────────────────────────────────────────────
if [ $EXIT_CODE -eq 0 ]; then
  info "All E2E tests passed."
else
  error "E2E tests failed (exit code: $EXIT_CODE)."
fi

# cleanup runs via trap EXIT
exit $EXIT_CODE

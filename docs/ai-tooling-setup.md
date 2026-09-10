# AI Tooling Setup

This guide walks you through the AI tooling used in this repo and how it applies to Claude Code, GitHub Copilot, and Codex.

---

## Prerequisites

| Tool | Install | Verify |
|---|---|---|
| **Node.js** (≥ 20) | [nodejs.org](https://nodejs.org) | `node -v` |
| **Skills CLI** | `npm install -g skills` | `skills --version` |
| **psql** | `winget install PostgreSQL.psql` (Win) · `brew install libpq && brew link --force libpq` (Mac) · `apt-get install postgresql-client` (Linux) | `psql --version` |

---

## 1. Shared Skills

Shared skill definitions live in `.agents/skills/`. That directory is the canonical repo copy of the installed skill content tracked by `skills-lock.json`.

How each agent uses those skills today:

| Agent | How skills are wired in this repo | Verified state |
|---|---|---|
| **Claude Code** | Shared project skills live in `.agents/skills/`; Claude also has extra agent-specific skills in `.claude/skills/` | Verified in repo |
| **GitHub Copilot** | Skills are installed via the Skills CLI as universal project skills in `.agents/skills/` | Verified by `npx skills ls --json` |
| **Codex** | Skills are installed via the Skills CLI as universal project skills in `.agents/skills/` | Verified by `npx skills ls -a codex --json` |

For Codex, the proven skills-parity mechanism in this repo is:

- use `AGENTS.md` as the repo instruction file
- use the same shared `.agents/skills/` entries that `skills` marks for the `Codex` agent
- read the relevant `.agents/skills/<skill>/SKILL.md` on demand when a task matches that skill

### Install shared skills for Claude Code, GitHub Copilot, and Codex

Skills provide domain-specific knowledge to the agents that support this repo's Skills CLI workflow.

From the repo root:

```bash
# .NET Backend (opinionated patterns — Context7 cannot replace these)
skills add github/awesome-copilot --skill dotnet-best-practices --agent claude-code github-copilot -y
skills add mhagrelius/dotfiles --skill dotnet-10-csharp-14 --agent claude-code github-copilot -y
skills add github/awesome-copilot --skill dotnet-best-practices --agent claude-code github-copilot codex -y
skills add mhagrelius/dotfiles --skill dotnet-10-csharp-14 --agent claude-code github-copilot codex -y
```

> **Why only 2 registry skills?** Expo, Next.js, ASP.NET Minimal API, xUnit, React Query, and similar library docs are served on demand by the **Context7 MCP server** (`@upstash/context7-mcp`). Adding those as static skills would give you stale snapshots — Context7 always fetches the current version.

### Verify

```bash
skills ls
```

You should see the repo's shared `.agents/skills/` entries for Claude Code, GitHub Copilot, and Codex.
Claude Code may also show additional `.claude/skills/` entries that are intentionally Claude-only.

### What gets installed

Skills are stored in `.agents/skills/` as universal project skills for GitHub Copilot and Codex. Claude Code also has extra agent-specific skills in `.claude/skills/`. The `skills-lock.json` lockfile tracks versions — commit both to the repo.

Custom repo-authored skills in `.agents/skills/` (not from an external registry):

- `add-env-secret` — Add a new Key Vault secret / env var to the project
- `scaffold-backend-domain` — Scaffold a new backend domain entity
- `openapi-proxy-generation` — Run Orval proxy generation workflow
- `query-database` — Query the dev PostgreSQL database using the `psql` CLI

### Verification

```bash
skills ls --json
skills ls -a codex --json
```

The Codex-filtered listing should return the same shared project skills from `.agents/skills/`.

### Updating skills

```bash
skills check    # check for updates
skills update   # update all to latest
```

---

## 2. MCP Servers

MCP (Model Context Protocol) servers give AI agents access to external tools. The committed MCP configuration files are:

| File | Used by | Purpose |
|---|---|---|
| `.vscode/mcp.json` | GitHub Copilot (VS Code) | VS Code agent MCP servers |
| `.mcp.json` | Claude Code (CLI) | Claude Code MCP servers |
| `.codex/config.toml` | Codex | Codex project MCP servers |

### Active servers

The committed configs now share the same core MCP server set:

- `context7`
- `tailwindcss`
- `sequential-thinking`
- `linear`
- `figma`
- `repomix`

Agent-specific notes:

- Claude Code also registers the `memory` MCP server in `.mcp.json`.
- Codex has native memories in addition to the repo MCP config, so it does not need a separate repo-scoped `memory` MCP entry.

### Server inventory

| Server | What it does | Credentials needed |
|---|---|---|
| **Context7** | Live library docs on demand (Expo, Next.js, ASP.NET, xUnit, React Query, etc.). Replaces static skills for library coverage. | None |
| **Tailwind CSS** | Tailwind/NativeWind docs and pattern assistance. | None |
| **Sequential Thinking** | Step-by-step reasoning for complex tasks. | None |
| **Linear** | Issue tracking — create/query issues, cycles, projects. | None (OAuth via browser) |
| **Figma** | Design inspection via the local Figma Dev Mode MCP endpoint. | Figma desktop app with Dev Mode MCP enabled |
| **Repomix** | Repository packing and structured extraction for large-context analysis tasks. | None |
| **Memory** | Persistent memory across conversations for Claude Code via MCP; Codex uses native memories. | None |

**Currently not wired into the committed repo MCP configs:**

- **Firebase** — `SERVICE_ACCOUNT_KEY_PATH`

### StarterKit's own backend MCP servers

Both backend APIs host an MCP server of their own — this is the *product* exposing its
endpoints as tools (see `docs/standards/backend/mcp.md`), distinct from the dev-tooling
servers above:

| Server | Endpoint | Tools |
|---|---|---|
| `starterkit-mobile` | `http(s)://<mobile-api-host>/mcp` | mobile endpoints (check-ins, profile, notifications, …) |
| `starterkit-admin` | `http(s)://<web-api-host>/mcp` | admin-portal endpoints (users, clubs, teams, roles, reports, …) |

Connect any MCP client with Streamable HTTP and the same Supabase (GoTrue) bearer JWT the
REST API uses (`Authorization: Bearer <token>`). Tools are permission-filtered per caller.
These are intentionally **not** in the committed dev configs — tokens are per-user and
short-lived.

### Credential setup (one-time per developer)

Credentials for local deterministic workflow scripts are loaded automatically from `.env.local`. This means:

- **No shell configuration needed** — works in VS Code, Cursor, Claude Code, Codex, any IDE
- **No per-session prompts** — credentials are always loaded when the script runs
- **Zero extra steps per developer** — just create `.env.local` once

1. **Copy the template:** `cp .env.example .env.local` (`.env.local` is gitignored)
2. **Fill in your values** — only the servers you use
3. **That's it** — restart VS Code for MCP config changes; local scripts read `.env.local` at runtime

#### Where to get each key

| Variable | Where to generate |
|---|---|
| `PG*` (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) | Your development PostgreSQL connection details (see the `query-database` skill) |
| `FIGMA_PERSONAL_ACCESS_TOKEN` (disabled) | [Figma → Settings → Account → Personal access tokens](https://www.figma.com/developers/api#access-tokens) |
| `SERVICE_ACCOUNT_KEY_PATH` (disabled) | Firebase Console → Project Settings → Service Accounts → Generate new private key |

### Codex prerequisites

For the Codex MCP config in `.codex/config.toml`:

- `npx` must be available on PATH for the repo MCP servers (`context7`, `tailwindcss`, `sequential-thinking`, `linear`, and `repomix`)
- the repo must be trusted by Codex so project config is merged

### PostgreSQL CLI (`psql`)

Database queries are made via the `psql` CLI tool rather than an MCP server.
Fill in the `PG*` variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) in `.env.local` then use the `query-database` skill to guide agent queries.
For install instructions and usage patterns, see the [`query-database` skill](../.agents/skills/query-database/SKILL.md).

---

## 3. VS Code Extensions

The repo recommends these extensions (`.vscode/extensions.json`):

- **Expo Tools** (`expo.vscode-expo-tools`)
- **Biome** (`biomejs.biome`)

VS Code will prompt you to install them when you open the workspace.

---

## 4. Repo Instruction Files

| File | Agent | Status in this repo |
|---|---|---|
| `AGENTS.md` | Codex | Repo instruction file used by Codex |
| `CLAUDE.md` | Claude Code | Claude-specific instruction file |
| `.github/copilot-instructions.md` | GitHub Copilot | Copilot-specific instruction file |

Codex uses `AGENTS.md` for repo instructions and the shared `.agents/skills/` skill entries for practical skills parity. Claude-specific slash-command prompts live in `.claude/commands/`; Codex does not natively get those commands, but `AGENTS.md` instructs Codex to follow the matching prompt file when the user asks for the equivalent `/spec:*` workflow.
The canonical shared workflow prompts now live in `.agents/commands/`; `.claude/commands/` and `.github/prompts/` are wrappers around that shared layer where the host product supports custom slash commands.

## 5. Native Browser Tools (GitHub Copilot)

GitHub Copilot agent mode has a set of native browser interaction tools built directly into VS Code — **no MCP server or Playwright installation required**.

These tools give the agent (and by extension, you) full control over VS Code's embedded Simple Browser, and they work automatically in any Copilot agent session.

### Built-in tools

| Tool | What it does |
|---|---|
| `open_browser_page` | Opens a URL in VS Code's embedded Simple Browser |
| `navigate_page` | Navigates the open browser to a new URL |
| `screenshot_page` | Captures a screenshot of the current page |
| `read_page` | Returns an accessibility snapshot (DOM structure) — preferred over screenshot for click targeting |
| `click_element` | Clicks an element identified by accessibility role/label |
| `type_in_page` | Types text into the focused or specified input |
| `hover_element` | Hovers an element |
| `drag_element` | Drags one element to another |
| `handle_dialog` | Accepts or dismisses an open `alert`/`confirm`/`prompt` dialog |
| `run_playwright_code` | Runs arbitrary Playwright JS against the open page — use for complex interactions |

### When to use these vs. the `e2e/` Playwright suite

| Scenario | Use |
|---|---|
| Agent exploring your locally running app to debug a visual issue | Native browser tools |
| Agent helping you write or iterate on a UI component | Native browser tools + Send elements to chat |
| Writing automated regression tests that run in CI | `e2e/playwright/` suite |
| Validating a mobile flow | `e2e/maestro/` suite |

The native tools are conversational — they run once, in the moment. They are **not** a replacement for the committed `e2e/` test suite, which gates CI.

### VS Code 1.100+ — Send elements to chat

VS Code 1.100 (April 2025) added an experimental complement to these tools: **"Select and attach UI elements to chat"** (`chat.sendElementsToChat.enabled`).

- Open your locally hosted site in the built-in Simple Browser
- Click any rendered element to attach its screenshot + HTML + CSS directly to the agent's chat context
- Also available in the **Live Preview** extension (VS Code 1.101+)

This makes it easy to ask "why does this button look misaligned?" or "fix the layout of this card" while pointing at the exact element in question, without copy-pasting markup.

---

## 6. Quick Start Checklist

```text
[ ] npm install -g skills
[ ] Run the 4 skills add commands above
[ ] Verify: `skills ls -a codex --json` includes the expected shared `.agents/skills/` entries
[ ] cp .env.example .env.local — fill in PG* values and any other API keys (see table above)
[ ] Open repo in VS Code — accept recommended extensions
[ ] GitHub Copilot: MCP servers start automatically from .vscode/mcp.json
[ ] GitHub Copilot: credential-bearing MCPs will prompt on first use if .env.local is not loaded
[ ] Claude Code: MCP servers start automatically from .mcp.json
[ ] Codex: uses AGENTS.md plus the shared .agents/skills/ entries installed for the codex agent target
[ ] Codex: project MCP config lives in .codex/config.toml
[ ] Codex: ensure npx is on PATH before expecting MCP servers to start
[ ] Spec workflow: available through all three committed MCP configs
[ ] Linear: authenticates via OAuth in browser on first use
[ ] PostgreSQL: works if .env.local has correct credentials

# Token reduction tooling (Section 8) — run once per developer machine
[ ] RTK: download binary from https://github.com/rtk-ai/rtk/releases/latest
       Windows: rtk-x86_64-pc-windows-msvc.zip → extract rtk.exe → place in ~/bin/
       macOS/Linux: rtk-<arch>-<os>.tar.gz → extract → place in /usr/local/bin/ or ~/bin/
       Then: rtk init -g --auto-patch --hook-only
[ ] OmniSharp (C# LSP): scoop install omnisharp  (or see Section 8 for alternatives)
[ ] Claude Code: restart once after RTK init and OmniSharp install
[ ] Claude Code: /plugins → Marketplaces → claude-code-lsps → install omnisharp
[ ] Claude Code: /plugins → Marketplaces → caveman → install caveman
[ ] tweakcc LSP patch: npx tweakcc --apply --patches "fix-lsp-support"
[ ] Caveman docs compression (one-time): run /caveman-compress on key standards files
       /caveman-compress docs/standards/architecture.md
       /caveman-compress docs/standards/monorepo.md
       /caveman-compress docs/standards/backend/controllers.md
       /caveman-compress docs/standards/backend/repositories.md
       /caveman-compress docs/standards/frontend.md
       Do NOT run on CLAUDE.md — that file is intentionally minimal.
```

---

## 7. Token Reduction Tooling

These tools minimise the tokens consumed each Claude Code session. All are active in this repo.

### 8a. RTK (Rust Token Killer)

RTK intercepts every Bash command via a Claude Code `PreToolUse` hook and rewrites it to a compact, signal-dense equivalent. For example:

| Raw command | RTK equivalent | Saving |
|---|---|---|
| `dotnet test` | `rtk dotnet test` | 80–91% fewer output tokens |
| `dotnet build` | `rtk dotnet build` | ~60% |
| `git status` | `rtk git status` | ~70% |
| `find . -name "*.cs"` | `rtk find . -name "*.cs"` | ~80% |

The hook is already configured in `~/.claude/settings.json`:

```json
"hooks": {
  "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "rtk hook claude" }] }]
}
```

**Per-developer install (one-time):**

```bash
# Windows — download from https://github.com/rtk-ai/rtk/releases/latest
# Extract rtk-x86_64-pc-windows-msvc.zip → place rtk.exe in ~/bin/ (must be on PATH)
rtk init -g --auto-patch --hook-only   # registers the hook; already present if settings.json is synced

# macOS/Linux
# Extract rtk-<arch>-<os>.tar.gz → place rtk in /usr/local/bin/
rtk init -g --auto-patch --hook-only
```

**Usage — standalone RTK commands** (use in Claude Code sessions for maximum savings):

```bash
rtk dotnet test     # compact test results — failures only
rtk dotnet build    # compact build output
rtk git status      # condensed status
rtk git log         # condensed log
rtk gain            # show token savings for current session
rtk gain --history  # cumulative savings over all sessions
rtk discover        # list all available rtk sub-commands
```

Reference card at `~/.claude/RTK.md`.

---

### 8b. `.claudeignore`

The `.claudeignore` file (gitignore syntax) at the repo root tells Claude Code which files to never read or index. It is already committed.

**What is excluded:**

- `node_modules/`, `dist/`, `.next/`, `.expo/`, `out/`, `build/`, `coverage/` — build outputs
- `**/bin/`, `**/obj/` — .NET build artifacts
- `package-lock.json`, `yarn.lock`, lock files — too large, no signal
- `**/src/proxy/` — auto-generated Orval output (never hand-edited)
- `**/__snapshots__/` — test snapshot files
- `.env`, `.env.*` (except `.env.example`) — secrets must never enter context
- `.vscode/`, `*.suo`, `*.user` — IDE noise

**What is intentionally NOT excluded (these are still readable by Claude):**

- All of `docs/` including `docs/standards/**` ✅
- `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` ✅
- All source code in `apps/*/src/` ✅
- `.claude/rules/*.md` ✅

> **If you add a new ignore pattern, verify that no standards doc or architecture file is accidentally excluded.**

---

### 8c. Path-Scoped Rules (`.claude/rules/`)

Claude Code automatically injects `.claude/rules/<name>.md` files into context **only when the active file matches the `globs:` frontmatter**. This means backend rules load when you are editing backend code, and mobile rules load when you are editing mobile code — never both at the same time.

| Rule file | Activates when editing | Contents |
|---|---|---|
| `.claude/rules/backend.md` | `apps/backend/**` | Routing table for `docs/standards/backend/` subfiles, scaffold:backend command, RTK dotnet shortcuts, C# invariants |
| `.claude/rules/expo.md` | `apps/expo/**` | Architecture layer rule, scaffold:frontend command, generate:proxy, Tailwind/NativeWind, i18n |
| `.claude/rules/web.md` | `apps/web/**` | Architecture rule, scaffold:frontend command, DevExtreme datasource pattern, Tailwind, i18n |
| `.claude/rules/e2e.md` | `e2e/**` | POM pattern reminder, CRUD pattern, no waitForTimeout |

These files add context deterministically — they never remove access to any docs file.

---

### 8d. Language Server Protocol (LSP) Plugins

Claude Code has native LSP support that gives it real-time type information, hover docs, go-to-definition, and diagnostics without reading raw source files. This reduces the amount of context Claude needs to load to understand API shapes.

**Active LSPs in this project:**

| LSP | Plugin | Language | Status |
|---|---|---|---|
| TypeScript | `typescript-lsp@claude-plugins-official` | TypeScript/TSX | ✅ Active |
| OmniSharp | `omnisharp@claude-code-lsps` | C# / .NET | ✅ Active (via scoop) |

**OmniSharp install (one-time per developer):**

```bash
scoop install omnisharp    # Windows (preferred)
# or: dotnet tool install -g omnisharp --version 1.39.15
# or: download from https://github.com/OmniSharp/omnisharp-roslyn/releases
```

**Activate in Claude Code:**

```text
/plugins → Marketplaces → claude-code-lsps → install omnisharp
```

**tweakcc patch (optional — improves LSP reliability):**

The Claude Code native binary has a known bug where LSP hover data is sometimes dropped. Apply the patch once per Claude Code version upgrade:

```bash
npx tweakcc --apply --patches "fix-lsp-support"
```

> Find the Claude Code binary at: `%LOCALAPPDATA%\Claude\app-<version>\claude.exe` (Windows)
> or `/Applications/Claude.app/Contents/MacOS/Claude` (macOS)

---

### 8e. Caveman Compression Plugin

Caveman (`caveman@caveman`) is a Claude Code plugin that compresses markdown files into a terse, token-efficient form (~46% smaller per load) while preserving all meaning. It is most useful for high-frequency standards docs that are loaded often.

**Activate in Claude Code:**

```text
/plugins → Marketplaces → caveman → install caveman
```

**One-time docs compression** (run after first Caveman install):

```text
/caveman-compress docs/standards/architecture.md
/caveman-compress docs/standards/monorepo.md
/caveman-compress docs/standards/backend/controllers.md
/caveman-compress docs/standards/backend/repositories.md
/caveman-compress docs/standards/frontend.md
```

> **Do NOT run `/caveman-compress` on `CLAUDE.md`** — that file is intentionally minimal and uses selective loading. Compressing it would save almost nothing while making it harder to maintain.

**Real-world savings:** 4–21% per session (compressed files load faster; uncompressed output tokens unchanged). Most benefit on sessions that load many standards docs.

---

## 9. Codegen Scripts

Deterministic scaffold scripts generate the repetitive boilerplate so AI sessions only need to fill in domain logic — not read the full folder conventions from scratch.

### 9a. Backend scaffold

```bash
npm run scaffold:backend -- --module <Module> --entity <Entity>
# Add --tenant for company-scoped entities
# Add --api web or --api both if WebApi controller is also needed
# Add --dry-run to preview without writing files
```

**Example:**

```bash
npm run scaffold:backend -- --module Rewards --entity Reward
npm run scaffold:backend -- --module Billing --entity Invoice --tenant --api both
```

**Generates 20 files:**

- `StarterKit.Data/<Module>/Models/<Entity>Entity.cs` (with `IAuditable`, `ISoftDeletable`, `IConcurrent`)
- `StarterKit.Data/<Module>/Configurations/<Entity>EntityConfiguration.cs`
- `StarterKit.Data/<Module>/Interfaces/Repositories/I<Entity>Repository.cs`
- `StarterKit.Data/<Module>/Repositories/<Entity>Repository.cs`
- `StarterKit.Core/<Module>/Interfaces/Services/I<Entity>Service.cs`
- `StarterKit.Core/<Module>/Services/<Entity>Service.cs`
- `StarterKit.Core/<Module>/DTOs/<Entity>RequestDto.cs` + `<Entity>ResponseDto.cs`
- `StarterKit.Core/<Module>/Mappers/<Entity>Mapper.cs` (Mapperly)
- `StarterKit.MobileApi/<Module>/Interfaces/I<Entities>Controller.cs`
- `StarterKit.MobileApi/<Module>/<Entities>Controller.cs`
- `tests/StarterKit.Core.Tests/<Module>/Services/<Entity>ServiceTests.cs`
- `tests/StarterKit.Data.Tests/<Module>/Repositories/<Entity>RepositoryTests.cs`
- `tests/StarterKit.MobileApi.Tests/<Module>/Controllers/<Entities>ControllerTests.cs`

> Script source: `tools/scaffold-backend-feature.mjs`

### 9b. Frontend scaffold

```bash
npm run scaffold:frontend -- --feature <kebab-name> --app expo|web|both
# Add --dry-run to preview without writing files
```

**Example:**

```bash
npm run scaffold:frontend -- --feature rewards --app expo
npm run scaffold:frontend -- --feature game-history --app both
```

**Generates 17 files (expo) / web adds grid store + App Router shell:**

- `src/features/<name>/domain/failures/<name>.failures.ts`
- `src/features/<name>/infrastructure/datasources/<name>-datasource.ts`
- `src/features/<name>/presentation/hooks/use-<name>.ts`
- `src/features/<name>/presentation/screens/<name>-screen.tsx` (expo) / `<name>-page.tsx` (web)
- `src/lib/i18n/locales/en-ZA/<name>.json` (locale stub)
- Web only: `src/features/<name>/infrastructure/datasources/<name>-grid-store.ts`
- Web only: `src/app/(protected)/<name>/page.tsx` (App Router shell)

> Script source: `tools/scaffold-frontend-feature.mjs`

---

## Troubleshooting

**Skills CLI not found** — Run `npm install -g skills` and restart your terminal.

**Codex MCP servers do not start** — Check that `npx` and `uvx` are available on PATH for the environment that launches Codex. In this shell, `npx` was not on PATH until a Visual Studio Node installation was added explicitly.

**Skills already installed (conflict)** — Run `skills remove --all -y` then re-run the install commands.

**Too many files from skills** — Always specify `--agent claude-code github-copilot` or `--agent codex` explicitly to avoid installing for 40+ agents.

**RTK binary not found after install** — Ensure `~/bin/` (Windows) or `/usr/local/bin/` (macOS/Linux) is on your `PATH`. Restart your terminal after adding it. Verify with `rtk --version`.

**RTK hook shows "command not found"** — Run `rtk init -g --auto-patch --hook-only` again. If it says "hook already present," the hook is wired but the binary is missing from PATH (see above).

**OmniSharp LSP not activating** — Verify `omnisharp` is on PATH: `omnisharp --version`. If the binary exists but Claude Code doesn't see it, run the tweakcc patch (`npx tweakcc --apply --patches "fix-lsp-support"`) and restart Claude Code.

**`/caveman-compress` not found** — The plugin needs a restart after install. Close and reopen Claude Code, then try again. If still missing, open `/plugins` and confirm `caveman@caveman` shows as installed.

**Scaffold script fails with "module not found"** — Run from the repo root (`<repo root>`), not from a sub-directory. The scripts use Node.js ES modules. Requires Node.js ≥ 20.

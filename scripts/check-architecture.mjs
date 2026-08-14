#!/usr/bin/env node
/**
 * Architecture enforcer: static analysis of the layering + dependency rules that
 * a formatter/linter can't express. Scans the frontend (apps/web, apps/expo) and
 * backend (apps/backend) source trees and asserts the boundaries documented in
 * docs/standards/. Complements biome.json (which already guards the
 * datasource → raw-apiClient edge) rather than duplicating it.
 *
 * Rules enforced:
 *   [router-shell]     web app/ page.tsx files stay thin routing shells (no state/effect
 *                      hooks, no store imports) — behaviour belongs in a feature screen.
 *   [proxy-access]     the generated proxy SERVICE functions (@/proxy/services/*) may only
 *                      be called from infrastructure/** (datasources) or src/lib/**.
 *                      Proxy MODELS (@/proxy/models — types/enums) are unrestricted.
 *   [cs-namespace]     C# files use file-scoped namespaces (excludes generated Migrations).
 *   [cs-repo-location] repository implementations live only in StarterKit.Data.
 *   [csproj-ref]       StarterKit.Data references no other project; the APIs don't reference Data.
 *   [thin-controller]  API controllers hold no data-access (no DbContext/EF/repository).
 *   [thin-mcp-tool]    MCP tool classes hold no data-access — same altitude as controllers.
 *   [mcp-tool-parity]  every API controller has a sibling Mcp/<X>McpTools.cs tool class
 *                      (docs/standards/backend/mcp.md); exemptions in MCP_EXEMPT_CONTROLLERS.
 *   [raw-color]        no literal hex/rgb() colours in frontend source — colours come from
 *                      the token system (docs/standards/frontend.md § design tokens).
 *                      Brand-mandated logo colours are exempted in RAW_COLOR_EXEMPT.
 *   [jsx-ternary]      no inline JSX ternary — `cond && <X />` when the false branch renders
 *                      nothing, else hoist the choice into a variable above the JSX
 *                      (docs/standards/frontend.md § 366, frontend-mobile.md § 230).
 *   [raw-error-toast]  no `error.message` piped into a user-facing toast/notify — raw
 *                      exception text is untranslated developer English. Map the error to a
 *                      typed Failure with a localeKey and resolve it via getErrorMessage()
 *                      (docs/standards/frontend.md § localization hard law).
 *
 * Pre-existing violations are listed in BASELINE (burn-down list). New violations still
 * fail. To retire a baseline entry, fix the file and delete its line here.
 *
 * Usage: node scripts/check-architecture.mjs   (also: npm run check:architecture)
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
let scanned = 0;

// ─── Baseline: known pre-existing violations to burn down (path::rule) ─────────
// Each line is an accepted debt; new violations of the same rule elsewhere still fail.
const BASELINE = new Set([
  // [router-shell] root page does a client-side auth redirect; move to a server redirect.
  'apps/web/src/app/page.tsx::router-shell',
  // [proxy-access] feature hooks/components call proxy services directly instead of via a
  // datasource. Route each through its feature datasource, then delete the line.
  'apps/web/src/features/audit-log/presentation/hooks/use-audit-log.ts::proxy-access',
  'apps/web/src/features/users/presentation/hooks/use-set-user-active.ts::proxy-access',
  'apps/web/src/features/companies/presentation/hooks/use-company-options.ts::proxy-access',
  'apps/web/src/features/companies/presentation/hooks/use-credit-options.ts::proxy-access',
  'apps/web/src/features/companies/presentation/hooks/use-ai-models.ts::proxy-access',
  'apps/web/src/features/companies/presentation/hooks/use-logo-upload-constraints.ts::proxy-access',
  'apps/web/src/features/auth/presentation/components/portal-role-guard.tsx::proxy-access',
  'apps/web/src/features/workspace/presentation/components/department-selector.tsx::proxy-access',
  'apps/expo/app/(tabs)/_layout.tsx::proxy-access',
  // [thin-controller] these MobileApi controllers inject a repository directly; introduce a
  // StarterKit.Core service and delegate, then delete the line.
  'apps/backend/src/StarterKit.MobileApi/DeviceTokens/DeviceTokensController.cs::thin-controller',
  'apps/backend/src/StarterKit.MobileApi/PushNotifications/PushNotificationsController.cs::thin-controller',
  // [thin-mcp-tool] these MCP tool classes mirror the baselined controllers above and inject the
  // same repository so behaviour stays identical; fix alongside the controllers, then delete.
  'apps/backend/src/StarterKit.MobileApi/DeviceTokens/Mcp/DeviceTokensMcpTools.cs::thin-mcp-tool',
  'apps/backend/src/StarterKit.MobileApi/PushNotifications/Mcp/PushNotificationsMcpTools.cs::thin-mcp-tool',
  // [jsx-ternary] / [raw-color] in apps/expo/components — surfaced when that directory was
  // added to the scan. It had been omitted, so every rule silently skipped the whole shared UI
  // library. Same burn-down terms as the block below.
  'apps/expo/components/ui/async-state-view.tsx::jsx-ternary',
  'apps/expo/components/ui/avatar.tsx::jsx-ternary',
  'apps/expo/components/ui/button.tsx::jsx-ternary',
  'apps/expo/components/ui/donut-stat.tsx::jsx-ternary',
  'apps/expo/components/ui/image-with-fallback.tsx::jsx-ternary',
  'apps/expo/components/ui/input.tsx::jsx-ternary',
  'apps/expo/components/ui/interstitial-splash.tsx::jsx-ternary',
  'apps/expo/components/ui/liquid-glass-tab-layout.tsx::jsx-ternary',
  'apps/expo/components/ui/streak-day-block.tsx::jsx-ternary',
  'apps/expo/components/ui/streak-day-block.tsx::raw-color',
  // [jsx-ternary] pre-existing inline JSX ternaries, recorded when the rule went live so NEW
  // code is guarded while these burn down. Fix a file (hoist the choice into a variable, or use
  // `cond && <X />` where the false branch renders nothing), then delete its line.
  'apps/expo/src/features/auth/presentation/components/auth-screen-layout.tsx::jsx-ternary',
  'apps/expo/src/features/auth/presentation/components/password-rules-checklist.tsx::jsx-ternary',
  'apps/expo/src/features/auth/presentation/components/social-sign-in-button.tsx::jsx-ternary',
  'apps/expo/src/features/auth/presentation/screens/forgot-password-screen.tsx::jsx-ternary',
  'apps/expo/src/features/auth/presentation/screens/login-screen.tsx::jsx-ternary',
  'apps/expo/src/features/auth/presentation/screens/setup-account-screen.tsx::jsx-ternary',
  'apps/expo/src/features/notifications/presentation/screens/notifications-screen.tsx::jsx-ternary',
  'apps/expo/src/features/profile/presentation/screens/profile-screen.tsx::jsx-ternary',
  'apps/expo/src/features/stats-import/presentation/components/import-outcome-group.tsx::jsx-ternary',
  'apps/expo/src/features/stats-import/presentation/components/matched-players-disclosure.tsx::jsx-ternary',
  'apps/web/src/components/ui/accordion-grid.tsx::jsx-ternary',
  'apps/web/src/components/ui/action-menu.tsx::jsx-ternary',
  'apps/web/src/components/ui/button.tsx::jsx-ternary',
  'apps/web/src/components/ui/collapsible-action-row.tsx::jsx-ternary',
  'apps/web/src/components/ui/collapsible-section.tsx::jsx-ternary',
  'apps/web/src/components/ui/cover-image-banner.tsx::jsx-ternary',
  'apps/web/src/components/ui/cover-image-picker.tsx::jsx-ternary',
  'apps/web/src/components/ui/drop-zone.tsx::jsx-ternary',
  'apps/web/src/components/ui/entity-data-grid.tsx::jsx-ternary',
  'apps/web/src/components/ui/mini-trend-chart.tsx::jsx-ternary',
  'apps/web/src/components/ui/nav-group.tsx::jsx-ternary',
  'apps/web/src/components/ui/new-button.tsx::jsx-ternary',
  'apps/web/src/components/ui/sidebar-nav.tsx::jsx-ternary',
  'apps/web/src/features/audit-log/presentation/pages/audit-logs-page.tsx::jsx-ternary',
  'apps/web/src/features/auth/presentation/components/password-field.tsx::jsx-ternary',
  'apps/web/src/features/auth/presentation/pages/forgot-password-page.tsx::jsx-ternary',
  'apps/web/src/features/clubs/presentation/components/club-drawer.tsx::jsx-ternary',
  'apps/web/src/features/clubs/presentation/components/club-form-inline.tsx::jsx-ternary',
  'apps/web/src/features/clubs/presentation/components/inline-logo-picker.tsx::jsx-ternary',
  'apps/web/src/features/clubs/presentation/pages/clubs-page.tsx::jsx-ternary',
  'apps/web/src/features/roles/presentation/components/role-permissions-editor.tsx::jsx-ternary',
  'apps/web/src/features/roles/presentation/components/roles-view.tsx::jsx-ternary',
  'apps/web/src/features/users/presentation/components/change-password-drawer.tsx::jsx-ternary',
  'apps/web/src/features/users/presentation/components/user-detail-panel.tsx::jsx-ternary',
  'apps/web/src/features/users/presentation/components/user-grid-toolbar.tsx::jsx-ternary',
  'apps/web/src/features/users/presentation/pages/setup-account-page.tsx::jsx-ternary',
  'apps/web/src/features/workspace/presentation/components/workspace-switcher.tsx::jsx-ternary',
  // [raw-error-toast] shows error.message in a notify() toast; map to a typed Failure with a
  // localeKey and resolve via getErrorMessage(), then delete the line.
  'apps/web/src/features/users/presentation/components/user-drawer.tsx::raw-error-toast',
]);

// ─── Raw-colour exemptions (permanent, not burn-down) ──────────────────────────
// Third-party sign-in buttons must render the provider's brand marks in the exact colours
// those brands mandate (Google/Microsoft/Apple identity guidelines). These are the only
// legitimate hardcoded colours in frontend source; everything else uses the token system.
const RAW_COLOR_EXEMPT = new Set([
  'apps/expo/src/features/auth/presentation/components/apple-sign-in-button.tsx',
  'apps/expo/src/features/auth/presentation/components/google-sign-in-button.tsx',
  'apps/expo/src/features/auth/presentation/components/microsoft-sign-in-button.tsx',
  'apps/web/src/components/ui/brand-icons.tsx',
  // Derives shades FROM the emotion tokens rather than hardcoding a colour: it emits rgb()
  // strings computed from whatever token it is handed, so there is no literal to move.
  'apps/expo/src/features/check-ins/presentation/utils/emotion-ink.ts',
  // Same shape as emotion-ink.ts above: blends alpha into whichever token-sourced hex it is
  // handed (the breathing rosette's petal gradient stops) — no literal colour lives here.
  'apps/expo/src/features/skills/presentation/utils/rosette-color.ts',
]);

// ─── MCP parity exemptions (docs/standards/backend/mcp.md § Excluded from MCP) ─
// Dev-only bootstrap controllers and anonymous one-time-token flows get no MCP tools.
const MCP_EXEMPT_CONTROLLERS = new Set([
  'apps/backend/src/StarterKit.MobileApi/Dev/DevBootstrapController.cs',
  'apps/backend/src/StarterKit.MobileApi/Users/UsersSetupController.cs',
  'apps/backend/src/StarterKit.WebApi/Dev/DevBootstrapController.cs',
  'apps/backend/src/StarterKit.WebApi/Users/UsersSetupController.cs',
  // Both actions are a multipart file upload (preview) and its inseparable follow-up (confirm) —
  // same exclusion as bulk-upload preview/confirm.
  'apps/backend/src/StarterKit.MobileApi/Stats/StatsController.cs',
]);

function fail(file, rule, message) {
  if (BASELINE.has(`${file}::${rule}`)) return;
  failures.push(`${file} [${rule}]: ${message}`);
}

// ─── File walking ──────────────────────────────────────────────────────────────
const SKIP_DIR = new Set(['node_modules', 'dist', '.next', '.expo', 'coverage', 'bin', 'obj', 'proxy']);

async function walk(relativeDir, predicate, out = []) {
  let entries;
  try {
    entries = await readdir(path.join(root, relativeDir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) continue;
      await walk(rel, predicate, out);
    } else if (predicate(entry.name, rel)) {
      out.push(rel);
    }
  }
  return out;
}

const isSourceTs = (name) =>
  /\.(?:ts|tsx)$/.test(name) &&
  !/\.d\.ts$/.test(name) &&
  !/\.(?:test|spec)\.(?:ts|tsx)$/.test(name);

const IMPORT_RE = /(?:from\s+|import\s*\(|import\s+|export\s+[^;]*?\bfrom\s+)["']([^"']+)["']/g;
const importsOf = (content) => [...content.matchAll(IMPORT_RE)].map((m) => m[1]);

// ─── Frontend checks ─────────────────────────────────────────────────────────
function checkRouterShell(file, content) {
  // Web App Router shells only: app/**/page.tsx. Expo route files legitimately define
  // screens inline, so the thin-shell rule does not apply there.
  if (!/^apps\/web\/src\/app\/.*\/page\.tsx$/.test(file) && file !== 'apps/web/src/app/page.tsx') {
    return;
  }
  if (/\buse(?:State|Effect|LayoutEffect|Reducer)\s*\(/.test(content)) {
    fail(file, 'router-shell', 'App Router page.tsx must be a thin shell — no state/effect hooks; move logic into a feature page/screen.');
    return;
  }
  if (importsOf(content).some((s) => s.startsWith('@store/'))) {
    fail(file, 'router-shell', 'App Router page.tsx must not import stores — compose them inside the feature page.');
  }
}

function checkProxyAccess(file, imports) {
  const usesProxyService = imports.some((s) => s.includes('proxy/services'));
  if (!usesProxyService) return;
  const allowed = file.includes('/infrastructure/') || /^apps\/(?:web|expo)\/src\/lib\//.test(file);
  if (!allowed) {
    fail(file, 'proxy-access', 'proxy service functions (@/proxy/services/*) may only be called from a datasource (infrastructure/**) or src/lib/**; wrap this in a datasource.');
  }
}

/** Strips // line comments and /* block comments so rules only see live code. */
function withoutComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function checkRawColor(file, content) {
  // Token definition files are where literal colours are SUPPOSED to live.
  if (/(?:^|\/)(?:constants\/tokens\.ts|tokens\.ts)$/.test(file)) return;
  if (RAW_COLOR_EXEMPT.has(file)) return;
  const code = withoutComments(content);
  const match = code.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|\brgba?\(/);
  if (match) {
    fail(file, 'raw-color', `literal colour ${JSON.stringify(match[0])} — use the design tokens (constants/tokens.ts / @starterkit/shared tokens); brand logos go in RAW_COLOR_EXEMPT with a reason.`);
  }
}

/**
 * Inline JSX ternaries. Only flags ternaries whose BRANCHES are JSX — a prop-value ternary
 * (`className={a ? 'x' : 'y'}`) is idiomatic and allowed, so matching bare `?` would be
 * useless noise.
 *
 * Three shapes, all of them anchoring on the `{` that opens the JSX expression so a ternary
 * hoisted into a variable before the JSX never matches:
 *   INLINE     `{cond ? <A /> : <B />}`
 *   SAME_LINE  `{cond ? (`  — the brace and the condition share a line
 *   OWN_LINE   `prop={` at end of line, condition and `? (` on the next
 *
 * OWN_LINE was missing until a reviewer caught `stickyTop={\n  session ? (` by hand on
 * 2026-08-04, two weeks after the rule went live. Prettier/biome break a long prop this way
 * on its own, so the shape is not rare — it is what the formatter produces.
 */
function checkJsxTernary(file, content) {
  if (!/\.tsx$/.test(file)) return;
  const code = withoutComments(content);
  // `[^{}\n]*` excludes newlines on purpose. A class of `[^{}]` alone spans lines, so a brace
  // on an earlier line paired with a later `? (` flagged the CORRECT form (a ternary assigned
  // to a variable before the JSX) as a violation. OWN_LINE gets the newline back explicitly,
  // and only one of it, so the pairing stays adjacent rather than reaching across a block.
  const SAME_LINE = new RegExp(String.raw`\{[^{}\n]*\?\s*\(\s*$`, 'm');
  // Anchored on `=\{`, not a bare `\{`: a JSX prop brace always follows `=`, while a bare
  // brace at end of line is usually a function or block body. Without the `=`, the correct
  // hoisted form (`function Foo() {` / newline / `const icon = cond ? (`) matches and the
  // rule flags exactly the pattern it exists to encourage.
  const OWN_LINE = new RegExp(String.raw`=\{[ \t]*\n[ \t]*[^{}\n]*\?\s*\(\s*$`, 'm');
  const INLINE = new RegExp(String.raw`\{[^{}\n]*\?\s*<[A-Za-z]`);
  if (SAME_LINE.test(code) || OWN_LINE.test(code) || INLINE.test(code)) {
    fail(file, 'jsx-ternary', 'inline JSX ternary — use `cond && <X />` when the false branch renders nothing, or assign the choice to a variable before the JSX.');
  }
}

function checkRawErrorToast(file, content) {
  const code = withoutComments(content);
  // toast.error(err.message) / notify(error.message, …): raw exception text is developer
  // English and bypasses i18n. Matches only when .message appears in the call's first line —
  // deliberate: a cheap heuristic that catches the pattern as actually written.
  if (/\b(?:toast\.(?:error|success|info|warning)|notify)\s*\([^)\n]*\.message\b/.test(code)) {
    fail(file, 'raw-error-toast', 'error.message piped into a user-facing toast — map the error to a typed *Failure carrying a localeKey and resolve it with getErrorMessage() instead.');
  }
}

// ─── Backend checks ────────────────────────────────────────────────────────────
function checkCsNamespace(file, content) {
  if (file.includes('/Migrations/')) return; // EF-generated
  // File-scoped is `namespace X;`. Block-scoped `namespace X {` (same or next line) is banned.
  if (/\bnamespace\s+[\w.]+\s*\r?\n?\s*\{/.test(content)) {
    fail(file, 'cs-namespace', 'use a file-scoped namespace (`namespace X;`), not a block-scoped `namespace X { }`.');
  }
}

function checkRepoLocation(file, content) {
  const base = path.basename(file);
  if (!/\w+Repository\.cs$/.test(base) || /^I\w+Repository\.cs$/.test(base)) return;
  if (!/\b(?:class|record)\s+\w+Repository\b/.test(content)) return;
  if (!file.includes('/StarterKit.Data/')) {
    fail(file, 'cs-repo-location', 'repository implementations must live in StarterKit.Data, not here.');
  }
}

function checkThinController(file, content) {
  if (!/\/StarterKit\.(?:Web|Mobile)Api\/.*Controller\.cs$/.test(file)) return;
  if (/^I\w+Controller\.cs$/.test(path.basename(file))) return;
  const smells = [
    ['using Microsoft.EntityFrameworkCore', /using\s+Microsoft\.EntityFrameworkCore/],
    ['AppDbContext', /\bAppDbContext\b/],
    ['DbContext', /\bDbContext\b/],
    ['a repository', /\bI\w+Repository\b/],
  ];
  for (const [label, re] of smells) {
    if (re.test(content)) {
      fail(file, 'thin-controller', `controllers hold no data access — found ${label}; delegate to a StarterKit.Core service.`);
      return;
    }
  }
}

function checkThinMcpTool(file, content) {
  if (!/\/StarterKit\.(?:Web|Mobile)Api\/.*\/Mcp\/\w+McpTools\.cs$/.test(file)) return;
  const smells = [
    ['using Microsoft.EntityFrameworkCore', /using\s+Microsoft\.EntityFrameworkCore/],
    ['AppDbContext', /\bAppDbContext\b/],
    ['DbContext', /\bDbContext\b/],
    ['a repository', /\bI\w+Repository\b/],
  ];
  for (const [label, re] of smells) {
    if (re.test(content)) {
      fail(file, 'thin-mcp-tool', `MCP tools hold no data access — found ${label}; delegate to a StarterKit.Core service.`);
      return;
    }
  }
}

function checkMcpToolParity(csFiles) {
  const fileSet = new Set(csFiles);
  for (const file of csFiles) {
    if (!/\/StarterKit\.(?:Web|Mobile)Api\/[^/]+\/\w+Controller\.cs$/.test(file)) continue;
    if (file.includes('/Interfaces/')) continue;
    if (MCP_EXEMPT_CONTROLLERS.has(file)) continue;
    const dir = file.slice(0, file.lastIndexOf('/'));
    const base = file.slice(file.lastIndexOf('/') + 1);
    const expected = `${dir}/Mcp/${base.replace(/Controller\.cs$/, 'McpTools.cs')}`;
    if (!fileSet.has(expected)) {
      fail(file, 'mcp-tool-parity', `controller has no MCP tool class — create ${expected} (see docs/standards/backend/mcp.md), or add this controller to MCP_EXEMPT_CONTROLLERS with a reason.`);
    }
  }
}

async function checkCsprojReferences() {
  const dataCsproj = await readFile(path.join(root, 'apps/backend/src/StarterKit.Data/StarterKit.Data.csproj'), 'utf8').catch(() => null);
  if (dataCsproj && /<ProjectReference/.test(dataCsproj)) {
    fail('apps/backend/src/StarterKit.Data/StarterKit.Data.csproj', 'csproj-ref', 'StarterKit.Data must not reference other projects (it is the bottom of the dependency graph).');
  }
  for (const api of ['StarterKit.WebApi', 'StarterKit.MobileApi']) {
    const rel = `apps/backend/src/${api}/${api}.csproj`;
    const csproj = await readFile(path.join(root, rel), 'utf8').catch(() => null);
    if (csproj && /<ProjectReference[^>]*StarterKit\.Data/.test(csproj)) {
      fail(rel, 'csproj-ref', `${api} must not reference StarterKit.Data directly — depend on StarterKit.Core.`);
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────
const tsFiles = [
  ...(await walk('apps/web/src', isSourceTs)),
  ...(await walk('apps/expo/app', isSourceTs)),
  ...(await walk('apps/expo/src', isSourceTs)),
  // apps/expo/components holds the whole shared UI library and was missing from this list, so
  // every rule below silently skipped it — a new component there shipped an inline JSX ternary
  // that a reviewer caught by hand, which is exactly what these rules exist to prevent.
  ...(await walk('apps/expo/components', isSourceTs)),
];
for (const file of tsFiles) {
  const content = await readFile(path.join(root, file), 'utf8');
  const imports = importsOf(content);
  scanned++;
  checkRouterShell(file, content);
  checkProxyAccess(file, imports);
  checkRawColor(file, content);
  checkRawErrorToast(file, content);
  checkJsxTernary(file, content);
}

const csFiles = await walk('apps/backend/src', (name) => name.endsWith('.cs'));
for (const file of csFiles) {
  const content = await readFile(path.join(root, file), 'utf8');
  scanned++;
  checkCsNamespace(file, content);
  checkRepoLocation(file, content);
  checkThinController(file, content);
  checkThinMcpTool(file, content);
}
checkMcpToolParity(csFiles);
await checkCsprojReferences();

// ─── Report ────────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`[check-architecture] ${failures.length} violation(s):`);
  for (const failure of failures.sort()) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[check-architecture] passed (${scanned} source files scanned, ${BASELINE.size} baselined).`);

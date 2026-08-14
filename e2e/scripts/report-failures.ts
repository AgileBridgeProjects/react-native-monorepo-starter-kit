/**
 * report-failures.ts — Parse E2E test results and create Linear bug tickets.
 *
 * Reads Playwright JSON results and Maestro JUnit XML, identifies failures,
 * assigns each to whoever last touched the failing spec file (git blame), and
 * creates a Linear issue with the `e2e-regression` + `Bug` labels — skipping
 * any failure that already has a still-open ticket.
 *
 * Environment variables:
 *   LINEAR_API_KEY        — Linear personal API key (required)
 *   GITHUB_RUN_URL        — Full URL to the GitHub Actions run
 *   GITHUB_SHA            — Commit SHA that triggered the run
 *   E2E_BLAME_EMAIL       — Email of whoever authored the change under test. Takes
 *                           precedence over spec-file blame: on the post-merge run
 *                           the breakage came from this person's merge, and the
 *                           failing spec itself may not have changed at all.
 *   E2E_TRIGGER           — Human label for the run context, shown on the ticket
 *                           (e.g. "post-merge to dev", "weekly sweep")
 *   E2E_FALLBACK_ASSIGNEE — Email to assign unblamed failures to
 *                           (default dev@example.com)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// ── Linear constants ─────────────────────────────────────────
const LINEAR_API = 'https://api.linear.app/graphql';
const TEAM_ID = 'c5ea2c7f-e678-484e-972e-4e435cf6afa7';
const BUG_LABEL_ID = '1a92193f-0af5-4f79-844c-2491655ba798';

// Whoever owns unblamed failures — when git blame can't map the failing spec
// to a Linear user, the ticket is assigned here rather than left to rot.
// Overridable via env so it can follow the current on-call/E2E owner.
const FALLBACK_ASSIGNEE_EMAIL = process.env.E2E_FALLBACK_ASSIGNEE ?? 'dev@example.com';

// Whoever authored the change under test, when the caller knows. On the post-merge
// run this is the merge author — a far better owner than whoever last edited the
// spec, because the spec is usually innocent.
const BLAME_EMAIL = process.env.E2E_BLAME_EMAIL?.trim() || null;
const TRIGGER = process.env.E2E_TRIGGER ?? 'scheduled E2E pipeline';

// ── Types ────────────────────────────────────────────────────
interface FailedTest {
  name: string;
  file: string;
  suite: 'playwright' | 'playwright-expo' | 'maestro';
  error: string;
}

// ── Helpers ──────────────────────────────────────────────────

function linearRequest(query: string, variables: Record<string, unknown> = {}) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('LINEAR_API_KEY is not set');

  return fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}

/**
 * Find the git committer email of the most recent commit that touched
 * any of the given paths. Paths are relative to the cwd (e2e/).
 */
function findLastCommitter(paths: string[]): string | null {
  for (const p of paths) {
    if (!p) continue;
    try {
      // execFileSync (no shell) — the path comes from the Playwright JSON, so
      // never interpolate it into a shell command string.
      const email = execFileSync('git', ['log', '-1', '--format=%ae', '--', p], {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      if (email) return email;
    } catch {
      // Path may not exist or no commits touch it
    }
  }
  return null;
}

/**
 * Look for an existing, still-open ticket with the same title so recurring
 * failures don't spawn a duplicate on every scheduled run. Returns the
 * identifier of the open duplicate, or null if none exists.
 */
async function findOpenDuplicate(title: string): Promise<string | null> {
  const result = await linearRequest(
    `query($teamId: String!, $title: String!) {
      issues(
        filter: {
          team: { id: { eq: $teamId } }
          title: { eq: $title }
          state: { type: { nin: ["completed", "canceled"] } }
        }
        first: 1
      ) {
        nodes { identifier }
      }
    }`,
    { teamId: TEAM_ID, title },
  );

  return result?.data?.issues?.nodes?.[0]?.identifier ?? null;
}

/**
 * Resolve a git-committer email to a Linear user ID at runtime — no stale
 * hardcoded map to maintain as the team changes. Returns undefined if the
 * email isn't a Linear member.
 */
async function findUserIdByEmail(email: string | null): Promise<string | undefined> {
  if (!email) return undefined;
  const result = await linearRequest(
    `query($email: String!) {
      users(filter: { email: { eq: $email } }, first: 1) {
        nodes { id }
      }
    }`,
    { email },
  );
  return result?.data?.users?.nodes?.[0]?.id ?? undefined;
}

/**
 * The team's active cycle, so regression tickets land in the current sprint
 * rather than the backlog. Returns undefined between cycles.
 */
async function findActiveCycleId(): Promise<string | undefined> {
  const result = await linearRequest(
    `query($teamId: String!) {
      team(id: $teamId) { activeCycle { id } }
    }`,
    { teamId: TEAM_ID },
  );
  return result?.data?.team?.activeCycle?.id ?? undefined;
}

/**
 * Get or create the `e2e-regression` label on the StarterKit team.
 */
async function ensureRegressionLabel(): Promise<string> {
  const result = await linearRequest(
    `query($teamId: String!) {
      issueLabels(filter: { team: { id: { eq: $teamId } }, name: { eq: "e2e-regression" } }) {
        nodes { id name }
      }
    }`,
    { teamId: TEAM_ID },
  );

  const existing = result?.data?.issueLabels?.nodes?.[0];
  if (existing) return existing.id;

  // Create it
  const create = await linearRequest(
    `mutation($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        issueLabel { id }
      }
    }`,
    {
      input: {
        teamId: TEAM_ID,
        name: 'e2e-regression',
        color: '#e74c3c',
      },
    },
  );

  const id = create?.data?.issueLabelCreate?.issueLabel?.id;
  if (!id) {
    throw new Error('[report] Failed to create e2e-regression label — Linear response had no id');
  }
  return id;
}

// ── Parse Playwright JSON (shared for web + expo) ───────────
function parsePlaywrightResultsAt(
  resultsPath: string,
  _suite: 'playwright' | 'playwright-expo',
): FailedTest[] {
  if (!existsSync(resultsPath)) {
    console.warn('[report] Playwright results.json not found — skipping');
    return [];
  }

  const data = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  const failures: FailedTest[] = [];

  for (const suite of data.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status === 'unexpected' || test.status === 'failed') {
          const errorMessage =
            test.results?.[0]?.error?.message ??
            test.results?.[0]?.errors?.[0]?.message ??
            'Unknown error';

          failures.push({
            name: `${suite.title} > ${spec.title}`,
            file: suite.file ?? 'unknown',
            suite: _suite,
            error: errorMessage.slice(0, 500),
          });
        }
      }
    }
  }

  return failures;
}

// Each CI job writes a job-distinct results file (web-results.json / expo-results.json)
// into e2e/test-results/. The report job downloads both artifacts and runs this script
// with cwd = e2e, so these relative paths resolve to the downloaded files.
function parsePlaywrightResults(): FailedTest[] {
  return parsePlaywrightResultsAt(path.resolve('test-results/web-results.json'), 'playwright');
}

function parsePlaywrightExpoResults(): FailedTest[] {
  return parsePlaywrightResultsAt(
    path.resolve('test-results/expo-results.json'),
    'playwright-expo',
  );
}

// ── Parse Maestro JUnit XML (simple regex — no XML parser needed) ─
function parseMaestroResults(): FailedTest[] {
  const resultsPath = path.resolve('maestro-results.xml');
  if (!existsSync(resultsPath)) {
    console.warn('[report] Maestro results XML not found — skipping');
    return [];
  }

  const xml = readFileSync(resultsPath, 'utf-8');
  const failures: FailedTest[] = [];

  // Match <testcase> elements that contain a <failure> child
  const testcaseRegex =
    /<testcase\s[^>]*name="([^"]*)"[^>]*(?:classname="([^"]*)")?[^>]*>([\s\S]*?)<\/testcase>/g;
  let match = testcaseRegex.exec(xml);

  while (match !== null) {
    const [, name, classname, body] = match;
    if (body.includes('<failure')) {
      const msgMatch = body.match(/message="([^"]*)"/);
      failures.push({
        name: name ?? 'Unknown flow',
        file: classname ?? name ?? 'unknown',
        suite: 'maestro',
        error: (msgMatch?.[1] ?? 'Maestro flow failed').slice(0, 500),
      });
    }
    match = testcaseRegex.exec(xml);
  }

  return failures;
}

// ── Create Linear issue ──────────────────────────────────────

// Stable per-failure title — must match exactly between the de-dupe lookup
// and the create call so recurring failures resolve to the same ticket.
function ticketTitle(failure: FailedTest): string {
  return `[E2E Regression] ${failure.suite}: ${failure.name}`;
}

async function createLinearTicket(
  failure: FailedTest,
  regressionLabelId: string,
  assigneeId: string | undefined,
  cycleId: string | undefined,
) {
  const runUrl = process.env.GITHUB_RUN_URL ?? '';
  const sha = (process.env.GITHUB_SHA ?? '').slice(0, 8);

  const title = ticketTitle(failure);
  const description = `## E2E Test Failure

**Suite:** ${failure.suite}
**Test:** ${failure.name}
**File:** \`${failure.file}\`
**Commit:** \`${sha}\`
${BLAME_EMAIL ? `**Change author:** ${BLAME_EMAIL}\n` : ''}**CI Run:** ${runUrl}

### Error
\`\`\`
${failure.error}
\`\`\`

---
*Auto-created by the E2E pipeline (${TRIGGER}).*`;

  const input: Record<string, unknown> = {
    teamId: TEAM_ID,
    title,
    description,
    priority: 2, // High
    labelIds: [BUG_LABEL_ID, regressionLabelId],
  };

  if (assigneeId) {
    input.assigneeId = assigneeId;
  }
  if (cycleId) {
    input.cycleId = cycleId;
  }

  const result = await linearRequest(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id identifier url }
      }
    }`,
    { input },
  );

  const issue = result?.data?.issueCreate?.issue;
  if (issue) {
    console.log(`[report] Created ${issue.identifier}: ${title} → ${issue.url}`);
  } else {
    console.error(`[report] Failed to create ticket for "${failure.name}"`, JSON.stringify(result));
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const failures = [
    ...parsePlaywrightResults(),
    ...parsePlaywrightExpoResults(),
    ...parseMaestroResults(),
  ];

  if (failures.length === 0) {
    console.log('[report] No failures detected — nothing to report.');
    return;
  }

  console.log(`[report] Found ${failures.length} failure(s). Creating Linear tickets…`);

  const regressionLabelId = await ensureRegressionLabel();
  const cycleId = await findActiveCycleId();
  const fallbackAssigneeId = await findUserIdByEmail(FALLBACK_ASSIGNEE_EMAIL);
  console.log(
    cycleId
      ? `[report] Tickets will be added to the active cycle (${cycleId}).`
      : '[report] No active cycle — tickets will go to the backlog.',
  );

  let created = 0;
  let skipped = 0;

  for (const failure of failures) {
    // Skip if an open ticket for this exact failure already exists — recurring
    // failures on the weekly run shouldn't spawn a duplicate every time.
    const title = ticketTitle(failure);
    const duplicate = await findOpenDuplicate(title);
    if (duplicate) {
      console.log(`[report] Open ticket ${duplicate} already tracks "${failure.name}" — skipping.`);
      skipped++;
      continue;
    }

    // Ownership, in order of usefulness:
    //   1. the author of the change under test (post-merge: the merge author)
    //   2. whoever last touched the failing spec (git blame — the weekly sweep case)
    //   3. the E2E owner, so no regression ticket is ever left unassigned
    const committerEmail = BLAME_EMAIL ?? findLastCommitter([failure.file]);
    let assigneeId = await findUserIdByEmail(committerEmail);
    if (assigneeId) {
      const how = BLAME_EMAIL ? 'author of the change under test' : 'last touched the spec';
      console.log(`[report] Assigning "${failure.name}" to ${committerEmail} (${how})`);
    } else {
      assigneeId = fallbackAssigneeId;
      console.warn(
        `[report] No Linear user for "${committerEmail ?? failure.file}" — ` +
          `assigning to fallback (${FALLBACK_ASSIGNEE_EMAIL})`,
      );
    }

    await createLinearTicket(failure, regressionLabelId, assigneeId, cycleId);
    created++;
  }

  console.log(`[report] Done. Created ${created}, skipped ${skipped} (already open).`);
}

main().catch((err) => {
  console.error('[report] Fatal error:', err);
  process.exit(1);
});

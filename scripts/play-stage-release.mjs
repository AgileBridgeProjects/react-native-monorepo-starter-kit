#!/usr/bin/env node
/**
 * Stage a Google Play production release so that the only human action left is
 * Publishing overview → "Send changes for review".
 *
 * deploy-mobile-prod.yml's `stage-play-release` job runs this after `eas submit` has put the
 * AAB on the internal track. It does what the console flow used to need by hand
 * (Production → Create new release → pick the build → release notes → Next → Save):
 *   1. open an edit
 *   2. confirm the version code is among the app's uploaded bundles
 *   3. put a `completed` release for it on the production track, with the release notes on
 *      every store-listing language
 *   4. validate, then commit the edit with `changesNotSentForReview=true`
 *
 * That last flag is the safety property: the release lands in the Play Console's
 * "Changes not yet sent for review" list and goes nowhere until a human presses the button.
 * This script never commits without it.
 *
 * The service account therefore needs "Release to production" on the app — a change from the
 * pre-go-live "testing tracks only" scoping, documented in
 * docs/deployment/prod-mobile-store-setup.md § Staged store releases.
 *
 * Env:
 *   PLAY_SERVICE_ACCOUNT_PATH — path to the service-account JSON key   (required)
 *   PLAY_PACKAGE_NAME         — e.g. com.example.starterkit             (required)
 *   VERSION_CODE              — versionCode of the uploaded bundle       (required)
 *   RELEASE_NOTES             — release notes text (≤ 500 chars)        (required)
 *   PLAY_TRACK                — track to stage on (default production)
 *   DRY_RUN                   — "true" → validate the edit and delete it instead of committing
 *
 * Usage: node scripts/play-stage-release.mjs
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fail, isDryRun, requestJson, requireEnv, signJwt } from './lib/store-release.mjs';

export const PLAY_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
export const RELEASE_NOTES_LIMIT = 500;

export async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT' },
    payload: { iss: serviceAccount.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    privateKeyPem: serviceAccount.private_key,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`Google OAuth token request failed (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  return json.access_token;
}

/**
 * The track body to PUT. A `completed` release supersedes whatever is on the track, so the
 * releases list is just the new one; anything that was there (a draft, a staged rollout) is
 * reported so the run log says what got replaced.
 */
export function buildTrackUpdate({ track, versionCode, releaseNotes, languages, existingReleases = [] }) {
  const langs = languages.length > 0 ? languages : ['en-US'];
  const replaced = existingReleases.filter((r) => r.status !== 'completed');
  return {
    body: {
      track,
      releases: [
        {
          versionCodes: [String(versionCode)],
          status: 'completed',
          releaseNotes: langs.map((language) => ({ language, text: releaseNotes })),
        },
      ],
    },
    replaced,
  };
}

export function createPlayClient({ accessToken, packageName }) {
  const base = `${PLAY_BASE}/${packageName}`;
  const call = (path, opts = {}) => requestJson(`${base}${path}`, { ...opts, headers: { Authorization: `Bearer ${accessToken}`, ...(opts.headers ?? {}) } });
  return { call };
}

export async function stageRelease(client, { track, versionCode, releaseNotes, dryRun, log = console.log }) {
  const { json: edit } = await client.call('/edits', { method: 'POST', body: {} });
  const editId = edit?.id;
  // Without this, an unexpected response shape sends every later call to /edits/undefined,
  // and the cleanup handler swallows the 404 that follows.
  if (!editId) throw new Error(`Play returned no edit id: ${JSON.stringify(edit).slice(0, 200)}`);
  log(`ℹ️  opened edit ${editId}`);
  try {
    const { json: bundles } = await client.call(`/edits/${editId}/bundles`);
    const known = (bundles?.bundles ?? []).map((b) => String(b.versionCode));
    if (!known.includes(String(versionCode))) {
      throw new Error(
        `versionCode ${versionCode} is not among the app's uploaded bundles (${known.slice(-5).join(', ') || 'none'}). ` +
          'The internal-track submit has not landed — re-run after `eas submit` succeeds.',
      );
    }
    log(`✅ bundle ${versionCode} is uploaded`);

    const { json: listings } = await client.call(`/edits/${editId}/listings`);
    const languages = (listings?.listings ?? []).map((l) => l.language);

    const { json: current } = await client.call(`/edits/${editId}/tracks/${track}`, { allow: [404] });
    const existingReleases = current?.releases ?? [];
    const { body, replaced } = buildTrackUpdate({ track, versionCode, releaseNotes, languages, existingReleases });
    for (const r of replaced) log(`⚠️  replacing existing ${r.status} release on ${track}: ${r.name ?? r.versionCodes?.join(',') ?? '?'}`);

    await client.call(`/edits/${editId}/tracks/${track}`, { method: 'PUT', body });
    log(`✅ ${track} release for ${versionCode} written (${body.releases[0].releaseNotes.length} release-note language(s))`);

    await client.call(`/edits/${editId}:validate`, { method: 'POST' });
    log('✅ edit validated');

    if (dryRun) {
      await client.call(`/edits/${editId}`, { method: 'DELETE' });
      log('🧪 dry-run: edit deleted, nothing committed');
      return { editId, committed: false, languages: body.releases[0].releaseNotes.map((n) => n.language) };
    }

    // changesNotSentForReview is what keeps the release out of review until a human sends it.
    await client.call(`/edits/${editId}:commit?changesNotSentForReview=true`, { method: 'POST' });
    log('✅ edit committed with changesNotSentForReview=true');
    return { editId, committed: true, languages: body.releases[0].releaseNotes.map((n) => n.language) };
  } catch (err) {
    await client.call(`/edits/${editId}`, { method: 'DELETE' }).catch(() => {});
    throw err;
  }
}

export async function main() {
  const keyPath = requireEnv('PLAY_SERVICE_ACCOUNT_PATH', 'path to the service-account JSON');
  const packageName = requireEnv('PLAY_PACKAGE_NAME');
  const versionCode = requireEnv('VERSION_CODE');
  const releaseNotes = requireEnv('RELEASE_NOTES').trim();
  const track = process.env.PLAY_TRACK || 'production';
  const dryRun = isDryRun();

  if (!/^\d+$/.test(versionCode)) fail(`VERSION_CODE must be an integer, got "${versionCode}"`);
  if (!releaseNotes) fail('RELEASE_NOTES must not be blank.');
  if (releaseNotes.length > RELEASE_NOTES_LIMIT) fail(`RELEASE_NOTES exceeds Google Play's ${RELEASE_NOTES_LIMIT}-character limit (${releaseNotes.length}).`);

  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  if (!serviceAccount.client_email || !serviceAccount.private_key) fail(`${keyPath} is not a Google service-account key (client_email/private_key missing)`);

  if (dryRun) console.log('🧪 DRY RUN — the edit will be validated and discarded');
  const accessToken = await getAccessToken(serviceAccount);
  const client = createPlayClient({ accessToken, packageName });
  const result = await stageRelease(client, { track, versionCode, releaseNotes, dryRun });

  console.log('');
  console.log(`🎉 Play ${track} release for versionCode ${versionCode} ${result.committed ? 'staged' : 'validated [dry-run]'}.`);
  console.log(`   Release notes written for: ${result.languages.join(', ')}`);
  console.log('   Next: Play Console → Publishing overview → Send changes for review.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => fail(err.message));
}

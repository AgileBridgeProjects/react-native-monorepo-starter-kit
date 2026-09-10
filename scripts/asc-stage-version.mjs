#!/usr/bin/env node
/**
 * Stage an App Store version in App Store Connect so that the only human action left is
 * "Add for Review" / "Submit for Review".
 *
 * deploy-mobile-prod.yml's `stage-ios-version` job runs this after `eas submit` has put the
 * build in TestFlight. It does what the console flow used to need by hand:
 *   1. wait until App Store Connect has finished processing the uploaded build
 *   2. find or create the App Store version record for the build's marketing version
 *      (reuses a version already in preparation, renaming it if it carries an older string —
 *      ASC allows exactly one version in preparation at a time)
 *   3. attach the build to it
 *   4. write "What's New" on every localization (copying the localizations from the live
 *      version first when ASC has not created them yet)
 *   5. copy the App Review information (demo account, notes, contact) from the live version
 *      when the new version has none — ASC keeps it per version and a missing demo account
 *      blocks submission
 *
 * It NEVER creates a review submission. Submitting is the release decision and stays a human
 * click in App Store Connect.
 *
 * Env:
 *   ASC_API_KEY_ID, ASC_API_KEY_ISSUER_ID — App Store Connect API key (required)
 *   ASC_API_KEY_PATH   — path to the .p8 private key                     (required)
 *   ASC_APP_ID         — numeric App Store Connect app id                 (required)
 *   APP_VERSION        — CFBundleShortVersionString of the build, e.g. 5.2.1 (required)
 *   BUILD_NUMBER       — CFBundleVersion of the build, e.g. 142           (required)
 *   RELEASE_NOTES      — What's New text                                  (required)
 *   ASC_RELEASE_TYPE   — MANUAL | AFTER_APPROVAL (default AFTER_APPROVAL, the ASC UI default)
 *   ASC_WAIT_MINUTES   — how long to wait for build processing (default 45)
 *   DRY_RUN            — "true" → read everything, print the plan, write nothing
 *
 * Usage: node scripts/asc-stage-version.mjs
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fail, isDryRun, requestJson, requireEnv, signJwt, sleep } from './lib/store-release.mjs';

export const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';

/** States in which a version record can still take a new build and new metadata. */
export const EDITABLE_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);

/** The version users are currently downloading — the source for copied metadata. */
export const LIVE_STATES = new Set(['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE']);

const LOCALIZATION_FIELDS = ['locale', 'whatsNew', 'description', 'keywords', 'promotionalText', 'marketingUrl', 'supportUrl'];
const REVIEW_DETAIL_FIELDS = [
  'contactFirstName',
  'contactLastName',
  'contactPhone',
  'contactEmail',
  'demoAccountName',
  'demoAccountPassword',
  'demoAccountRequired',
  'notes',
];

/**
 * Decide what to do with the app's existing version records for `versionString`.
 *   reuse  — a record with that string exists and is still editable
 *   rename — another editable record exists (a leftover 5.2.0 in preparation); ASC allows
 *            only one version in preparation, so it becomes 5.2.1
 *   create — nothing editable exists
 * Throws when the string is already past the point of editing (submitted, in review, live).
 */
export function planVersion(versions, versionString) {
  const same = versions.find((v) => v.attributes.versionString === versionString);
  if (same) {
    const state = same.attributes.appVersionState;
    if (EDITABLE_STATES.has(state)) return { action: 'reuse', version: same };
    throw new Error(
      `App Store version ${versionString} already exists in state ${state} — it cannot take a new build. ` +
        'Remove it from review in App Store Connect, or ship under a higher version (apps/expo/version.json).',
    );
  }
  const editable = versions
    .filter((v) => EDITABLE_STATES.has(v.attributes.appVersionState))
    .sort((a, b) => (b.attributes.createdDate ?? '').localeCompare(a.attributes.createdDate ?? ''));
  if (editable.length > 0) return { action: 'rename', version: editable[0] };
  return { action: 'create' };
}

/** The version whose metadata should seed the new one: the live one, else the newest other record. */
export function chooseSourceVersion(versions, targetId) {
  const others = versions.filter((v) => v.id !== targetId);
  const live = others.find((v) => LIVE_STATES.has(v.attributes.appVersionState));
  if (live) return live;
  return others.sort((a, b) => (b.attributes.createdDate ?? '').localeCompare(a.attributes.createdDate ?? ''))[0] ?? null;
}

export function createAscClient({ keyId, issuerId, privateKeyPem, dryRun = false, log = console.log }) {
  const token = () =>
    signJwt({
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: keyId, typ: 'JWT' },
      payload: { iss: issuerId, iat: Math.floor(Date.now() / 1000) - 30, exp: Math.floor(Date.now() / 1000) + 15 * 60, aud: 'appstoreconnect-v1' },
      privateKeyPem,
    });
  const call = (path, opts = {}) =>
    requestJson(path.startsWith('http') ? path : `${ASC_BASE}${path}`, { ...opts, headers: { Authorization: `Bearer ${token()}`, ...(opts.headers ?? {}) } });
  const write = async (label, path, opts) => {
    if (dryRun) {
      log(`   [dry-run] would ${label}: ${opts.method} ${path}`);
      return { status: 0, json: null };
    }
    const result = await call(path, opts);
    log(`✅ ${label}`);
    return result;
  };
  return { call, write };
}

export async function waitForBuild(client, { appId, appVersion, buildNumber, waitMinutes, pollMs = 60_000, log = console.log }) {
  const deadline = Date.now() + waitMinutes * 60_000;
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[version]': buildNumber,
    'filter[preReleaseVersion.version]': appVersion,
    'fields[builds]': 'version,processingState,expired,uploadedDate',
    limit: '5',
  });
  for (;;) {
    const { json } = await client.call(`/builds?${query}`);
    const build = (json?.data ?? []).find((b) => !b.attributes.expired) ?? json?.data?.[0];
    const state = build?.attributes.processingState;
    if (state === 'VALID') {
      log(`✅ build ${appVersion} (${buildNumber}) processed — id ${build.id}`);
      return build;
    }
    if (state === 'FAILED' || state === 'INVALID') {
      throw new Error(`build ${appVersion} (${buildNumber}) finished processing as ${state} — App Store Connect rejected the binary.`);
    }
    if (Date.now() > deadline) {
      throw new Error(
        `build ${appVersion} (${buildNumber}) is ${state ?? 'not visible'} after ${waitMinutes} min — App Store Connect is still processing it. ` +
          'Re-run this job later; the upload itself succeeded.',
      );
    }
    log(`⏳ build ${appVersion} (${buildNumber}) is ${state ?? 'not visible yet'} — waiting ${Math.round(pollMs / 1000)}s`);
    await sleep(pollMs);
  }
}

export async function listVersions(client, appId) {
  const query = new URLSearchParams({
    'filter[platform]': 'IOS',
    'fields[appStoreVersions]': 'versionString,appVersionState,releaseType,createdDate',
    limit: '50',
  });
  const { json } = await client.call(`/apps/${appId}/appStoreVersions?${query}`);
  return json?.data ?? [];
}

export async function ensureVersion(client, { appId, appVersion, releaseType, log = console.log }) {
  const versions = await listVersions(client, appId);
  const plan = planVersion(versions, appVersion);
  let versionId;
  if (plan.action === 'reuse') {
    versionId = plan.version.id;
    log(`ℹ️  reusing App Store version ${appVersion} (${plan.version.attributes.appVersionState}, id ${versionId})`);
    if (plan.version.attributes.releaseType !== releaseType) {
      await client.write(`set release type to ${releaseType}`, `/appStoreVersions/${versionId}`, {
        method: 'PATCH',
        body: { data: { type: 'appStoreVersions', id: versionId, attributes: { releaseType } } },
      });
    }
  } else if (plan.action === 'rename') {
    versionId = plan.version.id;
    log(`ℹ️  renaming App Store version ${plan.version.attributes.versionString} (${plan.version.attributes.appVersionState}) → ${appVersion}`);
    await client.write(`rename version to ${appVersion}`, `/appStoreVersions/${versionId}`, {
      method: 'PATCH',
      body: { data: { type: 'appStoreVersions', id: versionId, attributes: { versionString: appVersion, releaseType } } },
    });
  } else {
    const { json } = await client.write(`create App Store version ${appVersion}`, '/appStoreVersions', {
      method: 'POST',
      body: {
        data: {
          type: 'appStoreVersions',
          attributes: { platform: 'IOS', versionString: appVersion, releaseType },
          relationships: { app: { data: { type: 'apps', id: appId } } },
        },
      },
    });
    versionId = json?.data?.id ?? null;
  }
  return { versionId, versions };
}

export async function attachBuild(client, versionId, buildId) {
  await client.write(`attach build ${buildId}`, `/appStoreVersions/${versionId}/relationships/build`, {
    method: 'PATCH',
    body: { data: { type: 'builds', id: buildId } },
  });
}

async function listLocalizations(client, versionId) {
  const query = new URLSearchParams({ 'fields[appStoreVersionLocalizations]': LOCALIZATION_FIELDS.join(','), limit: '50' });
  const { json } = await client.call(`/appStoreVersions/${versionId}/appStoreVersionLocalizations?${query}`);
  return json?.data ?? [];
}

/**
 * Write What's New on every localization. ASC normally seeds a new version's localizations
 * from the live one; when it has not, copy them ourselves so the description/keywords a
 * submission needs are not left blank.
 */
export async function writeWhatsNew(client, { versionId, sourceVersionId, releaseNotes, log = console.log }) {
  let localizations = versionId ? await listLocalizations(client, versionId) : [];
  if (localizations.length === 0 && sourceVersionId) {
    const source = await listLocalizations(client, sourceVersionId);
    if (source.length === 0) throw new Error('no localizations on the new version or the live one — nothing to write What\'s New on.');
    log(`ℹ️  new version has no localizations; copying ${source.map((l) => l.attributes.locale).join(', ')} from the live version`);
    for (const loc of source) {
      const { locale, description, keywords, promotionalText, marketingUrl, supportUrl } = loc.attributes;
      await client.write(`create ${locale} localization`, '/appStoreVersionLocalizations', {
        method: 'POST',
        body: {
          data: {
            type: 'appStoreVersionLocalizations',
            attributes: { locale, description, keywords, promotionalText, marketingUrl, supportUrl, whatsNew: releaseNotes },
            relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
          },
        },
      });
    }
    return source.map((l) => l.attributes.locale);
  }
  for (const loc of localizations) {
    await client.write(`set What's New (${loc.attributes.locale})`, `/appStoreVersionLocalizations/${loc.id}`, {
      method: 'PATCH',
      body: { data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { whatsNew: releaseNotes } } },
    });
  }
  return localizations.map((l) => l.attributes.locale);
}

async function getReviewDetail(client, versionId) {
  const query = new URLSearchParams({ 'fields[appStoreReviewDetails]': REVIEW_DETAIL_FIELDS.join(',') });
  const { status, json } = await client.call(`/appStoreVersions/${versionId}/appStoreReviewDetail?${query}`, { allow: [404] });
  return status === 404 ? null : (json?.data ?? null);
}

/** Copy the demo account + reviewer notes forward when ASC has not. */
export async function ensureReviewDetail(client, { versionId, sourceVersionId, log = console.log }) {
  if (!versionId) {
    log('   [dry-run] would copy App Review information from the live version if the new one has none');
    return 'unknown';
  }
  const existing = await getReviewDetail(client, versionId);
  if (existing) {
    log(`ℹ️  App Review information already present (demo account: ${existing.attributes.demoAccountName ? 'set' : 'none'})`);
    return 'present';
  }
  if (!sourceVersionId) {
    log('⚠️  no App Review information on the new version and no live version to copy from — fill it in App Store Connect before submitting');
    return 'missing';
  }
  const source = await getReviewDetail(client, sourceVersionId);
  if (!source) {
    log('⚠️  no App Review information on the new version or the live one — fill it in App Store Connect before submitting');
    return 'missing';
  }
  const attributes = Object.fromEntries(REVIEW_DETAIL_FIELDS.map((f) => [f, source.attributes[f]]).filter(([, v]) => v !== null && v !== undefined));
  await client.write('copy App Review information from the live version', '/appStoreReviewDetails', {
    method: 'POST',
    body: {
      data: {
        type: 'appStoreReviewDetails',
        attributes,
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
      },
    },
  });
  return 'copied';
}

export async function main() {
  const keyId = requireEnv('ASC_API_KEY_ID');
  const issuerId = requireEnv('ASC_API_KEY_ISSUER_ID');
  const keyPath = requireEnv('ASC_API_KEY_PATH', 'path to the decoded .p8 key');
  const appId = requireEnv('ASC_APP_ID');
  const appVersion = requireEnv('APP_VERSION', 'the build\'s CFBundleShortVersionString, e.g. 5.2.1');
  const buildNumber = requireEnv('BUILD_NUMBER', 'the build\'s CFBundleVersion');
  const releaseNotes = requireEnv('RELEASE_NOTES').trim();
  const releaseType = process.env.ASC_RELEASE_TYPE || 'AFTER_APPROVAL';
  const waitMinutes = Number(process.env.ASC_WAIT_MINUTES || 45);
  const dryRun = isDryRun();

  if (!releaseNotes) fail('RELEASE_NOTES must not be blank — App Store Connect refuses a submission with empty What\'s New.');
  if (releaseNotes.length > 4000) fail('RELEASE_NOTES exceeds App Store Connect\'s 4000-character limit.');
  if (!['MANUAL', 'AFTER_APPROVAL'].includes(releaseType)) fail(`ASC_RELEASE_TYPE must be MANUAL or AFTER_APPROVAL, got "${releaseType}"`);

  const client = createAscClient({ keyId, issuerId, privateKeyPem: readFileSync(keyPath, 'utf8'), dryRun });
  if (dryRun) console.log('🧪 DRY RUN — nothing will be written to App Store Connect');

  const build = await waitForBuild(client, { appId, appVersion, buildNumber, waitMinutes });
  const { versionId, versions } = await ensureVersion(client, { appId, appVersion, releaseType });
  const source = chooseSourceVersion(versions, versionId);
  if (versionId) await attachBuild(client, versionId, build.id);
  else console.log(`   [dry-run] would attach build ${build.id} to the new version`);
  const locales = await writeWhatsNew(client, { versionId, sourceVersionId: source?.id ?? null, releaseNotes });
  const review = await ensureReviewDetail(client, { versionId, sourceVersionId: source?.id ?? null });

  console.log('');
  console.log(`🎉 App Store version ${appVersion} (${buildNumber}) staged${dryRun ? ' [dry-run]' : ''}.`);
  console.log(`   What's New written for: ${locales.join(', ') || '(none)'}`);
  console.log(`   App Review information: ${review}`);
  console.log(`   Release type: ${releaseType}`);
  console.log('   Next: App Store Connect → your app → this version → Add for Review → Submit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => fail(err.message));
}

// Unit tests for the store-release staging scripts. Run with `npm run test:scripts`.
// Everything network-facing is exercised through a fake client so no store is touched.

import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  chooseSourceVersion,
  ensureReviewDetail,
  ensureVersion,
  planVersion,
  waitForBuild,
  writeWhatsNew,
} from './asc-stage-version.mjs';
import { agcLanguageEntries, agcLanguageInfoBody, base64url, signJwt } from './lib/store-release.mjs';
import { buildTrackUpdate, stageRelease } from './play-stage-release.mjs';

const decode = (segment) => JSON.parse(Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

describe('signJwt', () => {
  it('produces an ES256 JWS App Store Connect will verify (raw r||s signature)', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const jwt = signJwt({
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: 'KEY1', typ: 'JWT' },
      payload: { iss: 'issuer', aud: 'appstoreconnect-v1', exp: 1 },
      privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    });
    const [h, p, s] = jwt.split('.');
    assert.deepEqual(decode(h), { alg: 'ES256', kid: 'KEY1', typ: 'JWT' });
    assert.equal(decode(p).aud, 'appstoreconnect-v1');
    const sig = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    assert.equal(sig.length, 64, 'ES256 JOSE signatures are exactly 64 bytes');
    assert.ok(verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, sig));
  });

  it('produces an RS256 JWS Google OAuth will verify', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwt = signJwt({
      algorithm: 'RS256',
      header: { alg: 'RS256', typ: 'JWT' },
      payload: { iss: 'sa@example.iam.gserviceaccount.com', scope: 'x', aud: 'https://oauth2.googleapis.com/token' },
      privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    });
    const [h, p, s] = jwt.split('.');
    const sig = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    assert.ok(verify('sha256', Buffer.from(`${h}.${p}`), publicKey, sig));
  });

  it('base64url strips padding and uses the URL alphabet', () => {
    assert.equal(base64url(Buffer.from([0xfb, 0xff, 0xbf])), '-_-_');
  });
});

const v = (id, versionString, appVersionState, createdDate = '2026-01-01', releaseType = 'AFTER_APPROVAL') => ({
  id,
  attributes: { versionString, appVersionState, createdDate, releaseType },
});

describe('planVersion', () => {
  it('reuses the record when the version string is already in preparation', () => {
    const plan = planVersion([v('a', '5.2.1', 'PREPARE_FOR_SUBMISSION'), v('b', '5.2.0', 'READY_FOR_DISTRIBUTION')], '5.2.1');
    assert.equal(plan.action, 'reuse');
    assert.equal(plan.version.id, 'a');
  });

  it('renames the newest editable leftover instead of creating a second version in preparation', () => {
    const plan = planVersion(
      [v('old', '5.1.9', 'DEVELOPER_REJECTED', '2026-08-01'), v('newer', '5.2.0', 'PREPARE_FOR_SUBMISSION', '2026-09-01'), v('live', '5.1.0', 'READY_FOR_DISTRIBUTION')],
      '5.2.1',
    );
    assert.equal(plan.action, 'rename');
    assert.equal(plan.version.id, 'newer');
  });

  it('creates when nothing is editable', () => {
    assert.equal(planVersion([v('live', '5.2.0', 'READY_FOR_DISTRIBUTION')], '5.2.1').action, 'create');
    assert.equal(planVersion([], '5.2.1').action, 'create');
  });

  it('refuses to touch a version that is already submitted or live', () => {
    for (const state of ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'READY_FOR_DISTRIBUTION']) {
      assert.throws(() => planVersion([v('x', '5.2.1', state)], '5.2.1'), new RegExp(`already exists in state ${state}`));
    }
  });
});

describe('chooseSourceVersion', () => {
  it('prefers the live version and never the target itself', () => {
    const versions = [v('t', '5.2.1', 'PREPARE_FOR_SUBMISSION', '2026-09-09'), v('l', '5.2.0', 'READY_FOR_DISTRIBUTION', '2026-08-01'), v('o', '5.1.0', 'REPLACED_WITH_NEW_VERSION', '2026-07-01')];
    assert.equal(chooseSourceVersion(versions, 't').id, 'l');
  });

  it('falls back to the newest other record, or null', () => {
    assert.equal(chooseSourceVersion([v('t', '5.2.1', 'PREPARE_FOR_SUBMISSION', '2026-09-09'), v('o', '5.1.0', 'REPLACED_WITH_NEW_VERSION', '2026-07-01')], 't').id, 'o');
    assert.equal(chooseSourceVersion([v('t', '5.2.1', 'PREPARE_FOR_SUBMISSION')], 't'), null);
  });
});

/** Fake ASC client: `responses` maps "METHOD path-prefix" → payload; every call is recorded. */
function fakeAsc(responses, { dryRun = false } = {}) {
  const calls = [];
  const lookup = (method, path) => {
    const key = Object.keys(responses).find((k) => {
      const [m, prefix] = k.split(' ');
      return m === method && path.startsWith(prefix);
    });
    const value = key ? responses[key] : undefined;
    return typeof value === 'function' ? value() : value;
  };
  const call = async (path, opts = {}) => {
    const method = opts.method ?? 'GET';
    calls.push({ method, path, body: opts.body });
    const hit = lookup(method, path);
    if (hit === undefined) throw new Error(`unexpected ${method} ${path}`);
    return hit;
  };
  const write = async (label, path, opts) => {
    if (dryRun) {
      calls.push({ method: `DRY ${opts.method}`, path, body: opts.body });
      return { status: 0, json: null };
    }
    return call(path, opts);
  };
  return { call, write, calls };
}

describe('waitForBuild', () => {
  it('polls until App Store Connect reports the build VALID', async () => {
    const states = ['PROCESSING', 'PROCESSING', 'VALID'];
    const client = fakeAsc({ 'GET /builds': () => ({ status: 200, json: { data: [{ id: 'b1', attributes: { processingState: states.shift(), expired: false } }] } }) });
    const build = await waitForBuild(client, { appId: '1', appVersion: '5.2.1', buildNumber: '142', waitMinutes: 1, pollMs: 1, log: () => {} });
    assert.equal(build.id, 'b1');
    assert.equal(client.calls.length, 3);
    assert.match(client.calls[0].path, /filter%5Bversion%5D=142/);
    assert.match(client.calls[0].path, /filter%5BpreReleaseVersion\.version%5D=5\.2\.1/);
  });

  it('fails fast when processing ends in FAILED or INVALID', async () => {
    const client = fakeAsc({ 'GET /builds': { status: 200, json: { data: [{ id: 'b1', attributes: { processingState: 'INVALID' } }] } } });
    await assert.rejects(waitForBuild(client, { appId: '1', appVersion: '5.2.1', buildNumber: '142', waitMinutes: 1, pollMs: 1, log: () => {} }), /INVALID/);
  });

  it('gives up after the deadline with a re-run hint', async () => {
    const client = fakeAsc({ 'GET /builds': { status: 200, json: { data: [] } } });
    await assert.rejects(waitForBuild(client, { appId: '1', appVersion: '5.2.1', buildNumber: '142', waitMinutes: 0, pollMs: 1, log: () => {} }), /Re-run this job later/);
  });
});

describe('ensureVersion', () => {
  it('creates a version with the requested release type when none is editable', async () => {
    const client = fakeAsc({
      'GET /apps/1/appStoreVersions': { status: 200, json: { data: [v('live', '5.2.0', 'READY_FOR_DISTRIBUTION')] } },
      'POST /appStoreVersions': { status: 201, json: { data: { id: 'new' } } },
    });
    const { versionId } = await ensureVersion(client, { appId: '1', appVersion: '5.2.1', releaseType: 'AFTER_APPROVAL', log: () => {} });
    assert.equal(versionId, 'new');
    const post = client.calls.find((c) => c.method === 'POST');
    assert.deepEqual(post.body.data.attributes, { platform: 'IOS', versionString: '5.2.1', releaseType: 'AFTER_APPROVAL' });
    assert.equal(post.body.data.relationships.app.data.id, '1');
  });

  it('renames a leftover version in preparation rather than creating a second one', async () => {
    const client = fakeAsc({
      'GET /apps/1/appStoreVersions': { status: 200, json: { data: [v('left', '5.2.0', 'PREPARE_FOR_SUBMISSION')] } },
      'PATCH /appStoreVersions/left': { status: 200, json: {} },
    });
    const { versionId } = await ensureVersion(client, { appId: '1', appVersion: '5.2.1', releaseType: 'AFTER_APPROVAL', log: () => {} });
    assert.equal(versionId, 'left');
    assert.equal(client.calls.filter((c) => c.method === 'POST').length, 0);
    assert.equal(client.calls.find((c) => c.method === 'PATCH').body.data.attributes.versionString, '5.2.1');
  });

  it('writes nothing in dry-run and reports no version id for a would-be creation', async () => {
    const client = fakeAsc({ 'GET /apps/1/appStoreVersions': { status: 200, json: { data: [] } } }, { dryRun: true });
    const { versionId } = await ensureVersion(client, { appId: '1', appVersion: '5.2.1', releaseType: 'AFTER_APPROVAL', log: () => {} });
    assert.equal(versionId, null);
    assert.ok(client.calls.every((c) => c.method === 'GET' || c.method.startsWith('DRY ')));
  });
});

describe('writeWhatsNew', () => {
  const loc = (id, locale, extra = {}) => ({ id, attributes: { locale, description: 'desc', keywords: 'k', promotionalText: null, marketingUrl: null, supportUrl: 'https://s', ...extra } });

  it('patches What\'s New on every existing localization', async () => {
    const client = fakeAsc({
      'GET /appStoreVersions/new/appStoreVersionLocalizations': { status: 200, json: { data: [loc('l1', 'en-US'), loc('l2', 'en-GB')] } },
      'PATCH /appStoreVersionLocalizations/': { status: 200, json: {} },
    });
    const locales = await writeWhatsNew(client, { versionId: 'new', sourceVersionId: 'live', releaseNotes: 'Gary!', log: () => {} });
    assert.deepEqual(locales, ['en-US', 'en-GB']);
    const patches = client.calls.filter((c) => c.method === 'PATCH');
    assert.equal(patches.length, 2);
    assert.deepEqual(patches[0].body.data.attributes, { whatsNew: 'Gary!' });
  });

  it('copies the live version\'s localizations when the new version has none', async () => {
    const client = fakeAsc({
      'GET /appStoreVersions/new/appStoreVersionLocalizations': { status: 200, json: { data: [] } },
      'GET /appStoreVersions/live/appStoreVersionLocalizations': { status: 200, json: { data: [loc('l1', 'en-US')] } },
      'POST /appStoreVersionLocalizations': { status: 201, json: {} },
    });
    const locales = await writeWhatsNew(client, { versionId: 'new', sourceVersionId: 'live', releaseNotes: 'Gary!', log: () => {} });
    assert.deepEqual(locales, ['en-US']);
    const post = client.calls.find((c) => c.method === 'POST');
    assert.equal(post.body.data.attributes.locale, 'en-US');
    assert.equal(post.body.data.attributes.description, 'desc');
    assert.equal(post.body.data.attributes.whatsNew, 'Gary!');
    assert.equal(post.body.data.relationships.appStoreVersion.data.id, 'new');
  });
});

describe('ensureReviewDetail', () => {
  it('copies the demo account and notes forward when the new version has none', async () => {
    const source = { contactFirstName: 'A', contactLastName: 'B', contactPhone: '+27', contactEmail: 'a@b', demoAccountName: 'demo@x', demoAccountPassword: 'pw', demoAccountRequired: true, notes: 'B2B app' };
    const client = fakeAsc({
      'GET /appStoreVersions/new/appStoreReviewDetail': { status: 404, json: null },
      'GET /appStoreVersions/live/appStoreReviewDetail': { status: 200, json: { data: { id: 'r', attributes: source } } },
      'POST /appStoreReviewDetails': { status: 201, json: {} },
    });
    assert.equal(await ensureReviewDetail(client, { versionId: 'new', sourceVersionId: 'live', log: () => {} }), 'copied');
    const post = client.calls.find((c) => c.method === 'POST');
    assert.deepEqual(post.body.data.attributes, source);
    assert.equal(post.body.data.relationships.appStoreVersion.data.id, 'new');
  });

  it('leaves an existing review detail alone', async () => {
    const client = fakeAsc({ 'GET /appStoreVersions/new/appStoreReviewDetail': { status: 200, json: { data: { id: 'r', attributes: { demoAccountName: 'demo' } } } } });
    assert.equal(await ensureReviewDetail(client, { versionId: 'new', sourceVersionId: 'live', log: () => {} }), 'present');
    assert.equal(client.calls.length, 1);
  });
});

describe('buildTrackUpdate', () => {
  it('writes one completed release with notes for every listing language', () => {
    const { body, replaced } = buildTrackUpdate({ track: 'production', versionCode: 142, releaseNotes: 'Gary!', languages: ['en-US', 'af'], existingReleases: [{ status: 'completed', versionCodes: ['141'] }] });
    assert.deepEqual(body, {
      track: 'production',
      releases: [{ versionCodes: ['142'], status: 'completed', releaseNotes: [{ language: 'en-US', text: 'Gary!' }, { language: 'af', text: 'Gary!' }] }],
    });
    assert.deepEqual(replaced, []);
  });

  it('defaults to en-US when the listing has no languages and reports non-completed releases it replaces', () => {
    const { body, replaced } = buildTrackUpdate({ track: 'production', versionCode: 142, releaseNotes: 'x', languages: [], existingReleases: [{ status: 'draft', name: '5.2.0' }, { status: 'completed' }] });
    assert.deepEqual(body.releases[0].releaseNotes, [{ language: 'en-US', text: 'x' }]);
    assert.deepEqual(replaced, [{ status: 'draft', name: '5.2.0' }]);
  });
});

/** Fake Play client keyed like fakeAsc but without the write() split — the script calls the API directly. */
function fakePlay(responses) {
  const calls = [];
  const call = async (path, opts = {}) => {
    const method = opts.method ?? 'GET';
    calls.push({ method, path, body: opts.body });
    const key = Object.keys(responses).find((k) => {
      const [m, prefix] = k.split(' ');
      return m === method && path.startsWith(prefix);
    });
    if (!key) throw new Error(`unexpected ${method} ${path}`);
    return responses[key];
  };
  return { call, calls };
}

describe('stageRelease', () => {
  const base = {
    'POST /edits': { status: 200, json: { id: 'e1' } },
    'GET /edits/e1/bundles': { status: 200, json: { bundles: [{ versionCode: 141 }, { versionCode: 142 }] } },
    'GET /edits/e1/listings': { status: 200, json: { listings: [{ language: 'en-US' }] } },
    'GET /edits/e1/tracks/production': { status: 200, json: { track: 'production', releases: [{ status: 'completed', versionCodes: ['141'] }] } },
    'PUT /edits/e1/tracks/production': { status: 200, json: {} },
    'POST /edits/e1:validate': { status: 200, json: {} },
    'POST /edits/e1:commit': { status: 200, json: {} },
    'DELETE /edits/e1': { status: 204, json: null },
  };

  it('commits only with changesNotSentForReview=true', async () => {
    const client = fakePlay(base);
    const result = await stageRelease(client, { track: 'production', versionCode: '142', releaseNotes: 'Gary!', dryRun: false, log: () => {} });
    assert.equal(result.committed, true);
    const commit = client.calls.find((c) => c.path.includes(':commit'));
    assert.equal(commit.path, '/edits/e1:commit?changesNotSentForReview=true');
    const put = client.calls.find((c) => c.method === 'PUT');
    assert.deepEqual(put.body.releases[0].versionCodes, ['142']);
    assert.equal(put.body.releases[0].status, 'completed');
    assert.ok(client.calls.findIndex((c) => c.path.endsWith(':validate')) < client.calls.findIndex((c) => c.path.includes(':commit')), 'validate runs before commit');
  });

  it('validates then deletes the edit in dry-run, never committing', async () => {
    const client = fakePlay(base);
    const result = await stageRelease(client, { track: 'production', versionCode: '142', releaseNotes: 'Gary!', dryRun: true, log: () => {} });
    assert.equal(result.committed, false);
    assert.ok(client.calls.some((c) => c.path.endsWith(':validate')));
    assert.ok(client.calls.some((c) => c.method === 'DELETE'));
    assert.ok(!client.calls.some((c) => c.path.includes(':commit')));
  });

  it('refuses a versionCode that has not been uploaded and discards the edit', async () => {
    const client = fakePlay(base);
    await assert.rejects(stageRelease(client, { track: 'production', versionCode: '143', releaseNotes: 'x', dryRun: false, log: () => {} }), /not among the app's uploaded bundles/);
    assert.ok(client.calls.some((c) => c.method === 'DELETE'));
    assert.ok(!client.calls.some((c) => c.method === 'PUT'));
  });
});

describe('agcLanguageEntries', () => {
  // The live app's app-info (checked 2026-09-09) puts languages at the top level and returns
  // an `appInfo` object with no languages key at all. Reading the nested path found nothing,
  // so the "New features" write skipped every language while the run stayed green.
  it('reads the top-level languages array AppGallery actually returns', () => {
    const json = { ret: { code: 0 }, appInfo: { defaultLang: 'en-GB', versionNumber: '5.2.1' }, languages: [{ lang: 'en-GB', appName: 'GameOn Mobile' }] };
    assert.deepEqual(agcLanguageEntries(json).map((l) => l.lang), ['en-GB']);
  });

  it('falls back to the documented nested path', () => {
    assert.deepEqual(agcLanguageEntries({ appInfo: { languages: [{ lang: 'en-US' }] } }).map((l) => l.lang), ['en-US']);
  });

  it('returns an empty list for a response carrying no languages', () => {
    for (const json of [{}, { languages: null }, { appInfo: {} }, { languages: [{ appName: 'no lang key' }] }]) {
      assert.deepEqual(agcLanguageEntries(json), []);
    }
  });
});

describe('agcLanguageInfoBody', () => {
  it('sends the new features and echoes the listing text back unchanged', () => {
    const entry = { lang: 'en-GB', appName: 'GameOn Mobile', appDesc: 'A training platform', briefInfo: 'Level up your knowledge!', icon: 'https://x/y.png', showType: 1 };
    assert.deepEqual(agcLanguageInfoBody(entry, 'Gary!'), {
      lang: 'en-GB',
      newFeatures: 'Gary!',
      appName: 'GameOn Mobile',
      appDesc: 'A training platform',
      briefInfo: 'Level up your knowledge!',
    });
  });

  it('omits listing fields that are absent or blank rather than sending empties', () => {
    assert.deepEqual(agcLanguageInfoBody({ lang: 'en-GB', appName: '', appDesc: null }, 'x'), { lang: 'en-GB', newFeatures: 'x' });
  });
});

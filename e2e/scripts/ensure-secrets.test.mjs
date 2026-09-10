// Tests for the Key Vault top-up.
//
// Hermetic: `az` and the filesystem are both injected, so nothing here starts a process,
// touches the network, or reads or writes a real .env.e2e.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertSafeArgs,
  azIsReady,
  DEFAULT_VAULT,
  ensureSecrets,
  fetchSecrets,
  mergeEnvFile,
  secretNameFor,
} from './ensure-secrets.mjs';

/**
 * A fake `az` that answers from a lookup table.
 *
 * `secrets` maps secret name → value; anything absent returns null, which is how the real
 * one reports a failed call.
 */
function fakeAz({ loggedIn = true, secrets = {}, calls = [] } = {}) {
  return (args) => {
    calls.push(args);
    if (args[0] === 'account') return loggedIn ? 'sub-id' : null;
    const nameIndex = args.indexOf('--name');
    const name = nameIndex === -1 ? null : args[nameIndex + 1];
    return secrets[name] ?? null;
  };
}

/** An in-memory filesystem for the merge-write path. */
function fakeFs(initial = {}) {
  const files = { ...initial };
  return {
    files,
    exists: (file) => file in files,
    read: (file) => files[file],
    write: (file, text) => {
      files[file] = text;
    },
  };
}

describe('secretNameFor', () => {
  it('inverts the kebab to UPPER_SNAKE mapping pull-env.mjs applies', () => {
    assert.equal(secretNameFor('E2E_ADMIN_EMAIL'), 'e2e-admin-email');
    assert.equal(
      secretNameFor('EXAMPLE_LICENCE_KEY'),
      'example-licence-key',
    );
  });

  it('round-trips through the auto-map pull-env.mjs uses', () => {
    // pull-env.mjs does name.toUpperCase().replace(/-/g, '_'); this must be its inverse,
    // or a value the gate names could never be fetched.
    for (const secret of ['e2e-admin-email', 'example-licence-key']) {
      const envVar = secret.toUpperCase().replace(/-/g, '_');
      assert.equal(secretNameFor(envVar), secret);
    }
  });
});

describe('mergeEnvFile', () => {
  it('returns the text untouched when there is nothing to merge', () => {
    assert.equal(mergeEnvFile('A=1\n', {}), 'A=1\n');
  });

  it('appends a key the file does not have', () => {
    const out = mergeEnvFile('A=1\n', { B: '2' });
    assert.match(out, /^A=1$/m);
    assert.match(out, /^B=2$/m);
  });

  it('replaces an existing assignment in place', () => {
    const out = mergeEnvFile('# header\nA=old\nB=keep\n', { A: 'new' });
    assert.match(out, /^A=new$/m);
    assert.doesNotMatch(out, /A=old/);
    // The surrounding file survives — this is a merge, not pull:env's rewrite.
    assert.match(out, /^# header$/m);
    assert.match(out, /^B=keep$/m);
  });

  it('uncomments a commented placeholder rather than adding a second copy', () => {
    // .env.e2e.example ships every key commented out, and a file derived from it would
    // otherwise end up with the key twice — once inert, once live.
    const out = mergeEnvFile('# KV secret: a\n# A=\n', { A: 'v' });
    assert.match(out, /^A=v$/m);
    assert.equal(out.match(/A=/g).length, 1);
  });

  it('handles a leading `export `', () => {
    const out = mergeEnvFile('export A=old\n', { A: 'new' });
    assert.match(out, /^A=new$/m);
    assert.doesNotMatch(out, /old/);
  });

  it('does not touch a key whose name merely contains the target', () => {
    const out = mergeEnvFile('PREFIX_A=keep\nA=old\n', { A: 'new' });
    assert.match(out, /^PREFIX_A=keep$/m);
    assert.match(out, /^A=new$/m);
  });

  it('writes into an empty file without a leading blank line pile-up', () => {
    const out = mergeEnvFile('', { A: '1' });
    assert.match(out, /^A=1$/m);
    assert.ok(!out.startsWith('\n\n'));
  });

  it('keeps the file newline-terminated', () => {
    assert.ok(mergeEnvFile('A=1', { B: '2' }).endsWith('\n'));
  });
});

describe('fetchSecrets', () => {
  it('fetches each var by its secret name from the default vault', () => {
    const calls = [];
    const az = fakeAz({ secrets: { 'e2e-admin-email': 'admin@starterkit.local' }, calls });
    const out = fetchSecrets(['E2E_ADMIN_EMAIL'], { az });
    assert.deepEqual(out, { E2E_ADMIN_EMAIL: 'admin@starterkit.local' });
    const show = calls.find((c) => c[0] === 'keyvault');
    assert.ok(show.includes(DEFAULT_VAULT));
    assert.ok(show.includes('e2e-admin-email'));
  });

  it('passes the secret name as its own argv entry', () => {
    const calls = [];
    fetchSecrets(['E2E_ADMIN_EMAIL'], { az: fakeAz({ calls }) });
    const show = calls.find((c) => c[0] === 'keyvault');
    assert.ok(Array.isArray(show));
    assert.equal(show[show.indexOf('--name') + 1], 'e2e-admin-email');
  });

  it('omits a value the vault does not return rather than inventing one', () => {
    const out = fetchSecrets(['MISSING_ONE'], { az: fakeAz() });
    assert.deepEqual(out, {});
  });
});

describe('assertSafeArgs', () => {
  // On Windows the CLI is reached through a shell, which concatenates args WITHOUT
  // escaping (Node DEP0190). This guard, not the quoting, is what keeps that safe.
  it('accepts the arguments this module actually builds', () => {
    assert.doesNotThrow(() =>
      assertSafeArgs([
        'keyvault',
        'secret',
        'show',
        '--vault-name',
        'kv-starterkit-dev',
        '--name',
        'example-licence-key',
        '--query',
        'value',
        '-o',
        'tsv',
      ]),
    );
  });

  it('rejects every shell metacharacter that could break out of the command', () => {
    for (const bad of [
      'a b',
      'a;whoami',
      'a&&b',
      'a|b',
      'a>out',
      'a<in',
      'a`b`',
      'a$(b)',
      'a"b',
      "a'b",
      'a\nb',
      '',
    ]) {
      assert.throws(
        () => assertSafeArgs([bad]),
        /unsafe argument/,
        `should reject ${JSON.stringify(bad)}`,
      );
    }
  });
});

describe('azIsReady', () => {
  it('is true when `az account show` answers', () => {
    assert.equal(azIsReady(fakeAz({ loggedIn: true })), true);
  });

  it('is false when it does not', () => {
    assert.equal(azIsReady(fakeAz({ loggedIn: false })), false);
  });
});

describe('ensureSecrets', () => {
  const ENV_FILE = '/tmp/.env.e2e';

  it('starts no az process at all when nothing is missing', () => {
    // A provisioned machine must pay nothing for this step.
    const calls = [];
    const report = ensureSecrets([], { az: fakeAz({ calls }), env: {}, fs: fakeFs() });
    assert.equal(report.attempted, false);
    assert.deepEqual(calls, []);
  });

  it('reports unavailable and fetches nothing when az is not logged in', () => {
    const report = ensureSecrets(['E2E_ADMIN_EMAIL'], {
      az: fakeAz({ loggedIn: false }),
      env: {},
      fs: fakeFs(),
    });
    assert.equal(report.unavailable, true);
    assert.deepEqual(report.fetched, []);
    assert.deepEqual(report.failed, ['E2E_ADMIN_EMAIL']);
  });

  it('puts a fetched value into the environment children inherit', () => {
    const env = {};
    const report = ensureSecrets(['EXAMPLE_LICENCE_KEY'], {
      az: fakeAz({ secrets: { 'example-licence-key': 'licence-value' } }),
      env,
      fs: fakeFs(),
    });
    assert.equal(env.EXAMPLE_LICENCE_KEY, 'licence-value');
    assert.deepEqual(report.fetched, ['EXAMPLE_LICENCE_KEY']);
  });

  it('merges into .env.e2e without disturbing the rest of the file', () => {
    const fs = fakeFs({ [ENV_FILE]: '# generated\nE2E_ADMIN_EMAIL=someone@starterkit.local\n' });
    ensureSecrets(['EXAMPLE_LICENCE_KEY'], {
      az: fakeAz({ secrets: { 'example-licence-key': 'licence-value' } }),
      env: {},
      fs,
      envFile: ENV_FILE,
    });
    const written = fs.files[ENV_FILE];
    assert.match(written, /^E2E_ADMIN_EMAIL=someone@starterkit.local$/m);
    assert.match(written, /^EXAMPLE_LICENCE_KEY=licence-value$/m);
    assert.match(written, /^# generated$/m);
  });

  it('creates .env.e2e when there is none', () => {
    const fs = fakeFs();
    ensureSecrets(['E2E_ADMIN_EMAIL'], {
      az: fakeAz({ secrets: { 'e2e-admin-email': 'a@b.c' } }),
      env: {},
      fs,
      envFile: ENV_FILE,
    });
    assert.match(fs.files[ENV_FILE], /^E2E_ADMIN_EMAIL=a@b\.c$/m);
  });

  it('does not write the file when nothing could be fetched', () => {
    const fs = fakeFs();
    ensureSecrets(['NOT_IN_VAULT'], { az: fakeAz(), env: {}, fs, envFile: ENV_FILE });
    assert.deepEqual(Object.keys(fs.files), []);
  });

  it('still succeeds for THIS run when the file cannot be written', () => {
    // The values are already in process.env, so only the persistence for a later
    // `npx playwright test` is lost. That must not fail the run.
    const fs = fakeFs();
    fs.write = () => {
      throw new Error('EACCES');
    };
    const env = {};
    const report = ensureSecrets(['E2E_ADMIN_EMAIL'], {
      az: fakeAz({ secrets: { 'e2e-admin-email': 'a@b.c' } }),
      env,
      fs,
      envFile: ENV_FILE,
    });
    assert.equal(env.E2E_ADMIN_EMAIL, 'a@b.c');
    assert.deepEqual(report.fetched, ['E2E_ADMIN_EMAIL']);
  });

  it('separates what it got from what it could not get', () => {
    const report = ensureSecrets(['E2E_ADMIN_EMAIL', 'NOT_IN_VAULT'], {
      az: fakeAz({ secrets: { 'e2e-admin-email': 'a@b.c' } }),
      env: {},
      fs: fakeFs(),
    });
    assert.deepEqual(report.fetched, ['E2E_ADMIN_EMAIL']);
    assert.deepEqual(report.failed, ['NOT_IN_VAULT']);
  });

  it('honours a non-default vault', () => {
    const calls = [];
    ensureSecrets(['E2E_ADMIN_EMAIL'], {
      az: fakeAz({ calls }),
      env: {},
      fs: fakeFs(),
      vault: 'kv-somewhere-else',
    });
    const show = calls.find((c) => c[0] === 'keyvault');
    assert.ok(show.includes('kv-somewhere-else'));
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateStagingInputs, validateStagingSession, verifyImageStoragePrerequisites, requiredImageStoragePermissions } from './staging-preflight.mjs';
import { runHostedPublicationJourney } from './staging-browser-journey.mjs';

const inputs = {
  origin: 'https://staging.journal.example', productionOrigin: 'https://journal.example',
  projectId: 'journal-stage-123', productionProjectId: 'journal-prod-123',
  draftId: 'df9921ba-0b9e-4eba-991f-87e0213f4fc0', expectedSlug: 'disposable-staging-article',
};
const sentinel = 'PRIVATE_SESSION_SENTINEL';

const storageInput = {
  bucketName: 'journal-stage-123.firebasestorage.app', projectNumber: '123456789',
  runtimeIdentity: 'journal-runtime@journal-stage-123.iam.gserviceaccount.com',
};
const storageMetadata = () => ({ name: storageInput.bucketName, projectNumber: storageInput.projectNumber,
  iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' } });

test('image storage preflight verifies actual bucket ownership, private policy and runtime effective permissions', async () => {
  const calls = [];
  const result = await verifyImageStoragePrerequisites({ ...storageInput,
    readBucketMetadata: async name => { assert.equal(name, storageInput.bucketName); return storageMetadata(); },
    checkPermission: async request => { calls.push(request); return 'CAN_ACCESS'; },
  });
  assert.equal(result.private, true);
  assert.deepEqual(calls.map(row => row.permission), requiredImageStoragePermissions);
  assert.ok(calls.every(row => row.resource === `//storage.googleapis.com/projects/_/buckets/${storageInput.bucketName}`
    && row.principalEmail === storageInput.runtimeIdentity));
});

test('missing, foreign or public image storage stops before IAM verification', async () => {
  for (const metadata of [null, { ...storageMetadata(), name: 'different-bucket' },
    { ...storageMetadata(), projectNumber: '999999999' },
    { ...storageMetadata(), iamConfiguration: { uniformBucketLevelAccess: { enabled: false }, publicAccessPrevention: 'enforced' } },
    { ...storageMetadata(), iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'inherited' } }]) {
    let calls = 0;
    await assert.rejects(verifyImageStoragePrerequisites({ ...storageInput,
      readBucketMetadata: async () => metadata, checkPermission: async () => { calls++; return 'CAN_ACCESS'; },
    }));
    assert.equal(calls, 0);
  }
});

test('image storage permission denials, unknown results and cloud errors cannot pass', async () => {
  for (const permission of requiredImageStoragePermissions) for (const access of ['CANNOT_ACCESS', 'UNKNOWN_INFO', undefined]) {
    await assert.rejects(verifyImageStoragePrerequisites({ ...storageInput, readBucketMetadata: async () => storageMetadata(),
      checkPermission: async request => request.permission === permission ? access : 'CAN_ACCESS',
    }), new RegExp(permission));
  }
  await assert.rejects(verifyImageStoragePrerequisites({ ...storageInput,
    readBucketMetadata: async () => { throw new Error('Read-only bucket query failed'); },
    checkPermission: async () => 'CAN_ACCESS',
  }), /bucket query failed/);
});
const localAuth = { name: 'firebase:authUser:fictional-key:[DEFAULT]', value: sentinel };
const indexedAuth = { name: 'firebaseLocalStorageDb', version: 1, stores: [{ name: 'firebaseLocalStorage',
  keyPath: 'fbase_key', autoIncrement: false, indexes: [], records: [{ value: {
    fbase_key: localAuth.name, value: { uid: 'disposable-user', stsTokenManager: { refreshToken: sentinel } },
  } }] }] };

test('hosted guard rejects deployment mismatches before authenticated initialization can write', async () => {
  const correct = { environment: 'staging', firebase: { projectId: inputs.projectId },
    siteOrigin: inputs.origin, articleSiteOrigin: inputs.origin };
  for (const [status, config] of [[302, correct], [500, correct],
    [200, { ...correct, environment: 'production' }],
    [200, { ...correct, firebase: { projectId: inputs.productionProjectId } }],
    [200, { ...correct, siteOrigin: inputs.productionOrigin }],
    [200, { ...correct, articleSiteOrigin: inputs.productionOrigin }]]) {
    let navigation = false;
    const page = {
      request: { get: async (url, options) => {
        assert.equal(url, inputs.origin + '/api/content/config');
        assert.equal(options.maxRedirects, 0);
        return { status: () => status, json: async () => config };
      } },
      goto: async () => { navigation = true; throw new Error('Must not navigate'); },
    };
    await assert.rejects(runHostedPublicationJourney({ ...inputs, page }));
    assert.equal(navigation, false);
  }
});

async function captureFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'blog-staging-preflight-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const storageState = join(directory, 'isolated-state.json');
  return { storageState, write: value => writeFile(storageState, JSON.stringify(value)) };
}

test('staging inputs normalize safe fields and discard unrelated private values', () => {
  const result = validateStagingInputs({ ...inputs, draftId: inputs.draftId.toUpperCase(),
    expectedSlug: ' disposable-staging-article ', storageState: sentinel, token: sentinel });
  assert.deepEqual(result, inputs);
  assert.ok(Object.isFrozen(result));
  assert.ok(!JSON.stringify(result).includes(sentinel));
});

test('missing inputs and unsafe origins fail before accessing any session file', async () => {
  for (const field of Object.keys(inputs)) {
    for (const value of [undefined, '', ' ', null, 42]) {
      assert.throws(() => validateStagingInputs({ ...inputs, [field]: value }));
    }
  }
  assert.throws(() => validateStagingInputs(), /origin is required/);
  for (const field of ['origin', 'productionOrigin']) {
    for (const value of ['http://stage.example', 'https://user:password@stage.example',
      'https://stage.example/', 'https://stage.example/path', 'https://stage.example?token=secret',
      'https://stage.example#fragment', 'https://stage.example\\path', '//stage.example',
      'https://STAGE.example', 'https://stage.example:443', 'not-a-url']) {
      assert.throws(() => validateStagingInputs({ ...inputs, [field]: value }), /HTTPS origin/);
    }
  }
  await assert.rejects(validateStagingSession({ storageState: 'must-not-read', ...inputs, origin: inputs.productionOrigin }), /must differ/);
});

test('production targets, emulator projects and unsafe fixture identifiers are rejected', () => {
  assert.throws(() => validateStagingInputs({ ...inputs, origin: inputs.productionOrigin }), /origin must differ/);
  assert.throws(() => validateStagingInputs({ ...inputs, projectId: inputs.productionProjectId }), /project must differ/);
  for (const field of ['projectId', 'productionProjectId']) {
    for (const value of ['demo-journal', 'Upper-case', '../project', 'short', 'a'.repeat(31), 'trailing-']) {
      assert.throws(() => validateStagingInputs({ ...inputs, [field]: value }), /hosted project/);
    }
  }
  for (const draftId of ['../other', inputs.draftId + '/nested', '%2fadmin', 'abc', '${secret}']) {
    assert.throws(() => validateStagingInputs({ ...inputs, draftId }), /explicit UUID/);
  }
  for (const expectedSlug of ['../other', 'with/slash', '%2fadmin', 'CamelCase', 'two--dashes',
    '-leading', 'trailing-', 'query?x=1', 'fragment#x', 'a'.repeat(91)]) {
    assert.throws(() => validateStagingInputs({ ...inputs, expectedSlug }), /lowercase URL slug/);
  }
});

test('captured Firebase localStorage and IndexedDB sessions return only safe normalized inputs', async t => {
  const fixture = await captureFixture(t);
  for (const auth of [{ localStorage: [localAuth] }, { indexedDB: [indexedAuth] }]) {
    await fixture.write({ cookies: [{ name: 'private-cookie', value: sentinel }],
      origins: [{ origin: inputs.origin, ...auth }] });
    const result = await validateStagingSession({ ...inputs, storageState: fixture.storageState, token: sentinel });
    assert.deepEqual(result, inputs);
    assert.ok(!JSON.stringify(result).includes(sentinel));
    assert.equal(Object.hasOwn(result, 'storageState'), false);
    assert.equal(Object.hasOwn(result, 'origins'), false);
  }
});

test('missing, unreadable and malformed session files fail without exposing their contents', async t => {
  const fixture = await captureFixture(t);
  await assert.rejects(validateStagingSession(inputs), /storageState is required/);
  await assert.rejects(validateStagingSession({ ...inputs, storageState: fixture.storageState }), /readable Playwright/);
  await writeFile(fixture.storageState, `{ "private": "${sentinel}"`);
  await assert.rejects(validateStagingSession({ ...inputs, storageState: fixture.storageState }), error => {
    assert.match(error.message, /readable Playwright/);
    assert.ok(!error.message.includes(sentinel));
    assert.equal(error.cause, undefined);
    return true;
  });
});

test('a session requires Firebase auth on exactly the staging origin, not just cookies or other IndexedDB data', async t => {
  const fixture = await captureFixture(t);
  const withOrigins = origins => ({ cookies: [{ name: 'session', value: sentinel }], origins });
  for (const state of [null, {}, { origins: {} }, withOrigins([]),
    withOrigins([{ origin: inputs.productionOrigin, localStorage: [localAuth] }]),
    withOrigins([{ origin: inputs.origin + '/', localStorage: [localAuth] }]),
    withOrigins([{ origin: inputs.origin, localStorage: [] }]),
    withOrigins([{ origin: inputs.origin, localStorage: [null, { name: 'other', value: sentinel }] }]),
    withOrigins([{ origin: inputs.origin, localStorage: [{ ...localAuth, value: ' ' }] }]),
    withOrigins([{ origin: inputs.origin, indexedDB: [{ name: 'unrelated', stores: indexedAuth.stores }] }]),
    withOrigins([{ origin: inputs.origin, indexedDB: [{ ...indexedAuth, stores: [] }] }]),
    withOrigins([{ origin: inputs.origin, indexedDB: [{ ...indexedAuth, stores: [{ name: 'firebaseLocalStorage', records: [{ value: { fbase_key: localAuth.name, value: {} } }] }] }] }]),
    withOrigins([{ origin: inputs.origin, localStorage: [localAuth] }, { origin: inputs.origin, localStorage: [localAuth] }]),
  ]) {
    await fixture.write(state);
    await assert.rejects(validateStagingSession({ ...inputs, storageState: fixture.storageState }), /exact staging origin/);
  }
});

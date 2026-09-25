import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartupStorageBucket, loadStartupConfig } from '../server/startup-config.mjs';
import { createStudioImageAsset } from '../server/studio-content-assets.mjs';

export const emulatorEnvironment = (overrides = {}) => ({
  BLOG_EMULATOR_MODE: 'true',
  PUBLIC_SITE_ORIGIN: 'http://127.0.0.1:8080',
  RUNTIME_ENVIRONMENT: 'staging',
  GOOGLE_CLOUD_PROJECT: 'demo-blog-community',
  RUNTIME_FIREBASE_API_KEY: 'demo-key',
  RUNTIME_FIREBASE_AUTH_DOMAIN: 'demo-blog-community.firebaseapp.com',
  RUNTIME_FIREBASE_PROJECT_ID: 'demo-blog-community',
  RUNTIME_FIREBASE_STORAGE_BUCKET: 'demo-blog-community.appspot.com',
  RUNTIME_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  RUNTIME_FIREBASE_APP_ID: '1:123456789:web:demo',
  RUNTIME_GOOGLE_CLIENT_ID: 'demo.apps.googleusercontent.com',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8089',
  ...overrides,
});
test('startup rejects missing runtime facts rather than using another project', () => {
  assert.throws(() => loadStartupConfig({}), /PUBLIC_SITE_ORIGIN/);
  assert.throws(() => loadStartupConfig({ PUBLIC_SITE_ORIGIN: 'https://journal.example' }), /configuration/);
});
test('local emulator configuration stays on loopback with disposable identities', () => {
  const config = loadStartupConfig(emulatorEnvironment());
  assert.equal(config.firebase.projectId, 'demo-blog-community');
  assert.equal(config.emulators.auth, 'http://127.0.0.1:9099');
});
test('emulator mode cannot target real projects or nonloopback hosts', () => {
  for (const overrides of [
    { GOOGLE_CLOUD_PROJECT: 'real-journal-project', RUNTIME_FIREBASE_PROJECT_ID: 'real-journal-project' },
    { FIRESTORE_EMULATOR_HOST: 'database.example:8080' },
    { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099/path' },
    { RUNTIME_ENVIRONMENT: 'production' },
    { PUBLIC_SITE_ORIGIN: 'http://journal.example' },
    { PUBLIC_SITE_ORIGIN: 'https://journal.example' },
  ]) assert.throws(() => loadStartupConfig(emulatorEnvironment(overrides)));
});

test('emulator startup rejects remote, conflicting or malformed Storage redirects', () => {
  for (const overrides of [
    { FIREBASE_STORAGE_EMULATOR_HOST: 'storage.example:9199' },
    { STORAGE_EMULATOR_HOST: 'http://storage.example:9199' },
    { FIREBASE_STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199' },
    { STORAGE_EMULATOR_HOST: 'https://127.0.0.1:9199' },
    { STORAGE_EMULATOR_HOST: 'http://user:pass@127.0.0.1:9199' },
    { STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199/path' },
    { STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199?redirect=elsewhere' },
    { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199', STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9299' },
  ]) assert.throws(() => loadStartupConfig(emulatorEnvironment(overrides)));
});

test('without local Storage emulator, image upload fails before constructing storage or touching data', async () => {
  const config = loadStartupConfig(emulatorEnvironment());
  assert.equal(config.emulators.storage, null);
  const bucket = createStartupStorageBucket(config, () => { throw new Error('Storage must not initialize.'); });
  const db = new Proxy({}, { get() { throw new Error('Database must not be touched.'); } });
  await assert.rejects(createStudioImageAsset({ db, bucket }), (error) => (
    error.statusCode === 503 && /Images are disabled in local emulator mode/.test(error.message)
  ));
});

test('only explicit local Storage endpoints enable the emulator bucket factory', () => {
  for (const overrides of [
    { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' },
    { STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199' },
    { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199', STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199' },
  ]) {
    const config = loadStartupConfig(emulatorEnvironment(overrides));
    assert.equal(config.emulators.storage, 'http://127.0.0.1:9199');
    const bucket = { marker: 'local-factory-result' };
    assert.equal(createStartupStorageBucket(config, () => bucket), bucket);
  }
  const managed = { firebase: {} };
  const bucket = { marker: 'managed-factory-result' };
  assert.equal(createStartupStorageBucket(managed, () => bucket), bucket);
});
test('managed mode requires HTTPS and rejects ambient emulator redirects', () => {
  assert.throws(() => loadStartupConfig(emulatorEnvironment({ BLOG_EMULATOR_MODE: 'false' })));
  assert.throws(() => loadStartupConfig(emulatorEnvironment({ PUBLIC_SITE_ORIGIN: 'https://name:pass@journal.example' })));
});

import { resolveBuiltDeploymentProfile, assertProductionSiteProfile } from '../server/production-profile.mjs';
const builtDeployment = {site:{siteName:'Journal',description:'Independent writing',siteOrigin:'https://journal.example'},productionProjectId:'journal-prod-123'};
const stageApproval = {productionSiteOrigin:'https://journal.example',productionProjectId:'journal-prod-123',siteOrigin:'https://stage.journal.example',projectId:'journal-stage-123'};
const stageActual = {environment:'staging',siteOrigin:'https://stage.journal.example',projectId:'journal-stage-123'};
test('immutable image accepts only the explicitly approved isolated staging tuple',()=>{
  const result=resolveBuiltDeploymentProfile(builtDeployment,stageActual,stageApproval);
  assert.equal(result.siteOrigin,stageActual.siteOrigin);assert.equal(result.siteName,'Journal');
});
test('production origin and project remain pinned and cannot use staging approval',()=>{
  assert.equal(resolveBuiltDeploymentProfile(builtDeployment,{environment:'production',siteOrigin:'https://journal.example',projectId:'journal-prod-123'}).siteOrigin,'https://journal.example');
  assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment,{...stageActual,environment:'production'}),/must match/);
  assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment,{environment:'production',siteOrigin:'https://journal.example',projectId:'journal-stage-123'}),/does not match/);
  assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment,{...stageActual,environment:'production'},stageApproval),/cannot be used/);
  assert.throws(()=>assertProductionSiteProfile(builtDeployment.site,'https://stage.journal.example'),/must match/);
});
test('missing, stale, malformed or non-isolated staging approvals fail closed',()=>{
  for(const approval of [undefined,{}, {...stageApproval,extra:true},{...stageApproval,productionSiteOrigin:'https://old.example'},{...stageApproval,productionProjectId:'other-prod-123'},{...stageApproval,siteOrigin:'http://stage.journal.example'},{...stageApproval,siteOrigin:'https://stage.journal.example/path'},{...stageApproval,siteOrigin:'https://stage.journal.example/'},{...stageApproval,siteOrigin:'https://journal.example'},{...stageApproval,projectId:'journal-prod-123'}]) assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment,stageActual,approval));
  for(const actual of [{...stageActual,projectId:'other-stage-123'},{...stageActual,siteOrigin:'https://unapproved.example'},{...stageActual,environment:'preview'}]) assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment,actual,stageApproval));
  assert.throws(()=>resolveBuiltDeploymentProfile(builtDeployment.site,stageActual,stageApproval),/explicit production project/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  firebaseManagementHeaders,
  requireSuccessfulGcloud,
  resolveGcloudInvocation,
  spawnGcloudSync,
} from './node-cloud-verifier.mjs';

test('uses direct gcloud execution outside Windows', () => {
  assert.deepEqual(resolveGcloudInvocation(['projects', 'describe', 'example'], { platform: 'linux' }), {
    command: 'gcloud',
    args: ['projects', 'describe', 'example'],
  });
});

test('uses the installed PowerShell wrapper on Windows without a command shell', () => {
  const launcher = resolveGcloudInvocation(
    ['firestore', 'databases', 'describe', '--database=(default)'],
    {
      platform: 'win32',
      pathValue: 'C:\\Other;C:\\Cloud SDK\\bin',
      pathExists: (candidate) => candidate === 'C:\\Cloud SDK\\bin\\gcloud.ps1',
      powershell: 'powershell.exe',
    },
  );
  assert.equal(launcher.command, 'powershell.exe');
  assert.deepEqual(launcher.args, [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-File',
    'C:\\Cloud SDK\\bin\\gcloud.ps1',
    'firestore',
    'databases',
    'describe',
    '--database=(default)',
  ]);
});

test('fails closed when the Windows wrapper is absent', () => {
  assert.throws(() => resolveGcloudInvocation([], {
    platform: 'win32',
    pathValue: 'C:\\Other',
    pathExists: () => false,
  }), /gcloud\.ps1 was not found/);
});

test('rejects options that could enable a command shell', () => {
  assert.throws(() => spawnGcloudSync([], { shell: true }), /Unsupported gcloud process options: shell/);
});

test('fails closed on process errors and nonzero exits', () => {
  assert.throws(() => requireSuccessfulGcloud({ error: new Error('launch failed'), status: null }), /could not be launched/);
  assert.throws(() => requireSuccessfulGcloud({ status: 1 }), /exited with status 1/);
});

test('attributes Firebase Management quota to the target project', () => {
  assert.deepEqual(firebaseManagementHeaders(' access-token ', ' staging-project '), {
    Authorization: 'Bearer access-token',
    'x-goog-user-project': 'staging-project',
  });
});

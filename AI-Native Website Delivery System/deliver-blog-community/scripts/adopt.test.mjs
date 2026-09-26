import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { adopt } from './adopt.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'adoption-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = {
    'SKILL.md': 'fixture', 'CAPABILITY.md': 'fixture',
    'runtime/package.json': JSON.stringify({ private: true, version: '1.0.0' }),
    'runtime/pnpm-lock.yaml': 'fixture', 'runtime/pnpm-workspace.yaml': 'fixture',
    'runtime/server/start.mjs': '// fixture', 'runtime/firestore.rules': '// deny fixture',
  };
  const files = Object.entries(source).map(([name, text]) => { const b = Buffer.from(text); return { path: name, size: b.length, sha256: sha(b), data: b.toString('base64') }; });
  const archive = path.join(root, 'fixture.gz');
  const bytes = gzipSync(JSON.stringify({ format: 'blog-capability/1', version: '1.0.0', releaseScope: 'local-integration-candidate', files }));
  await fs.writeFile(archive, bytes);
  const prerequisite = path.join(root, 'site.json'); await fs.writeFile(prerequisite, '{}');
  const check = path.join(root, 'check.mjs'); await fs.writeFile(check, "import fs from 'node:fs'; fs.appendFileSync('verification-count', '1');");
  const executable = await fs.realpath(process.execPath);
  const profile = { format: 'blog-adoption/1', site: 'fictional-site', environment: 'staging', archive,
    packageSha256: sha(bytes), packageVersion: '1.0.0', installRoot: path.join(root, 'managed'),
    prerequisites: [{ path: prerequisite, sha256: sha('{}') }, { path: check, sha256: sha(await fs.readFile(check)) }],
    verification: [{ id: 'fixture-contract', executable, sha256: sha(await fs.readFile(executable)), cwd: root, args: [check], timeoutMs: 10000 }] };
  const profilePath = path.join(root, 'profile.json');
  const save = async () => fs.writeFile(profilePath, JSON.stringify(profile)); await save();
  return { root, profile, profilePath, save, check, run: opts => adopt(profilePath, { environment: 'staging', ...opts }) };
}
test('plan is read-only; install is idempotent and verification reruns', async t => {
  const f = await fixture(t); const before = await fs.readdir(f.root);
  const plan = await f.run({ mode: 'plan' }); assert.equal(plan.status, 'PLANNED'); assert.deepEqual(await fs.readdir(f.root), before);
  const first = await f.run({ mode: 'install' }); assert.equal(first.installation.status, 'INSTALLED');
  const second = await f.run({ mode: 'install' }); assert.equal(second.installation.status, 'ALREADY_INSTALLED');
  assert.equal(await fs.readFile(path.join(f.root, 'verification-count'), 'utf8'), '11');
});
test('wrong package hash, version and environment fail before mutation', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run({ mode: 'install', environment: 'production' }), /Environment mismatch/);
  f.profile.packageVersion = '2.0.0'; await f.save(); await assert.rejects(f.run({ mode: 'install' }), /version mismatch/);
  f.profile.packageVersion = '1.0.0'; f.profile.packageSha256 = '0'.repeat(64); await f.save();
  await assert.rejects(f.run({ mode: 'install' }), /SHA-256 mismatch/);
  await assert.rejects(fs.access(f.profile.installRoot));
});
test('unmanaged folder and changed profile cannot be overwritten', async t => {
  const f = await fixture(t); await fs.mkdir(f.profile.installRoot); await fs.writeFile(path.join(f.profile.installRoot, 'keep'), 'user file');
  await assert.rejects(f.run({ mode: 'install' })); assert.equal(await fs.readFile(path.join(f.profile.installRoot, 'keep'), 'utf8'), 'user file');
  f.profile.installRoot = path.join(f.root, 'owned'); await f.save(); await f.run({ mode: 'install' });
  f.profile.site = 'different-site'; await f.save(); await assert.rejects(f.run({ mode: 'install' }), /another site\/environment/);
});
test('missing or changed prerequisites fail closed', async t => {
  const f = await fixture(t); await fs.writeFile(f.check, '// changed');
  await assert.rejects(f.run({ mode: 'install' }), /Prerequisite changed/);
  await fs.unlink(f.check); await assert.rejects(f.run({ mode: 'install' }), /ENOENT/);
  await assert.rejects(fs.access(f.profile.installRoot));
});
test('installed source tamper is rejected on repeated install', async t => {
  const f = await fixture(t); const result = await f.run({ mode: 'install' });
  await fs.writeFile(path.join(result.installation.release, 'runtime/server/start.mjs'), '// tampered');
  await assert.rejects(f.run({ mode: 'install' }), /Installed source changed/);
});
test('verification failure returns bounded evidence without leaking output', async t => {
  const f = await fixture(t); await fs.writeFile(f.check, "console.error('secret-fixture'); process.exit(7)");
  f.profile.prerequisites[1].sha256 = sha(await fs.readFile(f.check)); await f.save();
  await assert.rejects(f.run({ mode: 'install' }), e => e.evidence.exitCode === 7 && !JSON.stringify(e).includes('secret-fixture'));
});
async function deploymentFixture(t, fail = false) {
  const f = await fixture(t); const script = path.join(f.root, 'fake-ra002.mjs');
  await fs.writeFile(script, `import fs from 'node:fs'; fs.appendFileSync('deployment-calls', JSON.stringify({args:process.argv.slice(2),config:process.env.DEPLOY_CONFIG})+'\\n'); if(process.argv.includes('--dry-run')) process.exit(${fail ? 9 : 0}); let s=''; for await(const b of process.stdin)s+=b; if(s!=='DEPLOY\\n') process.exit(8);`);
  const config = path.join(f.root, 'deployment.config'); await fs.writeFile(config, 'fictional');
  const command = f.profile.verification[0];
  f.profile.deployment = { owner: 'RA-002', protocol: 'deploy-sh-v1', executable: command.executable, executableSha256: command.sha256, script, scriptSha256: sha(await fs.readFile(script)), config, configSha256: sha('fictional'), cwd: f.root };
  await f.save(); return f;
}
test('deployment needs exact external authority and delegates RA-002 only after verification', async t => {
  const f = await deploymentFixture(t);
  await assert.rejects(f.run({ mode: 'deploy' }), /authorization required/); await assert.rejects(fs.access(f.profile.installRoot));
  const p = await f.run({ mode: 'plan' }); const authorization = `DEPLOY:${p.site}:${p.environment}:${p.profileSha256}`;
  const result = await f.run({ mode: 'deploy', authorization }); assert.equal(result.status, 'DELEGATED_SUCCESS');
  const calls = (await fs.readFile(path.join(f.root, 'deployment-calls'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls.map(c => c.args), [['--deploy', '--dry-run'], ['--deploy']]);
  assert.ok(calls.every(c => c.config === f.profile.deployment.config));
});
test('RA-002 preflight failure prevents deployment', async t => {
  const f = await deploymentFixture(t, true); const p = await f.run({ mode: 'plan' });
  await assert.rejects(f.run({ mode: 'deploy', authorization: `DEPLOY:${p.site}:${p.environment}:${p.profileSha256}` }), /ra002-preflight/);
  assert.equal((await fs.readFile(path.join(f.root, 'deployment-calls'), 'utf8')).trim().split('\n').length, 1);
});
test('RA-002 deployment failure is not reported as success', async t => {
  const f = await deploymentFixture(t);
  await fs.appendFile(f.profile.deployment.script, '\nprocess.exit(6);');
  f.profile.deployment.scriptSha256 = sha(await fs.readFile(f.profile.deployment.script)); await f.save();
  const p = await f.run({ mode: 'plan' });
  await assert.rejects(f.run({ mode: 'deploy', authorization: `DEPLOY:${p.site}:${p.environment}:${p.profileSha256}` }), e => e.message.includes('ra002-deploy') && e.evidence.exitCode === 6);
});
test('verify requires an installed release', async t => {
  const f = await fixture(t); await assert.rejects(f.run({ mode: 'verify' }), /ENOENT/);
  await assert.rejects(fs.access(f.profile.installRoot));
});
test('same-root upgrade requires prior hash, preserves v1, and repeats v2 idempotently', async t => {
  const f = await fixture(t); const v1 = await f.run({ mode: 'install' });
  const prior = f.profile.packageSha256;
  const payload = JSON.parse(gunzipSync(await fs.readFile(f.profile.archive)));
  payload.version = '2.0.0';
  const manifest = payload.files.find(file => file.path === 'runtime/package.json');
  const data = Buffer.from(JSON.stringify({ private: true, version: '2.0.0' }));
  Object.assign(manifest, { data: data.toString('base64'), size: data.length, sha256: sha(data) });
  const bytes = gzipSync(JSON.stringify(payload));
  f.profile.archive = path.join(f.root, 'v2.gz'); await fs.writeFile(f.profile.archive, bytes);
  f.profile.packageVersion = '2.0.0'; f.profile.packageSha256 = sha(bytes);
  await f.save(); await assert.rejects(f.run({ mode: 'install' }), /previous package hash mismatch/);
  f.profile.expectedPreviousPackageSha256 = '0'.repeat(64); await f.save();
  await assert.rejects(f.run({ mode: 'install' }), /previous package hash mismatch/);
  f.profile.expectedPreviousPackageSha256 = prior; await f.save();
  const v2 = await f.run({ mode: 'install' }); assert.equal(v2.installation.status, 'INSTALLED');
  assert.notEqual(v1.installation.release, v2.installation.release); await fs.access(v1.installation.release);
  assert.equal((await f.run({ mode: 'install' })).installation.status, 'ALREADY_INSTALLED');
  f.profile.environment = 'production'; await f.save();
  await assert.rejects(f.run({ mode: 'install', environment: 'production' }), /another site\/environment/);
});
test('unsupported staged-promotion protocol fails before mutation', async t => {
  const f = await deploymentFixture(t); f.profile.deployment.protocol = 'staged-release'; await f.save();
  await assert.rejects(f.run({ mode: 'plan' }), /Unsupported deployment protocol/);
  await assert.rejects(fs.access(f.profile.installRoot));
});

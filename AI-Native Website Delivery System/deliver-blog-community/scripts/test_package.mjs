import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { buildPackage, installPackage, activateRelease, readPackage } from './package.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-package-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root,'source');
  const inputs = { 'SKILL.md':'skill', 'CAPABILITY.md':'candidate', 'runtime/package.json':JSON.stringify({version:'0.2.0-rc.1',private:true}), 'runtime/pnpm-lock.yaml':'lockfileVersion: 9.0', 'runtime/pnpm-workspace.yaml':"packages:\n  - '.'\n", 'runtime/server/start.mjs':'console.log(1)', 'runtime/firestore.rules':'rules_version="2";' };
  for (const [file, body] of Object.entries(inputs)) { await fs.mkdir(path.dirname(path.join(source,file)),{recursive:true}); await fs.writeFile(path.join(source,file),body); }
  await fs.mkdir(path.join(source,'assets')); await fs.writeFile(path.join(source,'assets/package-files.json'),JSON.stringify([...Object.keys(inputs),'assets/package-files.json']));
  return {root,source,output:path.join(root,'packages'),consumer:path.join(root,'consumer')};
}
test('deterministic archive excludes installed dependencies, secrets and generated output', async t => {
  const f=await fixture(t);
  for (const file of ['runtime/.env','runtime/node_modules/a.js','runtime/dist/index.html','runtime/firebase-debug.log']) { await fs.mkdir(path.dirname(path.join(f.source,file)),{recursive:true}); await fs.writeFile(path.join(f.source,file),'excluded'); }
  const one=await buildPackage(f.source,f.output), two=await buildPackage(f.source,f.output);
  assert.equal(one.packageSha256,two.packageSha256);
  const content=await readPackage(one.packagePath,one.packageSha256);
  assert.equal(content.files.length,8);
});
test('clean install and repeat install preserve external consumer config', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  await fs.mkdir(f.consumer); await fs.writeFile(path.join(f.consumer,'site.json'),'consumer-owned');
  const one=await installPackage(p.packagePath,p.packageSha256,f.consumer);
  assert.equal(one.status,'INSTALLED');
  assert.equal((await installPackage(p.packagePath,p.packageSha256,f.consumer)).status,'ALREADY_INSTALLED');
  assert.equal(await fs.readFile(path.join(f.consumer,'site.json'),'utf8'),'consumer-owned');
  await fs.writeFile(path.join(one.release,'runtime/server/start.mjs'),'consumer edit');
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer),/Installed source changed/);
});
test('upgrade and code-only rollback preserve data and previous source versions', async t => {
  const f=await fixture(t), p1=await buildPackage(f.source,f.output);
  const first=await installPackage(p1.packagePath,p1.packageSha256,f.consumer);
  await activateRelease(f.consumer,first.release,p1.packagePath,p1.packageSha256);
  await fs.writeFile(path.join(f.consumer,'user-data.fixture'),'keep');
  await fs.writeFile(path.join(f.source,'runtime/package.json'),JSON.stringify({version:'0.2.0-rc.2',private:true}));
  const p2=await buildPackage(f.source,f.output), second=await installPackage(p2.packagePath,p2.packageSha256,f.consumer);
  assert.equal((await activateRelease(f.consumer,second.release,p2.packagePath,p2.packageSha256)).version,'0.2.0-rc.2');
  assert.equal((await activateRelease(f.consumer,first.release,p1.packagePath,p1.packageSha256)).packageSha256,p1.packageSha256);
  assert.equal(await fs.readFile(path.join(f.consumer,'user-data.fixture'),'utf8'),'keep');
});
test('wrong hash and path-traversing archive fail before installation', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  await assert.rejects(installPackage(p.packagePath,'0'.repeat(64),f.consumer),/SHA-256 mismatch/);
  const payload=JSON.parse(gunzipSync(await fs.readFile(p.packagePath)));
  payload.files[0].path='../escape'; const malicious=gzipSync(JSON.stringify(payload));
  const filename=path.join(f.output,'malicious.blog.json.gz'); await fs.writeFile(filename,malicious);
  await assert.rejects(installPackage(filename,sha(malicious),f.consumer),/Unsafe package path/);
  await assert.rejects(fs.stat(f.consumer),{code:'ENOENT'});
});
test('altered file hash, Windows device names and duplicate case paths are rejected', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  const original=JSON.parse(gunzipSync(await fs.readFile(p.packagePath)));
  for (const mutate of [x=>x.files[0].sha256='0'.repeat(64), x=>x.files[0].path='runtime/NUL.txt', x=>x.files.push({...x.files[0],path:x.files[0].path.toLowerCase()})]) {
    const payload=structuredClone(original); mutate(payload);const bytes=gzipSync(JSON.stringify(payload));
    const filename=path.join(f.output,'invalid.blog.json.gz');await fs.writeFile(filename,bytes);
    await assert.rejects(readPackage(filename,sha(bytes)));
  }
});
test('foreign activation and junction installation cannot cross ownership boundary', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  const first=await installPackage(p.packagePath,p.packageSha256,f.consumer);
  const other=path.join(f.root,'other');await fs.mkdir(other);
  await assert.rejects(activateRelease(other,first.release,p.packagePath,p.packageSha256),/not owned/);
  const junction=path.join(f.root,'junction'); await fs.symlink(other,junction,process.platform==='win32'?'junction':'dir');
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,junction),/roots are not supported/);
});
test('unlisted service account and auth session files cannot enter the package', async t => {
  const f=await fixture(t);
  await fs.writeFile(path.join(f.source,'runtime/service-account.json'),'fictional private data');
  await assert.rejects(buildPackage(f.source,f.output),/Unclassified\/private/);
});
test('forged empty receipt cannot activate modified source', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  const installed=await installPackage(p.packagePath,p.packageSha256,f.consumer);
  await fs.writeFile(path.join(installed.release,'installation-receipt.json'),JSON.stringify({format:'blog-install/1',version:'999.0.0',packageSha256:p.packageSha256,files:[]}));
  await fs.writeFile(path.join(installed.release,'runtime/server/start.mjs'),'untrusted changed source');
  await assert.rejects(activateRelease(f.consumer,installed.release,p.packagePath,p.packageSha256),/Installed source changed/);
  await assert.rejects(fs.stat(path.join(f.consumer,'current.json')),{code:'ENOENT'});
});
test('a package without its pnpm workspace boundary is rejected', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  const payload=JSON.parse(gunzipSync(await fs.readFile(p.packagePath)));
  payload.files=payload.files.filter(file=>file.path!=='runtime/pnpm-workspace.yaml');
  const bytes=gzipSync(JSON.stringify(payload)), filename=path.join(f.output,'no-boundary.blog.json.gz');
  await fs.writeFile(filename,bytes);
  await assert.rejects(readPackage(filename,sha(bytes)),/Missing runtime file/);
});
test('case-only symlink roots are rejected on case-sensitive hosts', {skip:process.platform==='win32'?'Windows host: case-sensitive Linux execution remains unproven':false}, async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  const lower=path.join(f.root,'install'), upper=path.join(f.root,'Install');await fs.mkdir(lower);await fs.symlink(lower,upper,'dir');
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,upper),/roots are not supported/);
});

test('transient populated-directory EPERM and EBUSY retry then verify exact bytes', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output), waits=[];
  let attempts=0;
  const result=await installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename: async (from,to) => {
      assert.equal(await fs.readFile(path.join(from,'runtime/server/start.mjs'),'utf8'),'console.log(1)');
      if (++attempts < 3) throw Object.assign(new Error('simulated transient lock'),{code:attempts===1?'EPERM':'EBUSY'});
      await fs.rename(from,to);
    }, delay:async ms=>waits.push(ms)
  });
  assert.equal(result.status,'INSTALLED'); assert.equal(result.commitAttempts,3);
  assert.deepEqual(waits,[100,200]);
  assert.equal((await installPackage(p.packagePath,p.packageSha256,f.consumer)).status,'ALREADY_INSTALLED');
});

test('permanent rename failure is bounded and preserves staging, config and active pointer', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output), waits=[];
  await fs.mkdir(f.consumer); await fs.writeFile(path.join(f.consumer,'current.json'),'existing pointer');
  await fs.writeFile(path.join(f.consumer,'site.json'),'existing configuration');
  let failure;
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename: async()=>{throw Object.assign(new Error('simulated permanent lock'),{code:'EPERM'});}, delay:async ms=>waits.push(ms)
  }), error=>{failure=error;return error.code==='EPERM';});
  assert.equal(failure.installation.attempts,6); assert.deepEqual(waits,[100,200,400,800,1600]);
  assert.equal(failure.installation.phase,'commit');
  assert.equal(await fs.readFile(path.join(failure.installation.retainedPath,'runtime/server/start.mjs'),'utf8'),'console.log(1)');
  await assert.rejects(fs.stat(failure.installation.release),{code:'ENOENT'});
  await assert.rejects(fs.stat(failure.installation.release+'.install-lock'),{code:'ENOENT'});
  assert.equal(await fs.readFile(path.join(f.consumer,'current.json'),'utf8'),'existing pointer');
  assert.equal(await fs.readFile(path.join(f.consumer,'site.json'),'utf8'),'existing configuration');
});

test('nonretryable rename error fails immediately without activating a release', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename:async()=>{throw Object.assign(new Error('different filesystem'),{code:'EXDEV'});}, delay:async()=>assert.fail('must not retry')
  }), error=>error.code==='EXDEV' && error.installation.attempts===1);
  await assert.rejects(fs.stat(path.join(f.consumer,'current.json')),{code:'ENOENT'});
});

test('destination appearing between retries is preserved, never replaced', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  let destination, attempts=0;
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename:async(from,to)=>{destination=to;attempts++;throw Object.assign(new Error('transient'),{code:'EBUSY'});},
    delay:async()=>{await fs.mkdir(destination);await fs.writeFile(path.join(destination,'owner.txt'),'other owner');}
  }), error=>error.code==='INSTALL_DESTINATION_EXISTS' && error.installation.attempts===1);
  assert.equal(attempts,1); assert.equal(await fs.readFile(path.join(destination,'owner.txt'),'utf8'),'other owner');
});

test('concurrent cooperating installer cannot alter a pending installation', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  let release, unblock, started;
  const waiting=new Promise(resolve=>{started=resolve;});
  const blocked=new Promise(resolve=>{unblock=resolve;});
  const first=installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename:async(from,to)=>{release=to;started();await blocked;await fs.rename(from,to);}
  });
  await waiting;
  try {
    await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer),{code:'INSTALL_BUSY'});
    assert.equal((await fs.stat(release+'.install-lock')).isDirectory(),true);
  } finally {unblock();}
  assert.equal((await first).status,'INSTALLED');
  assert.equal((await installPackage(p.packagePath,p.packageSha256,f.consumer)).status,'ALREADY_INSTALLED');
});

test('post-rename byte changes never report installation success', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename:async(from,to)=>{await fs.rename(from,to);await fs.writeFile(path.join(to,'runtime/server/start.mjs'),'changed');}
  }), error=>/Installed source changed/.test(error.message) && error.installation.phase==='verify');
  await assert.rejects(fs.stat(path.join(f.consumer,'current.json')),{code:'ENOENT'});
});

test('lock cleanup failure preserves original commit diagnostics and retained files', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  let failure;
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    rename:async()=>{throw Object.assign(new Error('commit denied'),{code:'EPERM'});}, delay:async()=>{},
    removeLock:async()=>{throw Object.assign(new Error('cleanup busy'),{code:'EBUSY'});}
  }), error=>{failure=error;return error.code==='EPERM' && error.message==='commit denied';});
  assert.equal(failure.installation.attempts,6); assert.equal(failure.installation.phase,'commit');
  assert.equal(failure.installation.lockCleanup.code,'EBUSY');
  assert.equal((await fs.stat(failure.installation.lockCleanup.lock)).isDirectory(),true);
  assert.equal(await fs.readFile(path.join(failure.installation.retainedPath,'runtime/server/start.mjs'),'utf8'),'console.log(1)');
});

test('verified installation with failed lock cleanup is explicitly reported, not silently retried', async t => {
  const f=await fixture(t), p=await buildPackage(f.source,f.output);
  let failure;
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer, {
    removeLock:async()=>{throw Object.assign(new Error('cleanup busy'),{code:'EPERM'});}
  }), error=>{failure=error;return error.code==='INSTALL_LOCK_CLEANUP_FAILED';});
  assert.equal(failure.installation.completed,true); assert.equal(failure.installation.result.status,'INSTALLED');
  assert.equal(await fs.readFile(path.join(failure.installation.result.release,'runtime/server/start.mjs'),'utf8'),'console.log(1)');
  await assert.rejects(installPackage(p.packagePath,p.packageSha256,f.consumer),{code:'INSTALL_BUSY'});
  await assert.rejects(fs.stat(path.join(f.consumer,'current.json')),{code:'ENOENT'});
});

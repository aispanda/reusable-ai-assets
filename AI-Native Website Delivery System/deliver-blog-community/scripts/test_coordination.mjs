import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FILES, atomicWriteJson, hashFile, containedFile, validateEnvelope, reconcile, acknowledge, watchCoordination } from './coordination.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-coordination-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, 'packages'), evidenceRoot = path.join(root, 'evidence');
  await fs.mkdir(artifactRoot); await fs.mkdir(evidenceRoot);
  await fs.writeFile(path.join(artifactRoot, 'runtime.zip'), 'fictional deterministic archive');
  await fs.writeFile(path.join(evidenceRoot, 'test.txt'), 'fixture assertion');
  const options = { privateDir: root, artifactRoot, evidenceRoot };
  const source = {
    protocolVersion: 1, capability: 'deliver-blog-community', kind: 'source',
    messageId: randomUUID(), replyToId: null, status: 'READY_FOR_TARGET_INTEGRATION', ready: true,
    packageVersion: '0.1.0', packageSha256: await hashFile(path.join(artifactRoot, 'runtime.zip')),
    packagePath: 'runtime.zip', evidencePaths: ['test.txt'], defects: [], blockers: [],
  };
  const feedback = () => ({
    protocolVersion: 1, capability: 'deliver-blog-community', kind: 'consumer',
    messageId: randomUUID(), replyToId: source.messageId, status: 'DEFECTS_FOUND',
    packageVersion: source.packageVersion, packageSha256: source.packageSha256,
    evidencePaths: ['test.txt'], defects: [{ id: 'BLOG-01', severity: 'P2', summary: 'Fictional scenario failure.', evidencePaths: ['test.txt'] }], blockers: [],
  });
  await atomicWriteJson(root, FILES.source, source);
  const writeFeedback = value => atomicWriteJson(root, FILES.consumer, value);
  const state = async () => JSON.parse(await fs.readFile(path.join(root, FILES.state), 'utf8'));
  return { root, source, feedback, options, writeFeedback, state };
}

test('atomic writes replace complete JSON and leave no temporary file', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 20; i++) {
    await atomicWriteJson(f.root, 'atomic.json', { i, data: 'a'.repeat(8192) });
    assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'atomic.json'), 'utf8')).i, i);
  }
  assert.equal((await fs.readdir(f.root)).some(name => name.endsWith('.tmp')), false);
  await assert.rejects(atomicWriteJson(f.root, '../escaped.json', {}), { code: 'INVALID_PATH' });
});

test('one valid message creates a persisted outbox entry; restart deduplicates', async t => {
  const f = await fixture(t), message = f.feedback();
  await f.writeFeedback(message);
  const sourceBefore = await fs.readFile(path.join(f.root, FILES.source), 'utf8');
  const consumerBefore = await fs.readFile(path.join(f.root, FILES.consumer), 'utf8');
  assert.equal((await reconcile(f.options)).status, 'QUEUED');
  assert.equal((await reconcile(f.options)).status, 'DUPLICATE');
  const state = await f.state();
  assert.equal(state.outbox.length, 1);
  assert.equal(state.outbox[0].message.messageId, message.messageId);
  assert.equal(await fs.readFile(path.join(f.root, FILES.source), 'utf8'), sourceBefore);
  assert.equal(await fs.readFile(path.join(f.root, FILES.consumer), 'utf8'), consumerBefore);
});

test('conflicting duplicate source or consumer IDs cannot enqueue', async t => {
  const f = await fixture(t), message = f.feedback();
  await f.writeFeedback(message); await reconcile(f.options);
  await f.writeFeedback({ ...message, defects: [{ ...message.defects[0], summary: 'Changed bytes using the same ID.' }] });
  assert.equal((await reconcile(f.options)).reason, 'MESSAGE_ID_CONFLICT');
  await atomicWriteJson(f.root, FILES.source, { ...f.source, packageVersion: '0.2.0' });
  assert.equal((await reconcile(f.options)).reason, 'MESSAGE_ID_CONFLICT');
  assert.equal((await f.state()).outbox.length, 1);
});

test('old reply, wrong package hash, wrong version and modified archive fail closed', async t => {
  const f = await fixture(t);
  for (const [changes, expected] of [
    [{ replyToId: randomUUID() }, 'STALE_REPLY'],
    [{ packageSha256: '0'.repeat(64) }, 'PACKAGE_BINDING_MISMATCH'],
    [{ packageVersion: '0.2.0' }, 'PACKAGE_BINDING_MISMATCH'],
  ]) {
    await f.writeFeedback({ ...f.feedback(), ...changes });
    assert.equal((await reconcile(f.options)).reason, expected);
  }
  await fs.writeFile(path.join(f.options.artifactRoot, 'runtime.zip'), 'tampered archive');
  assert.equal((await reconcile(f.options)).reason, 'PACKAGE_HASH_MISMATCH');
  assert.equal((await f.state()).outbox.length, 0);
});

test('absolute paths inside configured roots pass; traversal and external paths fail', async t => {
  const f = await fixture(t);
  const evidence = path.join(f.options.evidenceRoot, 'test.txt');
  assert.equal(await containedFile(f.options.evidenceRoot, evidence), await fs.realpath(evidence));
  for (const supplied of ['../packages/runtime.zip', path.join(f.root, FILES.source)]) {
    await assert.rejects(containedFile(f.options.evidenceRoot, supplied), { code: 'PATH_ESCAPE' });
  }
  await f.writeFeedback({ ...f.feedback(), evidencePaths: ['../packages/runtime.zip'] });
  assert.equal((await reconcile(f.options)).reason, 'PATH_ESCAPE');
  const linkedDir = path.join(f.options.evidenceRoot, 'outside');
  await fs.symlink(f.options.artifactRoot, linkedDir, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(containedFile(f.options.evidenceRoot, 'outside/runtime.zip'), { code: 'PATH_ESCAPE' });
});

test('malformed/partial JSON and missing evidence never create work', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, FILES.consumer), '{');
  assert.equal((await reconcile(f.options)).reason, 'INVALID_JSON');
  await f.writeFeedback({ ...f.feedback(), evidencePaths: ['missing.txt'] });
  assert.equal((await reconcile(f.options)).status, 'WAITING');
  assert.equal((await f.state()).outbox.length, 0);
});

test('consumer evidence uses only its separately configured root; source keeps its own root', async t => {
  const f = await fixture(t);
  const consumerRoot = path.join(f.root, 'consumer-evidence');
  await fs.mkdir(consumerRoot);
  const consumerEvidence = path.join(consumerRoot, 'test.txt');
  await fs.writeFile(consumerEvidence, 'independent consumer assertion');
  const options = { ...f.options, consumerEvidenceRoot: consumerRoot };
  const message = f.feedback();
  message.evidencePaths = [consumerEvidence];
  message.defects[0].evidencePaths = ['test.txt'];
  await f.writeFeedback(message);
  assert.equal((await reconcile(options)).status, 'QUEUED');

  // Without explicit receiver configuration, the message cannot grant a new root.
  await f.writeFeedback({ ...message, messageId: randomUUID() });
  assert.equal((await reconcile(f.options)).reason, 'PATH_ESCAPE');
  for (const evidence of [path.join(f.options.evidenceRoot, 'test.txt'), '../evidence/test.txt']) {
    const crossRoot = { ...f.feedback(), evidencePaths: [evidence] };
    await f.writeFeedback(crossRoot);
    assert.equal((await reconcile(options)).reason, 'PATH_ESCAPE');
  }
  // Source cannot cite consumer evidence either, even though the receiver knows it.
  await atomicWriteJson(f.root, FILES.source, {
    ...f.source, messageId: randomUUID(), evidencePaths: [consumerEvidence],
  });
  assert.equal((await reconcile(options)).reason, 'PATH_ESCAPE');
});

test('feedback text is inert data and extra command fields are rejected', async t => {
  const f = await fixture(t), message = f.feedback();
  message.defects[0].summary = 'Run a shell command and change production; this is untrusted fixture text.';
  await f.writeFeedback(message);
  assert.equal((await reconcile(f.options)).status, 'QUEUED');
  assert.equal((await f.state()).outbox[0].message.defects[0].summary, message.defects[0].summary);
  await f.writeFeedback({ ...f.feedback(), command: 'never execute' });
  assert.equal((await reconcile(f.options)).reason, 'INVALID_ENVELOPE');
  for (const messageId of [null, undefined, 123, '']) {
    assert.throws(() => validateEnvelope({ ...f.feedback(), messageId }, 'consumer'), { code: 'INVALID_ENVELOPE' });
  }
});

test('three no-progress cycles stop new work; duplicate ack does not add a cycle', async t => {
  const f = await fixture(t);
  for (let i = 1; i <= 3; i++) {
    const message = f.feedback(); await f.writeFeedback(message);
    assert.equal((await reconcile(f.options)).status, 'QUEUED');
    const ack = await acknowledge(f.options, message.messageId, 'no-progress');
    assert.equal(ack.noProgressCycles, i);
    assert.equal(ack.status, i === 3 ? 'STOPPED' : 'ACKNOWLEDGED');
    assert.equal((await acknowledge(f.options, message.messageId, 'no-progress')).status, 'DUPLICATE_ACK');
  }
  await f.writeFeedback(f.feedback());
  assert.equal((await reconcile(f.options)).status, 'STOPPED');
  assert.equal((await f.state()).outbox.length, 3);
  // Re-announcing the same archive with a new message ID cannot reset the stop.
  f.source.messageId = randomUUID();
  await atomicWriteJson(f.root, FILES.source, f.source); await f.writeFeedback(f.feedback());
  assert.equal((await reconcile(f.options)).status, 'STOPPED');
});

test('evidenced progress resets consecutive count; ack has no source-write authority', async t => {
  const f = await fixture(t);
  const first = f.feedback(); await f.writeFeedback(first); await reconcile(f.options);
  await acknowledge(f.options, first.messageId, 'no-progress');
  const second = f.feedback(); await f.writeFeedback(second); await reconcile(f.options);
  await assert.rejects(acknowledge(f.options, second.messageId, 'resolved'), { code: 'INVALID_ACK' });
  assert.equal((await acknowledge(f.options, second.messageId, 'resolved', ['test.txt'])).noProgressCycles, 0);
  assert.equal((await f.state()).outbox[0].disposition, 'no-progress');
  await assert.rejects(acknowledge(f.options, randomUUID(), 'resolved', ['test.txt']), { code: 'UNKNOWN_MESSAGE' });
});

test('no-progress cycles accumulate across genuinely different versions and archive hashes', async t => {
  const f = await fixture(t);
  for (let i = 1; i <= 4; i++) {
    await fs.writeFile(path.join(f.options.artifactRoot, 'runtime.zip'), `package build ${i}`);
    Object.assign(f.source, {
      messageId: randomUUID(), packageVersion: `0.${i}.0`,
      packageSha256: await hashFile(path.join(f.options.artifactRoot, 'runtime.zip')),
    });
    await atomicWriteJson(f.root, FILES.source, f.source);
    const message = f.feedback(); await f.writeFeedback(message);
    const received = await reconcile(f.options);
    if (i <= 3) {
      assert.equal(received.status, 'QUEUED');
      const ack = await acknowledge(f.options, message.messageId, 'no-progress');
      assert.equal(ack.noProgressCycles, i);
      assert.equal(ack.status, i === 3 ? 'STOPPED' : 'ACKNOWLEDGED');
    } else {
      assert.equal(received.status, 'STOPPED');
      assert.equal((await f.state()).noProgressCycles, 3);
    }
  }
  assert.equal((await f.state()).outbox.length, 3);
});

test('BUILDING handshake binds exact source ID, proves no runtime, and adds no repair cycle', async t => {
  const f = await fixture(t);
  Object.assign(f.source, { status: 'BUILDING', ready: false, packageVersion: null, packageSha256: null, packagePath: null, evidencePaths: [] });
  await atomicWriteJson(f.root, FILES.source, f.source);
  const handshake = { ...f.feedback(), status: 'ACKNOWLEDGED', packageVersion: null, packageSha256: null, evidencePaths: [], defects: [] };
  await f.writeFeedback(handshake);
  assert.equal((await reconcile(f.options)).status, 'QUEUED');
  assert.equal((await f.state()).outbox[0].action, 'protocol-handshake');
  assert.equal((await acknowledge(f.options, handshake.messageId, 'handshake')).noProgressCycles, 0);
  assert.equal((await reconcile(f.options)).status, 'DUPLICATE');
  await f.writeFeedback({ ...handshake, messageId: randomUUID(), replyToId: randomUUID() });
  assert.equal((await reconcile(f.options)).reason, 'STALE_REPLY');
  await f.writeFeedback({ ...handshake, messageId: randomUUID(), evidencePaths: ['test.txt'] });
  assert.equal((await reconcile(f.options)).reason, 'INVALID_HANDSHAKE');
});

test('source BUILDING acknowledgement cannot cause an endless consumer ACK loop', async t => {
  const f = await fixture(t);
  Object.assign(f.source, { status: 'BUILDING', ready: false, packageVersion: null, packageSha256: null, packagePath: null, evidencePaths: [] });
  await atomicWriteJson(f.root, FILES.source, f.source);
  const first = { ...f.feedback(), status: 'ACKNOWLEDGED', packageVersion: null, packageSha256: null, evidencePaths: [], defects: [] };
  await f.writeFeedback(first); await reconcile(f.options);
  await acknowledge(f.options, first.messageId, 'handshake');
  // Source confirms that first consumer UUID while remaining BUILDING.
  Object.assign(f.source, { messageId: randomUUID(), replyToId: first.messageId });
  await atomicWriteJson(f.root, FILES.source, f.source);
  const repeated = { ...first, messageId: randomUUID(), replyToId: f.source.messageId };
  await f.writeFeedback(repeated);
  const result = await reconcile(f.options);
  assert.equal(result.status, 'HANDSHAKE_ALREADY_RECEIVED');
  assert.equal(result.initialMessageId, first.messageId);
  assert.equal((await f.state()).outbox.length, 1);
  assert.equal((await f.state()).noProgressCycles, 0);
});

test('watcher reconciles startup and atomically replaced feedback without polling', async t => {
  const f = await fixture(t), initial = f.feedback();
  await f.writeFeedback(initial);
  const observed = [];
  const watcher = watchCoordination(f.options, result => observed.push(result));
  t.after(() => watcher.close());
  await watcher.ready;
  assert.equal(observed[0].status, 'QUEUED');
  const next = f.feedback();
  const found = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('fs.watch did not reconcile feedback')), 3000);
    const originalPush = observed.push.bind(observed);
    observed.push = result => {
      originalPush(result);
      if (result.messageId === next.messageId && result.status === 'QUEUED') { clearTimeout(timeout); resolve(); }
    };
  });
  await f.writeFeedback(next); await found;
  await watcher.close();
  assert.equal((await f.state()).outbox.length, 2);
});

test('private writer lock prevents simultaneous lost-state updates', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, FILES.lock), '{"pid":0}');
  await assert.rejects(reconcile(f.options), { code: 'BUSY' });
  assert.equal(await fs.readFile(path.join(f.root, FILES.lock), 'utf8'), '{"pid":0}');
});

// File coordination only: no prompts, commands, deployment, or task-wake APIs.
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, watch } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILES = Object.freeze({
  source: 'blog-capability-signal.json',
  consumer: 'blog-capability-consumer-feedback.json',
  state: 'blog-capability-coordination-state.json',
  lock: '.blog-capability-coordination.lock',
});
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const isId = value => typeof value === 'string' && ID.test(value);
const HASH = /^[a-f0-9]{64}$/;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

export async function containedFile(root, supplied) {
  if (typeof supplied !== 'string' || !supplied || supplied.length > 2000 || /[\x00-\x1f]/.test(supplied)) {
    fail('INVALID_PATH', 'A bounded file path is required.');
  }
  // Reject foreign-platform absolute paths instead of interpreting them as relative.
  if (path.win32.isAbsolute(supplied) && !path.isAbsolute(supplied)) fail('PATH_ESCAPE', 'Foreign absolute path.');
  const realRoot = await fs.realpath(root);
  const resolved = path.resolve(realRoot, supplied);
  if (!inside(realRoot, resolved)) fail('PATH_ESCAPE', 'Path leaves its configured root.');
  const realFile = await fs.realpath(resolved);
  if (!inside(realRoot, realFile)) fail('PATH_ESCAPE', 'Symlink leaves its configured root.');
  if (!(await fs.stat(realFile)).isFile()) fail('INVALID_PATH', 'Expected an existing regular file.');
  return realFile;
}

export async function hashFile(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

export async function atomicWriteJson(directory, filename, value) {
  if (path.basename(filename) !== filename || filename === '.' || filename === '..') fail('INVALID_PATH', 'Filename must be local to the private directory.');
  const root = await fs.realpath(directory);
  const temporary = path.join(root, `.${filename}.${randomUUID()}.tmp`);
  const target = path.join(root, filename);
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, target);
  } finally {
    await handle?.close();
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

const readJson = async (directory, filename) => {
  const target = await containedFile(directory, filename);
  if ((await fs.stat(target)).size > 512 * 1024) fail('MESSAGE_TOO_LARGE', 'Message exceeds 512 KiB.');
  try { return JSON.parse(await fs.readFile(target, 'utf8')); }
  catch (error) { if (error instanceof SyntaxError) fail('INVALID_JSON', 'Message is not complete JSON.'); throw error; }
};
const fields = ['protocolVersion', 'capability', 'kind', 'messageId', 'replyToId', 'packageVersion', 'packageSha256', 'status', 'evidencePaths', 'defects', 'blockers'];

export function validateEnvelope(message, kind) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) fail('INVALID_ENVELOPE', 'Expected an object.');
  const required = [...fields, ...(kind === 'source' ? ['ready', 'packagePath'] : [])];
  if (required.some(key => !Object.hasOwn(message, key)) || Object.keys(message).some(key => !required.includes(key))) {
    fail('INVALID_ENVELOPE', 'Envelope fields do not match protocol v1.');
  }
  if (message.protocolVersion !== 1 || message.capability !== 'deliver-blog-community' || message.kind !== kind || !isId(message.messageId)) {
    fail('INVALID_ENVELOPE', 'Invalid version, capability, kind, or message ID.');
  }
  if (kind === 'consumer' ? !isId(message.replyToId) : !(message.replyToId === null || isId(message.replyToId))) fail('INVALID_REPLY', 'Invalid replyToId.');
  const statuses = kind === 'source'
    ? ['BUILDING', 'READY_FOR_TARGET_INTEGRATION', 'BLOCKED', 'STOPPED']
    : ['ACKNOWLEDGED', 'VALIDATED', 'DEFECTS_FOUND', 'BLOCKED'];
  if (!statuses.includes(message.status)) fail('INVALID_STATUS', 'Unknown status.');
  const handshake = kind === 'consumer' && message.status === 'ACKNOWLEDGED';
  const ready = (kind === 'consumer' && !handshake) || message.status === 'READY_FOR_TARGET_INTEGRATION';
  if (kind === 'source' && message.ready !== ready) fail('INVALID_READINESS', 'ready must agree with source status.');
  if (ready) {
    if (typeof message.packageVersion !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,99}$/.test(message.packageVersion) || !HASH.test(message.packageSha256)) fail('INVALID_PACKAGE', 'Ready messages require version and lowercase SHA-256.');
    if (kind === 'source' && (typeof message.packagePath !== 'string' || !message.packagePath)) fail('INVALID_PACKAGE', 'Ready source requires packagePath.');
  } else if (message.packageVersion !== null || message.packageSha256 !== null || (kind === 'source' && message.packagePath !== null)) {
    fail('INVALID_PACKAGE', 'Non-ready source must clear package fields.');
  }
  const paths = value => Array.isArray(value) && value.length <= 100 && value.every(p => typeof p === 'string' && p.length > 0 && p.length <= 2000);
  if (!paths(message.evidencePaths)) fail('INVALID_EVIDENCE', 'evidencePaths must be a bounded array of paths.');
  for (const key of ['defects', 'blockers']) {
    if (!Array.isArray(message[key]) || message[key].length > 100) fail('INVALID_FINDINGS', 'Findings must be bounded arrays.');
    const ids = new Set();
    for (const item of message[key]) {
      const allowed = ['id', 'summary', 'evidencePaths', ...(key === 'defects' ? ['severity', 'scenarioId'] : [])];
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k => !allowed.includes(k)) || typeof item.id !== 'string' || !item.id || item.id.length > 128 || ids.has(item.id) || typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 2000 || !paths(item.evidencePaths)) fail('INVALID_FINDINGS', 'Invalid finding fields or duplicate ID.');
      if (key === 'defects' && (!['P0', 'P1', 'P2', 'P3'].includes(item.severity) || (item.scenarioId !== undefined && (typeof item.scenarioId !== 'string' || item.scenarioId.length > 100)))) fail('INVALID_FINDINGS', 'Invalid severity/scenario.');
      ids.add(item.id);
    }
  }
  if (message.status === 'DEFECTS_FOUND' && !message.defects.length) fail('INVALID_FINDINGS', 'DEFECTS_FOUND requires a defect.');
  if (message.status === 'BLOCKED' && !message.blockers.length) fail('INVALID_FINDINGS', 'BLOCKED requires a blocker.');
  if (message.status === 'VALIDATED' && (!message.evidencePaths.length || message.defects.length || message.blockers.length)) fail('INVALID_EVIDENCE', 'VALIDATED needs evidence and no open findings.');
  if (handshake && (message.evidencePaths.length || message.defects.length || message.blockers.length)) fail('INVALID_HANDSHAKE', 'Handshake acknowledges protocol only, with no evidence or findings.');
  return message;
}

async function validatePaths(message, options) {
  const paths = [...message.evidencePaths, ...[...message.defects, ...message.blockers].flatMap(item => item.evidencePaths)];
  const evidenceRoot = message.kind === 'consumer'
    ? (options.consumerEvidenceRoot ?? options.evidenceRoot)
    : options.evidenceRoot;
  for (const evidence of new Set(paths)) await containedFile(evidenceRoot, evidence);
  if (message.kind === 'source' && message.ready) {
    const artifact = await containedFile(options.artifactRoot, message.packagePath);
    if (await hashFile(artifact) !== message.packageSha256) fail('PACKAGE_HASH_MISMATCH', 'Archive bytes do not match the advertised package.');
  }
}

const emptyState = () => ({ stateVersion: 1, sources: {}, processed: {}, outbox: [], packageKey: null, noProgressCycles: 0, stopped: false });
const initialState = async options => {
  try {
    const state = await readJson(options.privateDir, FILES.state);
    if (state.stateVersion !== 1 || !state.sources || !state.processed || !Array.isArray(state.outbox)) fail('INVALID_STATE', 'Private state is invalid; preserve it for investigation.');
    return state;
  } catch (error) { if (error.code === 'ENOENT') return emptyState(); throw error; }
};

async function withState(options, action) {
  const root = await fs.realpath(options.privateDir);
  const lockPath = path.join(root, FILES.lock);
  let lock;
  try { lock = await fs.open(lockPath, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') fail('BUSY', 'Another writer holds the private coordination lock.'); throw error; }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    const state = await initialState(options);
    const result = await action(state);
    await atomicWriteJson(root, FILES.state, state);
    return result;
  } finally { await lock.close(); await fs.unlink(lockPath); }
}

export async function reconcile(options) {
  const settings = { evidenceRoot: options.privateDir, ...options };
  return withState(settings, async state => {
    let feedback;
    try {
      const source = validateEnvelope(await readJson(settings.privateDir, FILES.source), 'source');
      const sourceDigest = digest(source);
      if (Object.hasOwn(state.sources, source.messageId) && state.sources[source.messageId] !== sourceDigest) fail('MESSAGE_ID_CONFLICT', 'Source reused its messageId for different bytes.');
      if (Object.hasOwn(state.processed, source.messageId)) fail('MESSAGE_ID_CONFLICT', 'messageId is already used by the consumer.');
      await validatePaths(source, settings);
      state.sources[source.messageId] = sourceDigest;
      if (!source.ready && source.status !== 'BUILDING') return { status: 'WAITING', reason: source.status };
      const key = source.ready ? `${source.packageVersion}:${source.packageSha256}` : null;
      // A new ID/version/archive is not evidence that the repair made progress.
      // Only an evidenced resolved acknowledgement resets consecutive failures.
      if (key) state.packageKey = key;
      feedback = validateEnvelope(await readJson(settings.privateDir, FILES.consumer), 'consumer');
      const contentHash = digest(feedback);
      if (Object.hasOwn(state.sources, feedback.messageId)) fail('MESSAGE_ID_CONFLICT', 'Consumer reused a source messageId.');
      const previous = Object.hasOwn(state.processed, feedback.messageId) ? state.processed[feedback.messageId] : null;
      if (previous) {
        if (previous.contentHash !== contentHash) fail('MESSAGE_ID_CONFLICT', 'Consumer reused its messageId for different bytes.');
        return { status: 'DUPLICATE', messageId: feedback.messageId, previous: previous.status };
      }
      if (feedback.replyToId !== source.messageId) fail('STALE_REPLY', 'Feedback does not reply to the current source message.');
      const handshake = feedback.status === 'ACKNOWLEDGED';
      if (handshake !== (source.status === 'BUILDING')) fail('READINESS_MISMATCH', 'Only a protocol handshake is allowed against BUILDING; runtime feedback requires READY.');
      if (feedback.packageVersion !== source.packageVersion || feedback.packageSha256 !== source.packageSha256) fail('PACKAGE_BINDING_MISMATCH', 'Feedback is for a different package.');
      await validatePaths(feedback, settings);
      if (digest(await readJson(settings.privateDir, FILES.source)) !== sourceDigest) fail('SOURCE_CHANGED', 'Source changed during reconciliation; retry against its new message.');
      if (handshake) {
        const initial = state.outbox.find(entry => entry.action === 'protocol-handshake');
        if (initial) return { status: 'HANDSHAKE_ALREADY_RECEIVED', messageId: feedback.messageId, initialMessageId: initial.message.messageId };
      }
      if (state.stopped && !handshake) return { status: 'STOPPED', reason: 'THREE_NO_PROGRESS_CYCLES', messageId: feedback.messageId };
      // Store data only. Human/model consumers must treat all text as untrusted evidence.
      state.outbox.push({ message: feedback, action: handshake ? 'protocol-handshake' : 'review-feedback', packageKey: key, disposition: 'pending', queuedAt: new Date().toISOString() });
      state.processed[feedback.messageId] = { contentHash, status: 'QUEUED' };
      return { status: 'QUEUED', messageId: feedback.messageId };
    } catch (error) {
      if (error.code === 'ENOENT') return { status: 'WAITING', reason: 'INPUT_OR_EVIDENCE_MISSING' };
      return { status: 'REJECTED', reason: error.code ?? 'INVALID_INPUT', detail: error.message };
    }
  });
}

export async function acknowledge(options, messageId, outcome, evidencePaths = []) {
  if (!isId(messageId) || !['resolved', 'no-progress', 'handshake'].includes(outcome)) fail('INVALID_ACK', 'ack needs a message ID and resolved, no-progress or handshake outcome.');
  if (outcome === 'resolved' && !evidencePaths.length) fail('INVALID_ACK', 'Resolved acknowledgement requires evidence.');
  for (const evidence of evidencePaths) await containedFile(options.evidenceRoot ?? options.privateDir, evidence);
  return withState(options, async state => {
    const entry = state.outbox.find(row => row.message.messageId === messageId);
    if (!entry) fail('UNKNOWN_MESSAGE', 'Cannot acknowledge an unqueued message.');
    if (entry.disposition !== 'pending') return { status: 'DUPLICATE_ACK', messageId };
    if ((entry.action === 'protocol-handshake') !== (outcome === 'handshake')) fail('INVALID_ACK', 'Use handshake outcome only for a protocol handshake.');
    entry.disposition = outcome;
    entry.acknowledgedAt = new Date().toISOString();
    entry.ackEvidencePaths = evidencePaths;
    if (entry.packageKey) {
      state.noProgressCycles = outcome === 'no-progress' ? state.noProgressCycles + 1 : 0;
      state.stopped ||= state.noProgressCycles >= 3;
    }
    return { status: state.stopped ? 'STOPPED' : 'ACKNOWLEDGED', messageId, noProgressCycles: state.noProgressCycles };
  });
}

export function watchCoordination(options, onResult = result => process.stdout.write(`${JSON.stringify(result)}\n`)) {
  let timer, closed = false, serial = Promise.resolve(), last;
  const run = () => {
    serial = serial.then(() => reconcile(options)).then(result => {
      const encoded = JSON.stringify(result);
      if (encoded !== last) { onResult(result); last = encoded; }
    }).catch(error => onResult({ status: 'REJECTED', reason: error.code ?? 'IO_ERROR', detail: error.message }));
    return serial;
  };
  const watcher = watch(options.privateDir, (_event, filename) => {
    if (filename && ![FILES.source, FILES.consumer].includes(String(filename))) return;
    clearTimeout(timer);
    timer = setTimeout(() => { if (!closed) void run(); }, 40);
  });
  watcher.on('error', error => onResult({ status: 'REJECTED', reason: error.code ?? 'WATCH_ERROR' }));
  const ready = run(); // Reconcile before relying on subsequent events.
  return { ready, close: async () => { closed = true; clearTimeout(timer); watcher.close(); await serial; } };
}

async function cli(argv) {
  const options = {}, evidence = [];
  let mode, id, outcome;
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (['--once', '--watch', '--ack'].includes(argument)) {
      if (mode) fail('USAGE', 'Choose one mode.');
      mode = argument;
      if (mode === '--ack') id = argv[++i];
    } else if (['--private-dir', '--artifact-root', '--evidence-root', '--consumer-evidence-root', '--outcome', '--evidence'].includes(argument)) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) fail('USAGE', `Missing value for ${argument}.`);
      if (argument === '--outcome') outcome = value;
      else if (argument === '--evidence') evidence.push(value);
      else options[{ '--private-dir': 'privateDir', '--artifact-root': 'artifactRoot', '--evidence-root': 'evidenceRoot', '--consumer-evidence-root': 'consumerEvidenceRoot' }[argument]] = value;
    } else fail('USAGE', `Unknown option: ${argument}`);
  }
  if (!mode || !options.privateDir || (mode !== '--ack' && !options.artifactRoot)) fail('USAGE', 'Use --once|--watch|--ack ID with --private-dir and --artifact-root (except ack).');
  if (mode === '--watch') {
    const watcher = watchCoordination(options);
    const stop = async () => { await watcher.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    await watcher.ready;
  } else {
    const result = mode === '--ack' ? await acknowledge(options, id, outcome, evidence) : await reconcile(options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (['REJECTED', 'STOPPED'].includes(result.status)) process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${JSON.stringify({ status: 'REJECTED', reason: error.code ?? 'IO_ERROR', detail: error.message })}\n`);
    process.exitCode = 2;
  });
}

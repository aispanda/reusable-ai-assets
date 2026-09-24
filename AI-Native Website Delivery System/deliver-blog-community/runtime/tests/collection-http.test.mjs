// Real local Auth/Firestore; deterministic object storage tests the provider boundary.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { createBlogServer } from '../server/server.mjs';
import { saveCollectionArtwork } from '../server/collection-artwork.mjs';

const projectId = 'demo-blog-collections';
const fixture = randomUUID();
const actors = {}, objects = new Map();
let app, db, auth, server, origin, png, revision = 0, generation = 0;
let storageFailure = false, afterSave;
const bucket = { file(path, options = {}) { return {
  async save(bytes, config) {
    assert.equal(config.preconditionOpts.ifGenerationMatch, 0);
    if (storageFailure) throw Error('Storage outage');
    assert.ok(!objects.has(path)); objects.set(path, { bytes: Buffer.from(bytes), generation: String(++generation) });
    await afterSave?.();
  },
  async getMetadata() { return [{ generation: objects.get(path)?.generation }]; },
  async delete(config) { assert.equal(config.ifGenerationMatch, objects.get(path)?.generation); objects.delete(path); },
  createReadStream() { const value = objects.get(path); assert.equal(options.generation, value?.generation); return Readable.from([value.bytes]); },
}; } };
const collection = (id, extra = {}) => ({ id, title: 'Woodland', subtitle: 'Explore the forest', description: 'An isolated test collection.', family: 'Nature', type: 'theme', order: 1, featured: false, image: '', imageAlt: 'A green woodland', ...extra });
async function request(body, { actor = 'administrator', image, type = 'image/png', requestOrigin = origin } = {}) {
  const headers = { Origin: requestOrigin, ...(actor ? { Authorization: `Bearer ${actors[actor].token}` } : {}) };
  let payload;
  if (image) { payload = new FormData(); payload.set('file', new Blob([image], { type }), 'cover.png'); payload.set('collection', JSON.stringify(body)); }
  else { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const response = await fetch(origin + '/api/content/collections', { method: 'POST', headers, body: payload });
  return { status: response.status, body: await response.json() };
}
const create = (id, options) => request({ action: 'create', expectedRevision: revision, collection: collection(id) }, options);
before(async () => {
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) assert.match(process.env[name] || '', /^(127\.0\.0\.1|localhost):\d+$/, `${name} must be local; no cloud tests`);
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined, 'No live credential file in an emulator run');
  process.env.METADATA_SERVER_DETECTION = 'none';
  app = initializeApp({ projectId }, fixture); db = getFirestore(app); auth = getAuth(app);
  assert.equal((await db.collection('contentCollections').doc('registry').get()).exists, false, 'Use a fresh demo emulator; never overwrite existing registry data');
  for (const role of ['administrator', 'publisher', 'author', 'commenter']) {
    const uid = `${fixture}-${role}`, email = `${uid}@example.test`, password = `Local-${randomUUID()}`;
    await auth.createUser({ uid, email, password, emailVerified: true });
    await db.collection('studioAccess').doc(uid).set({ active: true, role });
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    assert.equal(response.status, 200); actors[role] = { uid, token: (await response.json()).idToken };
  }
  png = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#246341' } }).png().toBuffer();
  const port = Number(process.env.BLOG_COLLECTION_TEST_PORT || 18189); origin = `http://127.0.0.1:${port}`;
  server = createBlogServer({ db, auth, bucket, siteOrigin: origin, distRoot: fileURLToPath(new URL('../dist', import.meta.url)), runtimeConfig: {
    environment: 'staging', siteOrigin: origin, firebase: { projectId, apiKey: 'demo-key', authDomain: `${projectId}.firebaseapp.com`, storageBucket: `${projectId}.appspot.com`, messagingSenderId: '123456789', appId: '1:123456789:web:demo' }, googleClientId: 'demo.apps.googleusercontent.com',
  } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (db) {
    // Only rows attributable to this run; the registry was required to be absent.
    if (Object.keys(actors).length) await db.collection('contentCollections').doc('registry').delete();
    for (const actor of Object.values(actors)) {
      for (const [name, field] of [['collectionImages', 'createdBy'], ['contentAuditEvents', 'actorUid']]) {
        const rows = await db.collection(name).where(field, '==', actor.uid).get();
        for (const row of rows.docs) await row.ref.delete();
      }
      await db.collection('studioAccess').doc(actor.uid).delete(); await auth.deleteUser(actor.uid);
    }
    await db.terminate();
  }
  if (app) await deleteApp(app);
});

test('anonymous list is empty; collection writes require administrator, current revision and same origin', async () => {
  const response = await fetch(origin + '/api/content/collections'); assert.equal(response.status, 200); assert.deepEqual((await response.json()).collections, []);
  assert.equal((await create('blocked', { actor: null })).status, 401);
  for (const actor of ['author', 'publisher', 'commenter']) assert.equal((await create('blocked', { actor })).status, 403);
  assert.equal((await create('blocked', { requestOrigin: 'https://foreign.example' })).status, 403);
  const result = await create('woodland'); assert.equal(result.status, 200); revision = result.body.revision;
  assert.equal((await request({ action: 'update', expectedRevision: 0, collection: collection('woodland') })).status, 409);
});

test('validated image and collection commit together; anonymous GET/HEAD use exact stored generation', async () => {
  const result = await create('illustrated', { image: png }); assert.equal(result.status, 200, JSON.stringify(result.body)); revision = result.body.revision;
  const art = result.body.collections.find(row => row.id === 'illustrated').art;
  const response = await fetch(origin + art.src); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 32);
  assert.equal((await fetch(origin + art.src, { method: 'HEAD' })).status, 200);
  const updated = await request({ action: 'update', expectedRevision: revision, collection: collection('illustrated', { image: art.src }) });
  assert.equal(updated.status, 200); revision = updated.body.revision;
});

test('invalid images, unavailable storage and revoked access do not publish or leave confirmed orphan objects', async () => {
  const baseline = objects.size;
  assert.equal((await create('bad', { image: Buffer.from('not an image') })).status, 400);
  assert.equal((await create('bad', { image: png, actor: 'author' })).status, 403);
  storageFailure = true; assert.equal((await create('outage', { image: png })).status, 502); storageFailure = false;
  afterSave = () => db.collection('studioAccess').doc(actors.administrator.uid).update({ active: false });
  assert.equal((await create('revoked', { image: png })).status, 403); afterSave = undefined;
  await db.collection('studioAccess').doc(actors.administrator.uid).update({ active: true });
  assert.equal(objects.size, baseline); assert.equal((await db.collection('contentCollections').doc('registry').get()).data().revision, revision);
});

test('stale registry upload is cleaned; a lost successful transaction response preserves the committed image', async () => {
  const baseline = objects.size;
  assert.equal((await request({ action: 'create', expectedRevision: revision - 1, collection: collection('stale') }, { image: png })).status, 409);
  assert.equal(objects.size, baseline);
  const uncertainDb = { collection: name => db.collection(name), async runTransaction(fn) { await db.runTransaction(fn); throw Error('Response lost after commit'); } };
  await assert.rejects(saveCollectionArtwork({ db: uncertainDb, bucket, uid: actors.administrator.uid, bytes: png, mimeType: 'image/png', body: { action: 'create', expectedRevision: revision, collection: collection('committed') } }), error => error.statusCode === 502);
  const registry = (await db.collection('contentCollections').doc('registry').get()).data(); revision = registry.revision;
  assert.equal(objects.size, baseline + 1); assert.equal((await fetch(origin + registry.collections.find(row => row.id === 'committed').art.src)).status, 200);
});

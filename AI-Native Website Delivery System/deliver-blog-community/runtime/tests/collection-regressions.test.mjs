import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { articleCollectionIds, manageCollection } from '../server/collection-management.mjs';
import { createBlogServer } from '../server/server.mjs';

test('an unassigned constructor slug does not prevent deleting an unrelated collection', async () => {
  assert.deepEqual(articleCollectionIds('', 'constructor'), []);
  assert.deepEqual(articleCollectionIds('collection:nature', 'constructor'), ['nature']);
  const writes = [];
  const snapshot = data => ({ exists: data !== undefined, data: () => data });
  const registry = { collections: [{ id: 'nature', title: 'Nature', type: 'theme', order: 1 }], revision: 1 };
  const db = {
    collection: name => ({ name, doc: (id = 'audit') => ({ name, id }) }),
    runTransaction: run => run({
      async get(ref) {
        if (ref.name === 'studioAccess') return snapshot({ active: true, role: 'administrator' });
        if (ref.name === 'contentCollections') return snapshot(registry);
        return { docs: ref.name === 'contentDrafts' ? [snapshot({ slug: 'constructor', tags: '' })] : [] };
      },
      set: (ref, value) => writes.push({ ref, value }),
      create: (ref, value) => writes.push({ ref, value }),
    }),
  };
  const result = await manageCollection({ db, uid: 'admin', body: { action: 'delete', id: 'nature', expectedRevision: 1 } });
  assert.deepEqual(result.collections, []);
  assert.equal(result.revision, 2);
  assert.equal(writes.find(row => row.ref.name === 'contentAuditEvents').value.action, 'collection-delete');
});

test('public artwork stream failures terminate the response and leave the server usable', async t => {
  const id = '11111111-2222-4333-8444-555555555555';
  const bytes = Buffer.from('image-bytes');
  const asset = { id, objectPath: `collection-artwork/${id}.png`, contentType: 'image/png', generation: '1', size: bytes.length };
  const registry = { revision: 1, collections: [{ id: 'nature', title: 'Nature', order: 1, art: { src: `/content-assets/collections/${id}` } }] };
  const db = { collection: name => ({ doc: () => ({ get: async () => ({ exists: true, data: () => name === 'collectionImages' ? asset : registry }) }) }) };
  let failure = 'before-bytes';
  const bucket = { file(path, options) {
    assert.equal(path, asset.objectPath); assert.equal(options.generation, asset.generation);
    return { createReadStream: () => Readable.from((async function* () {
      if (!failure) { yield bytes; return; }
      if (failure === 'after-bytes') { yield bytes.subarray(0, 3); await setImmediate(); }
      throw Error('Simulated storage read failure');
    })()) };
  } };
  const server = createBlogServer({ db, bucket, auth: {}, distRoot: '.', siteOrigin: 'http://127.0.0.1',
    runtimeConfig: { firebase: { projectId: 'demo-collection-review', authDomain: 'demo-collection-review.firebaseapp.com' } } });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const mode of ['before-bytes', 'after-bytes']) {
    failure = mode;
    await assert.rejects(fetch(origin + registry.collections[0].art.src, { signal: AbortSignal.timeout(3000) })
      .then(response => response.arrayBuffer()), error => error.name !== 'TimeoutError');
    const response = await fetch(origin + '/api/content/collections');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).revision, 1);
  }
  failure = null;
  const response = await fetch(origin + registry.collections[0].art.src);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
});

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadCollectionProfile } from '../server/collection-profile.mjs';
import { collectionArtworkInput } from '../src/scripts/collection-artwork-input.mjs';

const file = () => new File(['image bytes'], 'cover.png', { type: 'image/png' });
const body = { action: 'create', expectedRevision: 0, collection: { id: 'nature', imageAlt: 'A woodland' } };
function fixture(fetcher = async () => ({ ok: true, json: async () => ({ revision: 1 }) })) {
  const revoked = [], calls = [];
  const input = collectionArtworkInput({ getToken: async () => 'local-fixture-token',
    fetcher: (...args) => { calls.push(args); return fetcher(...args); },
    urls: { createObjectURL: () => 'blob:fixture', revokeObjectURL: value => revoked.push(value) } });
  return { input, revoked, calls };
}

test('selection and cancellation stay local; failed validation preserves previous selection', async () => {
  const { input, calls, revoked } = fixture();
  input.select(file());
  assert.throws(() => input.select(new File(['x'], 'bad.svg', { type: 'image/svg+xml' })), /PNG/);
  assert.equal(input.previewUrl, 'blob:fixture');
  input.cancel();
  assert.equal(input.previewUrl, null); assert.equal(calls.length, 0); assert.equal(revoked.length, 1);
});

test('explicit save sends multipart with auth and revision; success clears preview', async () => {
  const { input, calls } = fixture(); input.select(file());
  await assert.rejects(input.save({ collection: { imageAlt: '' } }), /description/);
  assert.equal(calls.length, 0);
  assert.deepEqual(await input.save(body), { revision: 1 });
  const [url, request] = calls[0];
  assert.equal(url, '/api/content/collections'); assert.equal(request.headers.Authorization, 'Bearer local-fixture-token');
  assert.equal(request.headers['Content-Type'], undefined, 'Browser supplies the multipart boundary');
  assert.deepEqual(JSON.parse(request.body.get('collection')), body);
  assert.equal(request.body.get('file').name, 'cover.png'); assert.equal(input.previewUrl, null);
});

test('conflicts and network failures retain selection for correction without duplicate uploads', async () => {
  for (const fetcher of [async () => ({ ok: false, status: 409, json: async () => ({ error: 'Reload collections' }) }), async () => { throw Error('Offline'); }]) {
    const { input } = fixture(fetcher); input.select(file());
    await assert.rejects(input.save(body)); assert.equal(input.previewUrl, 'blob:fixture'); assert.equal(input.saving, false);
  }
});

test('in-flight save locks selection and rejects concurrent save; JSON save needs no file', async () => {
  let finish;
  const { input, calls } = fixture(() => new Promise(resolve => { finish = resolve; }));
  const saving = input.save(body); await Promise.resolve();
  assert.throws(() => input.select(file()), /Wait/); assert.throws(() => input.cancel(), /Wait/);
  await assert.rejects(input.save(body), /already/);
  finish({ ok: true, json: async () => ({ revision: 1 }) }); await saving;
  assert.equal(calls.length, 1); assert.equal(calls[0][1].headers['Content-Type'], 'application/json');
});

test('collection seeds are explicitly consumer-owned; malformed profiles fail closed', async t => {
  assert.deepEqual(loadCollectionProfile({}).topics, []);
  const root = await mkdtemp(join(tmpdir(), 'collection-profile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, 'collections.json');
  const valid = { topics: [{ id: 'nature', title: 'Nature', type: 'theme', order: 1,
    art: { src: '/art/woodland.webp', smallSrc: '/art/woodland-small.webp', alt: 'A woodland' } }],
    articleTopics: { woodland: ['nature'] }, articlePresentation: { woodland: { cover: '/art/woodland.webp' } }, approvedImages: ['/art/woodland.webp'] };
  await writeFile(path, JSON.stringify(valid));
  assert.equal(loadCollectionProfile({ BLOG_COLLECTION_PROFILE: path }).topics[0].title, 'Nature');
  const seed = changes => ({ ...valid, topics: [{ ...valid.topics[0], ...changes }] });
  for (const invalid of [
    { ...valid, token: 'not-allowed' },
    { ...valid, approvedImages: ['//foreign.example/image'] },
    { ...valid, approvedImages: ['/\\foreign.example/image'] },
    { ...valid, approvedImages: ['/art/\u0000woodland.webp'] },
    { ...valid, topics: [...valid.topics, ...valid.topics] },
    { ...valid, articleTopics: { woodland: ['missing'] } },
    { ...valid, articlePresentation: { woodland: null } },
    { ...valid, articlePresentation: { woodland: { cover: 'https://foreign.example/image' } } },
    seed({ id: 7 }), seed({ id: 'a'.repeat(81) }), seed({ title: 'a'.repeat(121) }),
    seed({ order: -1 }), seed({ order: 10001 }),
    seed({ art: { src: 'https://foreign.example/image', alt: 'A woodland' } }),
    seed({ art: { ...valid.topics[0].art, smallSrc: '/\\foreign.example/image' } }),
    seed({ art: { ...valid.topics[0].art, alt: '' } }),
  ]) {
    await writeFile(path, JSON.stringify(invalid));
    assert.throws(() => loadCollectionProfile({ BLOG_COLLECTION_PROFILE: path }), undefined, JSON.stringify(invalid));
  }
});

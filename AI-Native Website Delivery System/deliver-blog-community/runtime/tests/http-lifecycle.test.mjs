import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createBlogServer } from '../server/server.mjs';
import { createContentDocument } from '../server/studio-content-document.mjs';

const projectId = 'demo-blog-community';
const fixture = `http-${randomUUID()}`;
const draftId = `${fixture}-draft`;
const authorDraftId = `${fixture}-author-draft`;
const mediaDraftId = `${fixture}-media-draft`;
const title = `Disposable ${fixture}`;
const slug = fixture;
const port = Number(process.env.BLOG_TEST_HTTP_PORT ?? 18187);
const siteOrigin = `http://127.0.0.1:${port}`;
let app;
let db;
let auth;
let server;
const actors = {};
const createdUsers = [];
const localHost = (name) => {
  const value = process.env[name] ?? '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(value)) {
    throw new Error(`${name} must identify a local emulator; no live Firebase requests are permitted.`);
  }
  return value;
};
const draftPayload = (text) => ({
  title, slug, excerpt: 'Disposable HTTP publication fixture.', tags: 'testing',
  ...createContentDocument({
    type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }),
});
const revision = (record) => ({
  expectedUpdatedAt: record.updatedAt,
  expectedRevision: record.revision,
  expectedContentSha256: record.contentSha256,
});
const mutate = async (action, body, { actor = 'administrator', id = draftId, origin = siteOrigin, token } = {}) => {
  const authorization = token ?? actors[actor]?.token;
  const response = await fetch(`${siteOrigin}/api/content/drafts/${id}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Origin: origin,
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};
const succeeded = (result) => {
  assert.equal(result.status, 200, `Expected successful HTTP operation: ${JSON.stringify(result.body)}`);
  return result.body;
};
const readDraft = (id = draftId) => db.collection('contentDrafts').doc(id).get().then((snapshot) => snapshot.data());
const publicRead = async (url) => {
  // Node fetch has no browser cookie jar; these reads send neither cookies nor Authorization.
  const response = await fetch(url);
  return { status: response.status, body: await response.text() };
};
const index = async () => {
  const response = await fetch(`${siteOrigin}/api/content/articles`);
  assert.equal(response.status, 200);
  return (await response.json()).articles;
};

before(async () => {
  const authHost = localHost('FIREBASE_AUTH_EMULATOR_HOST');
  localHost('FIRESTORE_EMULATOR_HOST');
  // The local integration worker must not probe Google's VM metadata endpoint.
  process.env.METADATA_SERVER_DETECTION = 'none';
  assert.ok(Number.isInteger(port) && port > 1024 && port < 65536, 'Use an unprivileged local HTTP test port.');
  const distRoot = fileURLToPath(new URL('../dist', import.meta.url));
  await access(new URL('../dist/article-shell-internal/index.html', import.meta.url));
  app = initializeApp({ projectId }, fixture);
  db = getFirestore(app);
  auth = getAuth(app);
  for (const role of ['administrator', 'author']) {
    const uid = `${fixture}-${role}`;
    const email = `${uid}@example.test`;
    const password = `Local-fixture-${randomUUID()}`;
    await auth.createUser({ uid, email, password, emailVerified: true });
    createdUsers.push(uid);
    await db.collection('studioAccess').doc(uid).set({
      active: true, role, email, claimedAt: new Date().toISOString(),
    });
    const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.status, 200, 'Local Auth emulator sign-in must succeed.');
    const payload = await response.json();
    assert.equal(typeof payload.idToken, 'string');
    actors[role] = { uid, token: payload.idToken };
  }
  server = createBlogServer({
    db, auth, bucket: null, siteOrigin, distRoot,
    runtimeConfig: {
      environment: 'staging', siteOrigin,
      firebase: {
        projectId, authDomain: `${projectId}.firebaseapp.com`, apiKey: 'demo-key',
        storageBucket: `${projectId}.appspot.com`, messagingSenderId: '123456789', appId: '1:123456789:web:demo',
      },
      googleClientId: 'demo.apps.googleusercontent.com',
    },
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    // Delete only records belonging to this randomly named fixture, never whole collections.
    for (const id of [draftId, authorDraftId, mediaDraftId]) {
      const releases = await db.collection('contentReleases').where('draftId', '==', id).get();
      for (const release of releases.docs) {
        const manifest = release.data();
        for (const key of ['sourcePayloadId', 'bodyPayloadId', 'pagePayloadId']) {
          if (manifest[key]) await db.collection('contentReleasePayloads').doc(manifest[key]).delete();
        }
      }
      for (const collection of [
        'publishedContent', 'contentReleases', 'contentPublicationIndex', 'contentPublicationRequests',
        'contentPreviewReceipts', 'contentAuditEvents',
      ]) {
        const snapshot = await db.collection(collection).where('draftId', '==', id).get();
        for (const document of snapshot.docs) await document.ref.delete();
      }
      await db.collection('contentDrafts').doc(id).delete();
    }
    for (const uid of createdUsers) {
      await db.collection('studioAccess').doc(uid).delete();
      await auth.deleteUser(uid);
    }
    await db.terminate();
  }
  if (app) await deleteApp(app);
});

test('AUTH-02 BLOG-14: HTTP rejects absent/invalid tokens and foreign origin without creating a draft', async () => {
  const body = { draft: draftPayload('UNAUTHORIZED'), expectedRevision: 0 };
  assert.equal((await mutate('save', body, { actor: 'anonymous' })).status, 401);
  assert.equal((await mutate('save', body, { token: 'invalid-token' })).status, 401);
  assert.equal((await mutate('save', body, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal(await readDraft(), undefined);
});

test('BLOG-01 BLOG-04–06 BLOG-08–10: real HTTP and Firestore preserve versions through the Admin publication lifecycle', async () => {
  const firstSave = succeeded(await mutate('save', { draft: draftPayload('HTTP_VERSION_ONE'), expectedRevision: 0 }));
  let current = await readDraft();
  assert.equal(current.ownerUid, actors.administrator.uid);
  assert.equal(current.publicationStatus, 'draft');
  assert.equal(current.contentSha256, firstSave.contentSha256);
  assert.deepEqual(current.content, draftPayload('HTTP_VERSION_ONE').content);
  assert.equal((await publicRead(`${siteOrigin}/${slug}`)).status, 404);

  const firstPreview = succeeded(await mutate('preview-document', revision(current)));
  const first = succeeded(await mutate('publish', {
    ...revision(current), previewReceiptId: firstPreview.receiptId, idempotencyKey: randomUUID(),
  }));
  assert.ok(first.releaseId);
  assert.equal(first.liveUrl, `${siteOrigin}/${slug}`);
  const firstPage = await publicRead(first.liveUrl);
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body, firstPreview.html);
  assert.match(firstPage.body, /HTTP_VERSION_ONE/);
  assert.ok((await index()).some((article) => article.slug === slug && article.title === title));

  current = await readDraft();
  assert.equal((await mutate('archive', { expectedUpdatedAt: current.updatedAt })).status, 409);
  succeeded(await mutate('save', { draft: draftPayload('HTTP_VERSION_TWO'), ...revision(current) }));
  current = await readDraft();
  assert.equal(current.publicationStatus, 'published-with-changes');
  assert.deepEqual(current.content, draftPayload('HTTP_VERSION_TWO').content);
  assert.deepEqual(await publicRead(first.liveUrl), firstPage);
  const secondPreview = succeeded(await mutate('preview-document', revision(current)));
  const second = succeeded(await mutate('publish', {
    ...revision(current), previewReceiptId: secondPreview.receiptId, idempotencyKey: randomUUID(),
  }));
  assert.notEqual(second.releaseId, first.releaseId);
  assert.equal(second.liveUrl, first.liveUrl);
  const secondPage = await publicRead(second.liveUrl);
  assert.equal(secondPage.status, 200);
  assert.equal(secondPage.body, secondPreview.html);
  assert.match(secondPage.body, /HTTP_VERSION_TWO/);
  assert.doesNotMatch(secondPage.body, /HTTP_VERSION_ONE/);
  const firstManifest = (await db.collection('contentReleases').doc(first.releaseId).get()).data();
  assert.equal((await db.collection('contentReleasePayloads').doc(firstManifest.pagePayloadId).get()).data().renderedPageHtml, firstPage.body);

  current = await readDraft();
  const unpublished = succeeded(await mutate('unpublish', { expectedUpdatedAt: current.updatedAt }));
  assert.equal((await publicRead(second.liveUrl)).status, 404);
  assert.equal((await index()).some((article) => article.slug === slug), false);
  const archived = succeeded(await mutate('archive', { expectedUpdatedAt: unpublished.updatedAt }));
  assert.equal((await readDraft()).archivedAt, archived.archivedAt);
  current = await readDraft();
  assert.equal((await mutate('save', { draft: draftPayload('FORBIDDEN_WHILE_TRASHED'), ...revision(current) })).status, 409);
  succeeded(await mutate('restore', { expectedUpdatedAt: archived.archivedAt }));
  current = await readDraft();
  assert.equal(current.archivedAt, undefined);
  assert.equal(current.publicationStatus, 'unpublished');
  assert.deepEqual(current.content, draftPayload('HTTP_VERSION_TWO').content);
  assert.equal((await publicRead(second.liveUrl)).status, 404);
  const audits = await db.collection('contentAuditEvents').where('draftId', '==', draftId).get();
  const actions = new Set(audits.docs.map((document) => document.data().action));
  for (const action of ['save', 'publish', 'unpublish', 'archive', 'restore']) assert.ok(actions.has(action), action);
});

test('BLOG-14: an authenticated Author can save and preview their own draft but HTTP publication is denied', async () => {
  const options = { actor: 'author', id: authorDraftId };
  const draft = { ...draftPayload('AUTHOR_PRIVATE_DRAFT'), slug: `${slug}-author` };
  succeeded(await mutate('save', { draft, expectedRevision: 0 }, options));
  const current = await readDraft(authorDraftId);
  const preview = succeeded(await mutate('preview-document', revision(current), options));
  assert.equal((await mutate('publish', {
    ...revision(current), previewReceiptId: preview.receiptId, idempotencyKey: randomUUID(),
  }, options)).status, 403);
  assert.deepEqual(await readDraft(authorDraftId), current);
  assert.equal((await publicRead(`${siteOrigin}/${draft.slug}`)).status, 404);
});

test('EDIT-03/04: media-v2 HTTP save/reload/preview/republish preserves live bytes and rejects unsafe video data', async () => {
  const options = { id: mediaDraftId };
  const first = { ...draftPayload('MEDIA_ORIGINAL'), slug: `${slug}-media` };
  succeeded(await mutate('save', { draft: first, expectedRevision: 0 }, options));
  let record = await readDraft(mediaDraftId);
  const originalPreview = succeeded(await mutate('preview-document', revision(record), options));
  const live = succeeded(await mutate('publish', { ...revision(record), previewReceiptId: originalPreview.receiptId, idempotencyKey: randomUUID() }, options));
  const originalPage = await publicRead(live.liveUrl);
  const media = { ...first, ...createContentDocument({ type: 'doc', content: [...first.content.content, { type: 'youtube', attrs: { videoId: 'AbCdEf12_-3' } }] }) };
  record = await readDraft(mediaDraftId);
  const saved = succeeded(await mutate('save', { draft: media, ...revision(record) }, options));
  record = await readDraft(mediaDraftId);
  assert.equal(record.schemaVersion, 2); assert.equal(record.contentSha256, saved.contentSha256);
  assert.deepEqual(record.content, media.content);
  assert.deepEqual(await publicRead(live.liveUrl), originalPage);
  const forged = structuredClone(media); forged.content.content.at(-1).attrs.src = 'https://evil.example/embed';
  assert.equal((await mutate('save', { draft: forged, ...revision(record) }, options)).status, 400);
  assert.deepEqual(await readDraft(mediaDraftId), record);
  const preview = succeeded(await mutate('preview-document', revision(record), options));
  assert.match(preview.previewHtml, /Content-Security-Policy/);
  assert.match(preview.previewHtml, /data-youtube-load/);
  assert.doesNotMatch(preview.previewHtml, /<iframe\b/);
  const published = succeeded(await mutate('publish', { ...revision(record), previewReceiptId: preview.receiptId, idempotencyKey: randomUUID() }, options));
  assert.equal(published.liveUrl, live.liveUrl);
  const currentPage = await publicRead(live.liveUrl);
  assert.equal(currentPage.body, preview.html);
  assert.match(currentPage.body, /data-youtube-id="AbCdEf12_-3"/);
  record = await readDraft(mediaDraftId);
  succeeded(await mutate('unpublish', { expectedUpdatedAt: record.updatedAt }, options));
  assert.equal((await publicRead(live.liveUrl)).status, 404);
});

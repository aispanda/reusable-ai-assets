// Real isolated Firestore + current target source. Backend/rules evidence, not OAuth or UI evidence.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { before, after, test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS);
const runtime = root;
const require = createRequire(resolve(runtime, 'package.json'));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const rules = require('@firebase/rules-unit-testing');
const client = require('firebase/firestore');
const publishing = await import(pathToFileURL(resolve(runtime, 'server/content-publishing.mjs')));
const workflow = await import(pathToFileURL(resolve(runtime, 'server/editorial-workflow.mjs')));
const { createContentDocument } = await import(pathToFileURL(resolve(runtime, 'server/studio-content-document.mjs')));
const { manageCollection, listCollections } = await import(pathToFileURL(resolve(runtime, 'server/collection-management.mjs')));
const { resolveStudioContentAsset } = await import(pathToFileURL(resolve(runtime, 'server/studio-content-assets.mjs')));
const { manageAccess } = await import(pathToFileURL(resolve(runtime, 'server/editorial-access.mjs')));
const projectId = 'demo-blog-community';
let app, db, environment;
let clock = Date.parse('2026-09-08T01:00:00Z');
const now = () => new Date(clock += 1000);
const actors = { author: 'author', other: 'author', publisher: 'publisher', admin: 'administrator', reader: 'commenter' };
const payload = (id, text = 'A reader considers the story with care.', layout = 'classic-reading') => ({
  title: 'A careful reading', slug: id, excerpt: 'An isolated editorial test.', tags: 'collection:reading',
  ...createContentDocument({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }, layout),
});
const record = async id => (await db.collection('contentDrafts').doc(id).get()).data();
const evidence = d => ({ expectedUpdatedAt: d.updatedAt, expectedRevision: d.revision, expectedContentSha256: d.contentSha256 });
const denied = (operation, code = 403) => assert.rejects(operation, error => error.statusCode === code);
async function fresh(owner = 'author', layout = 'classic-reading') {
  const id = 'ai113-' + randomUUID();
  await publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: owner, publisherEmail: `${owner}@example.test`, draft: payload(id, undefined, layout), expectedRevision: 0, now: now() });
  return id;
}
async function change(id, actor = 'author', text = 'The owner has refined this reading.') {
  return publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: actor, draft: payload(id, text), ...evidence(await record(id)), now: now() });
}
async function transition(id, action, uid = 'author', feedback) {
  return workflow.transitionReview({ db, uid, draftId: id, action, expectedUpdatedAt: (await record(id)).updatedAt, feedback, now: now() });
}
// Small valid production-template fixture; rendered application tests are a separate suite.
const template = '<!doctype html><html><head><title>@@BLOG_ARTICLE_TITLE@@</title></head><body>@@BLOG_ARTICLE_BODY@@</body></html>';
async function preview(id, uid = 'publisher') {
  return publishing.previewDraft({ db, draftId: id, publisherUid: uid, articleTemplate: template, origin: 'https://publisher.example', ...evidence(await record(id)), now: now() });
}
async function publish(id, uid = 'publisher') {
  const receipt = await preview(id, uid);
  return publishing.publishDraft({ db, draftId: id, publisherUid: uid, articleTemplate: template, origin: 'https://publisher.example', ...evidence(await record(id)), previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now() });
}
before(async () => {
  environment = await rules.initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8089, rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') } });
  app = initializeApp({ projectId }, projectId); db = getFirestore(app);
  await db.collection('contentCollections').doc('registry').set({revision:0,collections:[{id:'reading',title:'Reading',type:'text',order:10},{id:'philosophy',title:'Philosophy',type:'philosophy',order:20},{id:'practice',title:'Practice',type:'practice',order:30}]});
  for (const [uid, role] of Object.entries(actors)) await db.collection('studioAccess').doc(uid).set({ active: true, role, email: `${uid}@example.test`, claimedAt: now().toISOString() });
  await db.collection('userProfiles').doc('author').set({ displayName: 'Original Author' });
  await db.collection('userProfiles').doc('publisher').set({ displayName: 'Publisher Writer' });
});
after(async () => { await db?.terminate(); await environment?.cleanup(); if (app) await deleteApp(app); });

test('AI113-PRIV-01: private drafts cannot be listed, previewed, changed or read directly by another owner, Publisher or Admin', async () => {
  const id = await fresh();
  for (const uid of ['other', 'publisher', 'admin']) {
    await denied(change(id, uid));
    await denied(preview(id, uid));
    const result = await workflow.listEditorialDrafts({ db, uid });
    assert.ok(!JSON.stringify(result.drafts).includes(id), `${uid} list exposes private draft`);
    const store = environment.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: true }).firestore();
    await rules.assertFails(client.getDoc(client.doc(store, 'contentDrafts', id)));
    await rules.assertFails(client.getDocs(client.collection(store, 'contentDrafts')));
  }
  const store = environment.authenticatedContext('author', { email_verified: true }).firestore();
  await rules.assertSucceeds(client.getDoc(client.doc(store, 'contentDrafts', id)));
});
test('AI113-ROLE-08: Administrator inherits Publisher review and publication rights without inheriting another Author’s draft ownership', async () => {
  const id = await fresh();
  const adminStore = environment.authenticatedContext('admin', { email: 'admin@example.test', email_verified: true }).firestore();

  // Before submission, Administrator has neither a list entry nor a read/edit
  // route to this Author's private draft.
  await denied(change(id, 'admin'));
  await denied(preview(id, 'admin'));
  assert.ok(!(await workflow.listEditorialDrafts({ db, uid: 'admin' })).drafts.some(draft => draft.id === id));

  await transition(id, 'submit');
  const submitted = await record(id);
  const reviewRow = (await workflow.listEditorialDrafts({ db, uid: 'admin' })).drafts.find(draft => draft.id === id);
  assert.equal(reviewRow?.reviewStatus, 'submitted');
  assert.equal(reviewRow?.ownerUid, 'author');
  // The backend’s submission DTO is the only reviewer data route; direct
  // Firestore reads remain owner-only even after submission.
  await rules.assertFails(client.getDoc(client.doc(adminStore, 'contentDrafts', id)));
  await denied(change(id, 'admin'));

  await transition(id, 'return', 'admin', 'Clarify the lived question before interpreting it.');
  assert.equal((await record(id)).reviewHistory.at(-1).actorUid, 'admin');
  await change(id);
  await transition(id, 'submit');
  const approvedRevision = await record(id);
  const receipt = await preview(id, 'admin');
  await publishing.publishDraft({
    db, draftId: id, publisherUid: 'admin', articleTemplate: template,
    origin: 'https://publisher.example', ...evidence(approvedRevision),
    previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now(),
  });
  const publicArticle = (await db.collection('publishedContent').doc(id).get()).data();
  assert.equal(publicArticle.ownerUid, 'author');
  assert.equal(publicArticle.publisherUid, 'admin');
  const publicationAudit = (await db.collection('contentAuditEvents').where('draftId', '==', id).get()).docs
    .map(snapshot => snapshot.data()).find(event => event.action === 'publish');
  assert.equal(publicationAudit?.actorUid, 'admin');

  // Publisher is still not an Administrator: neither access grants nor
  // collection management can be reached through the inherited review role.
  await denied(manageAccess({ db, user: { uid: 'publisher' }, body: { action: 'set-access', uid: 'author', active: true, role: 'author' }, now: now() }));
  const registry = await listCollections(db);
  await denied(manageCollection({ db, uid: 'publisher', body: { action: 'archive', id: 'reading', expectedRevision: registry.revision } }));
});
test('AI113-PRIV-02: private image cannot bypass draft privacy through an asset ID', async () => {
  const id = await fresh(), assetId = randomUUID();
  await db.collection('contentAssets').doc(assetId).set({ id: assetId, draftId: id, status: 'ready', contentType: 'image/png', objectPath: `studio-content/${id}/${assetId}.png`, generation: '1', size: 100, width: 20, height: 20 });
  const bucket = { file: () => ({ fixture: true }) };
  for (const uid of ['other', 'publisher', 'admin']) await denied(resolveStudioContentAsset({ db, bucket, assetId, user: { uid } }));
  assert.equal((await resolveStudioContentAsset({ db, bucket, assetId, user: { uid: 'author' } })).isPublic, false);
  // This image was uploaded but is not referenced by the submitted document.
  await transition(id, 'submit');
  for (const uid of ['publisher', 'admin']) await denied(resolveStudioContentAsset({ db, bucket, assetId, user: { uid } }));
});
test('AI113-REV-01: submission freezes content; return includes feedback and hides subsequent private changes', async () => {
  const id = await fresh(); await transition(id, 'submit');
  assert.equal((await record(id)).reviewStatus, 'submitted');
  await preview(id);
  await denied(change(id), 409);
  await denied(change(id, 'publisher'));
  await denied(transition(id, 'return', 'publisher', ''), 400);
  await transition(id, 'return', 'publisher', 'Please explain the final passage.');
  const returned = await record(id);
  assert.equal(returned.reviewStatus, 'returned');
  assert.ok(JSON.stringify(returned).includes('Please explain the final passage.'));
  await change(id);
  await denied(preview(id));
  assert.ok(!JSON.stringify((await workflow.listEditorialDrafts({ db, uid: 'publisher' })).drafts).includes(id));
  await transition(id, 'submit'); await publish(id);
  assert.equal((await record(id)).publicationStatus, 'published');
});
test('AI113-REV-02: withdrawal invalidates a previously issued preview and prevents publication', async () => {
  const id = await fresh(); await transition(id, 'submit'); const prior = await record(id), receipt = await preview(id);
  await transition(id, 'withdraw');
  await assert.rejects(publishing.publishDraft({ db, draftId: id, publisherUid: 'publisher', articleTemplate: template, origin: 'https://publisher.example', ...evidence(prior), previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now() }));
  assert.equal((await db.collection('publishedContent').doc(id).get()).exists, false);
  await change(id);
});
test('AI113-PUB-01: Author cannot self-publish; Publisher self-publishes all three layouts', async () => {
  const authorId = await fresh(); await denied(publish(authorId, 'author'));
  for (const layout of ['classic-reading', 'visual-journey', 'study-reflection']) {
    const id = await fresh('publisher', layout); await publish(id);
    assert.equal((await record(id)).layout, layout);
    assert.equal((await db.collection('publishedContent').doc(id).get()).exists, true);
  }
});
test('AI113-PUB-02: private revision preserves live release; owning Author may unpublish but cannot trash retained article', async () => {
  const id = await fresh(); await transition(id, 'submit'); await publish(id);
  const original = (await db.collection('publishedContent').doc(id).get()).data();
  await change(id);
  assert.deepEqual((await db.collection('publishedContent').doc(id).get()).data(), original);
  await transition(id, 'submit');
  await denied(publishing.unpublishDraft({ db, draftId: id, publisherUid: 'other', expectedUpdatedAt: (await record(id)).updatedAt, now: now() }));
  await publishing.unpublishDraft({ db, draftId: id, publisherUid: 'author', expectedUpdatedAt: (await record(id)).updatedAt, now: now() });
  assert.equal((await db.collection('publishedContent').doc(id).get()).exists, false);
  assert.equal((await record(id)).reviewStatus, 'draft');
  await denied(preview(id));
  await assert.rejects(publishing.archiveDraft({ db, draftId: id, publisherUid: 'author', expectedUpdatedAt: (await record(id)).updatedAt, now: now() }));
  assert.ok(await record(id));
});
test('AI113-DELETE-01: published articles cannot be trashed; only Administrator can trash an unpublished article', async () => {
  const id = await fresh(); await transition(id, 'submit'); await publish(id);
  const beforeDraft = await record(id);
  const beforeIndex = (await db.collection('contentPublicationIndex').doc(id).get()).data();
  const beforePublic = (await db.collection('publishedContent').doc(id).get()).data();
  const beforeReleases = await db.collection('contentReleases').where('draftId', '==', id).get();
  for (const uid of ['author', 'publisher']) {
    await denied(publishing.archiveDraft({ db, draftId: id, publisherUid: uid, expectedUpdatedAt: beforeDraft.updatedAt, now: now() }));
  }
  await denied(publishing.archiveDraft({ db, draftId: id, publisherUid: 'admin', expectedUpdatedAt: beforeDraft.updatedAt, now: now() }), 409);
  assert.deepEqual(await record(id), beforeDraft);
  assert.deepEqual((await db.collection('contentPublicationIndex').doc(id).get()).data(), beforeIndex);
  assert.deepEqual((await db.collection('publishedContent').doc(id).get()).data(), beforePublic);
  assert.equal((await db.collection('contentReleases').where('draftId', '==', id).get()).size, beforeReleases.size);

  await publishing.unpublishDraft({ db, draftId: id, publisherUid: 'author', expectedUpdatedAt: beforeDraft.updatedAt, now: now() });
  const unpublished = await record(id);
  for (const uid of ['author', 'publisher']) {
    await denied(publishing.archiveDraft({ db, draftId: id, publisherUid: uid, expectedUpdatedAt: unpublished.updatedAt, now: now() }));
  }
  await publishing.archiveDraft({ db, draftId: id, publisherUid: 'admin', expectedUpdatedAt: unpublished.updatedAt, now: now() });
  assert.equal((await record(id)).archivedBy, 'admin');
  for (const uid of ['author', 'publisher', 'admin']) {
    const store = environment.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: true }).firestore();
    await rules.assertFails(client.deleteDoc(client.doc(store, 'contentDrafts', id)));
  }

  const neverPublished = await fresh('publisher');
  const neverPublishedDraft = await record(neverPublished);
  await denied(publishing.archiveDraft({ db, draftId: neverPublished, publisherUid: 'publisher', expectedUpdatedAt: neverPublishedDraft.updatedAt, now: now() }));
  await publishing.archiveDraft({ db, draftId: neverPublished, publisherUid: 'admin', expectedUpdatedAt: neverPublishedDraft.updatedAt, now: now() });
  assert.ok((await record(neverPublished)).archivedAt);
});
test('AI113-DELETE-02: Administrator discovers offline articles through last-public metadata, trashes and restores without reading private revisions', async () => {
  const id = await fresh(); await transition(id, 'submit'); await publish(id);
  const published = (await db.collection('publishedContent').doc(id).get()).data();
  await publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: 'author',
    draft: { ...payload(id, 'SECRET-UNSUBMITTED-BODY'), title: 'SECRET-UNSUBMITTED-TITLE', excerpt: 'SECRET-UNSUBMITTED-EXCERPT' },
    ...evidence(await record(id)), now: now() });
  await publishing.unpublishDraft({ db, draftId: id, publisherUid: 'author', expectedUpdatedAt: (await record(id)).updatedAt, now: now() });
  const metadata = (await workflow.listEditorialDrafts({ db, uid: 'admin' })).drafts.find(row => row.id === id);
  assert.equal(metadata?.administrationOnly, true);
  assert.equal(metadata.title, published.title);
  assert.equal(metadata.slug, published.slug);
  assert.deepEqual(metadata.tags, published.tags);
  assert.deepEqual(Object.keys(metadata).sort(), ['administrationOnly', 'id', 'ownerUid', 'publicationStatus', 'reviewStatus', 'slug', 'tags', 'title', 'updatedAt'].sort());
  assert.ok(!JSON.stringify(metadata).includes('SECRET-UNSUBMITTED'));
  for (const uid of ['other', 'publisher']) assert.ok(!(await workflow.listEditorialDrafts({ db, uid })).drafts.some(row => row.id === id));
  await denied(preview(id, 'admin'));
  await denied(change(id, 'admin'));
  await publishing.archiveDraft({ db, draftId: id, publisherUid: 'admin', expectedUpdatedAt: metadata.updatedAt, now: now() });
  const trashed = (await workflow.listEditorialDrafts({ db, uid: 'admin' })).drafts.find(row => row.id === id);
  assert.ok(trashed.archivedAt);
  assert.equal(trashed.administrationOnly, true);
  for (const uid of ['author', 'publisher']) await denied(publishing.restoreDraft({ db, draftId: id, publisherUid: uid, expectedUpdatedAt: trashed.updatedAt, now: now() }));
  await publishing.restoreDraft({ db, draftId: id, publisherUid: 'admin', expectedUpdatedAt: trashed.updatedAt, now: now() });
  const restored = (await workflow.listEditorialDrafts({ db, uid: 'admin' })).drafts.find(row => row.id === id);
  assert.equal(restored.archivedAt, undefined);
  assert.equal((await record(id)).title, 'SECRET-UNSUBMITTED-TITLE');
  assert.equal((await db.collection('publishedContent').doc(id).get()).exists, false);
  assert.ok((await db.collection('contentReleases').doc(published.releaseId).get()).exists);
});
test('AI113-DER-01: derivatives require published original, preserve original and have separate Publisher ownership', async () => {
  const id = await fresh(); await transition(id, 'submit');
  await assert.rejects(workflow.deriveArticle({ origin: 'https://publisher.example', db, uid: 'publisher', slug: id, newDraftId: 'ai113-' + randomUUID(), now: now() }));
  await publish(id);
  const original = await record(id), newId = 'ai113-' + randomUUID();
  const result = await workflow.deriveArticle({ origin: 'https://publisher.example', db, uid: 'publisher', slug: id, newDraftId: newId, now: now() });
  assert.equal(result.draftId, newId);
  const derived = await record(newId);
  assert.equal(derived.ownerUid, 'publisher');
  assert.ok(JSON.stringify(derived).includes(id), 'Derivative must retain original reference');
  assert.deepEqual(await record(id), original);
  assert.equal((await db.collection('publishedContent').doc(newId).get()).exists, false);
  await publishing.saveCanonicalDraft({ db, draftId: newId, publisherUid: 'publisher', draft: { title: derived.title, slug: newId, excerpt: 'An attributed response.', tags: derived.tags, ...createContentDocument(derived.content, derived.layout) }, ...evidence(derived), now: now() });
  await publish(newId);
  const publishedOriginal = await publishing.loadPublishedArticle(db, id);
  const publishedDerivative = await publishing.loadPublishedArticle(db, newId);
  assert.equal(publishedOriginal.authorName, 'Original Author');
  assert.equal(publishedDerivative.authorName, 'Publisher Writer');
  assert.equal(publishedDerivative.derivedFrom.slug, id);
  assert.equal(publishedDerivative.derivedFrom.releaseId, publishedOriginal.releaseId);
  assert.deepEqual(await record(id), original);
  const manifest = (await db.collection('publishedContent').doc(newId).get()).data();
  assert.equal(manifest.authorName, 'Publisher Writer');
  assert.equal(manifest.derivedFrom.slug, id);
});
test('AI113-THREAD-01: only Admin creates threads; direct Firestore cannot bypass management API', async () => {
  const collection = { id: 'ai113-thread', title: 'A new thread', subtitle: 'A new subject', description: 'Independent acceptance fixture.', family: 'Sacred stories', order: 80, featured: false, image: '', imageAlt: '' };
  for (const uid of ['author', 'publisher', 'reader']) await denied(manageCollection({ db, uid, body: { action: 'create', collection, expectedRevision: 0 } }));
  await manageCollection({ db, uid: 'admin', body: { action: 'create', collection, expectedRevision: 0 } });
  const store = environment.authenticatedContext('publisher', { email_verified: true }).firestore();
  await rules.assertFails(client.setDoc(client.doc(store, 'contentCollections/registry'), { collections: [], revision: 99 }));
});
test('AI113-ROLE-01: public role application cannot request Administrator', async () => {
  const store = environment.authenticatedContext('reader', { email: 'reader@example.test', email_verified: true }).firestore();
  await rules.assertFails(client.setDoc(client.doc(store, 'roleRequests/reader'), { uid: 'reader', email: 'reader@example.test', currentRole: 'commenter', requestedRole: 'administrator', status: 'pending', createdAt: now().toISOString(), reviewedAt: '', reviewedBy: '', lastCancelledAt: '' }));
});

test('AI113-ROLE-02: default membership is Commentator; no client can directly grant privileged access', async () => {
  const uid = 'new-' + randomUUID(), email = `${uid}@example.test`;
  const store = environment.authenticatedContext(uid, { email, email_verified: true }).firestore();
  const reference = client.doc(store, 'studioAccess', uid);
  const base = { active: true, email, claimedAt: now().toISOString() };
  for (const role of ['author', 'publisher', 'administrator']) await rules.assertFails(client.setDoc(reference, { ...base, role }));
  await rules.assertSucceeds(client.setDoc(reference, { ...base, role: 'commenter' }));
  const adminStore = environment.authenticatedContext('admin', { email: 'admin@example.test', email_verified: true }).firestore();
  await rules.assertFails(client.updateDoc(client.doc(adminStore, 'studioAccess', uid), { role: 'administrator' }));
  await denied(manageAccess({ db, user: { uid: 'admin' }, body: { action: 'set-access', uid, active: true, role: 'administrator' }, now: now() }));
});

test('AI113-ROLE-03: Admin invitation requires matching verified Google identity, expires and is single-use', async () => {
  const uid = 'invite-' + randomUUID(), email = `${uid}@example.test`, user = { uid, email, email_verified: true, firebase: { sign_in_provider: 'google.com' } };
  await denied(manageAccess({ db, user: { uid: 'publisher' }, body: { action: 'invite-admin', email }, now: now() }));
  const invitation = await manageAccess({ db, user: { uid: 'admin' }, body: { action: 'invite-admin', email }, now: now() });
  for (const change of [{ email_verified: false }, { firebase: { sign_in_provider: 'password' } }]) await denied(manageAccess({ db, user: { ...user, ...change }, body: { action: 'claim-invite' }, now: now() }));
  assert.equal((await manageAccess({ db, user: { ...user, email: 'different@example.test' }, body: { action: 'claim-invite' }, now: now() })).claimed, false);
  assert.equal((await manageAccess({ db, user, body: { action: 'claim-invite' }, now: new Date(Date.parse(invitation.expiresAt) + 1) })).claimed, false);
  assert.equal((await manageAccess({ db, user, body: { action: 'claim-invite' }, now: now() })).claimed, true);
  assert.equal((await manageAccess({ db, user, body: { action: 'claim-invite' }, now: now() })).claimed, false);
  assert.equal((await manageAccess({ db, user: { ...user, uid: 'second-' + uid }, body: { action: 'claim-invite' }, now: now() })).claimed, false);
  assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role, 'administrator');
  await manageAccess({ db, user: { uid: 'admin' }, body: { action: 'set-access', uid, role: 'commenter', active: true }, now: now() });
});

test('AI113-ROLE-04: Author requests Publisher; denial feedback and approval remain atomic and cannot be replayed', async () => {
  const uid = 'applicant-' + randomUUID(), email = `${uid}@example.test`;
  await db.collection('studioAccess').doc(uid).set({ active: true, email, role: 'author', claimedAt: now().toISOString() });
  const store = environment.authenticatedContext(uid, { email, email_verified: true }).firestore();
  const request = { uid, email, currentRole: 'author', requestedRole: 'publisher', status: 'pending', createdAt: now().toISOString(), reviewedAt: '', reviewedBy: '', lastCancelledAt: '' };
  await rules.assertSucceeds(client.setDoc(client.doc(store, 'roleRequests', uid), request));
  const review = (decision, feedback = '') => manageAccess({ db, user: { uid: 'admin' }, body: { action: 'review-request', uid, decision, feedback }, now: now() });
  await denied(review('denied'), 400);
  assert.equal((await db.collection('roleRequests').doc(uid).get()).data().status, 'pending');
  await review('denied', 'Please share a sample of your editorial work.');
  assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role, 'author');
  const returned = await client.getDoc(client.doc(store, 'roleRequests', uid));
  assert.equal(returned.data().feedback, 'Please share a sample of your editorial work.');
  // Reapply through the client contract after denial; historical feedback must not block this.
  await rules.assertSucceeds(client.setDoc(client.doc(store, 'roleRequests', uid), { ...request, createdAt: now().toISOString() }));
  await review('approved');
  assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role, 'publisher');
  assert.equal((await db.collection('roleRequests').doc(uid).get()).data().status, 'approved');
  await denied(review('approved'), 409);
});

test('AI113-ROLE-05: final active Administrator cannot be revoked or demoted', async () => {
  for (const settings of [{ active: false, role: 'administrator' }, { active: true, role: 'commenter' }]) await denied(manageAccess({ db, user: { uid: 'admin' }, body: { action: 'set-access', uid: 'admin', ...settings }, now: now() }), 409);
  assert.equal((await db.collection('studioAccess').doc('admin').get()).data().active, true);
});

test('AI113-ROLE-09: concurrent Administrator removals cannot eliminate every active Administrator', async () => {
  const first = 'admin-race-a-' + randomUUID(), second = 'admin-race-b-' + randomUUID();
  await db.collection('studioAccess').doc('admin').update({ role: 'commenter' });
  try {
    for (const uid of [first, second]) await db.collection('studioAccess').doc(uid).set({ active: true, role: 'administrator', email: `${uid}@example.test`, claimedAt: now().toISOString() });
    const outcomes = await Promise.allSettled([
      manageAccess({ db, user: { uid: first }, body: { action: 'set-access', uid: first, active: true, role: 'commenter' }, now: now() }),
      manageAccess({ db, user: { uid: second }, body: { action: 'set-access', uid: second, active: true, role: 'commenter' }, now: now() }),
    ]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(result => result.status === 'rejected' && result.reason.statusCode === 409 && /final active administrator/i.test(result.reason.message)).length, 1);
    const activeAdministrators = (await db.collection('studioAccess').where('role', '==', 'administrator').get()).docs.filter(row => row.data().active === true);
    assert.equal(activeAdministrators.length, 1, 'exactly one active Administrator must survive concurrent changes');
  } finally {
    await db.collection('studioAccess').doc('admin').update({ active: true, role: 'administrator' });
  }
});

test('AI113-REV-03: stale and racing review actions cannot overwrite a newer decision', async () => {
  const id = await fresh(); const original = await record(id); await transition(id, 'submit');
  await denied(workflow.transitionReview({ db, uid: 'author', draftId: id, action: 'withdraw', expectedUpdatedAt: original.updatedAt, now: now() }), 409);
  const submitted = await record(id);
  const outcomes = await Promise.allSettled([
    workflow.transitionReview({ db, uid: 'author', draftId: id, action: 'withdraw', expectedUpdatedAt: submitted.updatedAt, now: now() }),
    workflow.transitionReview({ db, uid: 'publisher', draftId: id, action: 'return', expectedUpdatedAt: submitted.updatedAt, feedback: 'Explain this paragraph.', now: now() }),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected' && result.reason.statusCode === 409).length, 1);
  assert.ok(['draft', 'returned'].includes((await record(id)).reviewStatus));
});

test('AI113-SAVE-01: conflicting owner saves accept one revision and preserve its exact content against stale retries', async () => {
  const id = await fresh(), original = await record(id);
  const texts = ['The first tab offers a careful interpretation.', 'The second tab offers another interpretation.'];
  const save = text => publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: 'author', draft: payload(id, text), ...evidence(original), checkpoint: true, now: now() });
  const outcomes = await Promise.allSettled(texts.map(save));
  const winner = outcomes.findIndex(result => result.status === 'fulfilled');
  assert.notEqual(winner, -1);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected' && result.reason.statusCode === 409).length, 1);
  const stored = await record(id);
  assert.equal(stored.revision, original.revision + 1);
  assert.equal(stored.content.content[0].content[0].text, texts[winner]);
  assert.equal(stored.revisions.length, original.revisions.length + 1);
  await denied(save(texts[1 - winner]), 409);
  assert.deepEqual(await record(id), stored);
  assert.equal((await db.collection('publishedContent').doc(id).get()).exists, false);
});

test('AI113-ROLE-07: revocation or demotion invalidates an existing editor session and issued publish receipt without changing live content', async () => {
  for (const revoked of [{ active: false, role: 'publisher' }, { active: true, role: 'commenter' }]) {
    const uid = 'revoked-' + randomUUID();
    await db.collection('studioAccess').doc(uid).set({ active: true, role: 'publisher', email: `${uid}@example.test`, claimedAt: now().toISOString() });
    const id = await fresh(uid); await publish(id, uid); await change(id, uid);
    const prior = await record(id), receipt = await preview(id, uid);
    const live = (await db.collection('publishedContent').doc(id).get()).data();
    const store = environment.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: true }).firestore();
    await rules.assertSucceeds(client.getDoc(client.doc(store, 'contentDrafts', id)));
    await manageAccess({ db, user: { uid: 'admin' }, body: { action: 'set-access', uid, ...revoked }, now: now() });
    // Keep the same authenticated context and receipt: access must be checked anew.
    await denied(change(id, uid));
    await denied(transition(id, 'submit', uid));
    await denied(preview(id, uid));
    await denied(publishing.publishDraft({ db, draftId: id, publisherUid: uid, articleTemplate: template, origin: 'https://publisher.example', ...evidence(prior), previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now() }));
    await denied(publishing.unpublishDraft({ db, draftId: id, publisherUid: uid, expectedUpdatedAt: prior.updatedAt, now: now() }));
    await denied(workflow.listEditorialDrafts({ db, uid }));
    await rules.assertFails(client.getDocFromServer(client.doc(store, 'contentDrafts', id)));
    assert.deepEqual(await record(id), prior);
    assert.deepEqual((await db.collection('publishedContent').doc(id).get()).data(), live);
  }
});

test('AI113-PUB-03: real comments, ownership, checkpoints and release history survive unpublish/republish; public access follows publication', async () => {
  const id = await fresh();
  await publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: 'author', draft: payload(id, 'A checkpoint worth retaining.'), ...evidence(await record(id)), checkpoint: true, now: now() });
  await transition(id, 'submit'); await publish(id);
  const first = await record(id);
  const releaseRef = db.collection('contentReleases').doc(first.publicationReleaseId);
  const originalRelease = (await releaseRef.get()).data();
  await db.collection('userProfiles').doc('reader').set({ displayName: 'A Thoughtful Reader' });
  const reader = environment.authenticatedContext('reader', { email_verified: true }).firestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  const commentId = randomUUID(), path = `publishedContent/${id}/comments/${commentId}`, ownerPath = `publishedContent/${id}/commentOwners/${commentId}`;
  const addComment = () => {
    const batch = client.writeBatch(reader), createdAt = client.serverTimestamp();
    batch.set(client.doc(reader, path), { articleSlug: id, parentId: '', body: 'How does this teaching apply to grief?', authorName: 'A Thoughtful Reader', createdAt, updatedAt: createdAt, edited: false, deleted: false, deletedAt: null, likeCount: 0, pinned: false, pinnedAt: null });
    batch.set(client.doc(reader, ownerPath), { commentId, authorUid: 'reader', createdAt });
    return batch.commit();
  };
  await rules.assertSucceeds(addComment());
  const comment = (await db.doc(path).get()).data(), owner = (await db.doc(ownerPath).get()).data();
  assert.equal((await rules.assertSucceeds(client.getDocFromServer(client.doc(anonymous, path)))).data().body, comment.body);
  await rules.assertFails(client.getDoc(client.doc(anonymous, ownerPath)));
  await publishing.unpublishDraft({ db, draftId: id, publisherUid: 'author', expectedUpdatedAt: first.updatedAt, now: now() });
  assert.equal(await publishing.loadPublishedArticle(db, id), null);
  await rules.assertFails(client.getDocFromServer(client.doc(anonymous, path)));
  await rules.assertFails(client.getDocsFromServer(client.collection(anonymous, `publishedContent/${id}/comments`)));
  await rules.assertFails(client.getDocFromServer(client.doc(reader, ownerPath)));
  await rules.assertFails(client.updateDoc(client.doc(reader, path), { body: 'An edit while hidden.', edited: true, updatedAt: client.serverTimestamp() }));
  assert.deepEqual((await db.doc(path).get()).data(), comment);
  assert.deepEqual((await db.doc(ownerPath).get()).data(), owner);
  assert.deepEqual((await record(id)).revisions, first.revisions);
  assert.deepEqual((await record(id)).reviewHistory, first.reviewHistory);
  assert.deepEqual((await releaseRef.get()).data(), originalRelease);
  await transition(id, 'submit'); await publish(id);
  const second = await record(id);
  assert.notEqual(second.publicationReleaseId, first.publicationReleaseId);
  assert.deepEqual(second.revisions, first.revisions);
  assert.deepEqual(second.reviewHistory.slice(0, first.reviewHistory.length), first.reviewHistory);
  assert.deepEqual((await releaseRef.get()).data(), originalRelease);
  assert.deepEqual((await db.doc(path).get()).data(), comment);
  assert.deepEqual((await db.doc(ownerPath).get()).data(), owner);
  assert.equal((await rules.assertSucceeds(client.getDocFromServer(client.doc(anonymous, path)))).data().body, comment.body);
  await rules.assertSucceeds(client.getDocFromServer(client.doc(reader, ownerPath)));
  await rules.assertSucceeds(client.updateDoc(client.doc(reader, path), { body: 'A refined question after republication.', edited: true, updatedAt: client.serverTimestamp() }));
});

test('AI113-PUB-04: concurrent publish retries are idempotent and create one immutable release', async () => {
  const id = await fresh(); await transition(id, 'submit');
  const current = await record(id), receipt = await preview(id), requestId = randomUUID();
  const request = key => publishing.publishDraft({
    db, draftId: id, publisherUid: 'publisher', articleTemplate: template,
    origin: 'https://publisher.example', ...evidence(current),
    previewReceiptId: receipt.receiptId, idempotencyKey: key, now: now(),
  });
  const repeated = await Promise.all([request(requestId), request(requestId)]);
  assert.deepEqual(repeated[0], repeated[1]);
  const releases = await db.collection('contentReleases').where('draftId', '==', id).get();
  const audits = await db.collection('contentAuditEvents').where('draftId', '==', id).get();
  const requests = await db.collection('contentPublicationRequests').where('draftId', '==', id).get();
  assert.equal(releases.size, 1);
  assert.equal(requests.size, 1);
  assert.equal(audits.docs.filter(row => row.data().action === 'publish').length, 1);
  assert.equal((await db.collection('contentReleasePayloads').where('releaseId', '==', repeated[0].releaseId).get()).size, 3);
});

test('AI113-COM-11: whitespace-only comments and edits fail atomically at the database boundary', async () => {
  const id = await fresh(); await transition(id, 'submit'); await publish(id);
  await db.collection('userProfiles').doc('reader').set({ displayName: 'A Thoughtful Reader' });
  const reader = environment.authenticatedContext('reader', { email_verified: true }).firestore();
  const commentId = randomUUID(), commentRef = client.doc(reader, `publishedContent/${id}/comments/${commentId}`), ownerRef = client.doc(reader, `publishedContent/${id}/commentOwners/${commentId}`);
  const create = body => {
    const batch = client.writeBatch(reader), createdAt = client.serverTimestamp();
    batch.set(commentRef, { articleSlug: id, parentId: '', body, authorName: 'A Thoughtful Reader', createdAt, updatedAt: createdAt, edited: false, deleted: false, deletedAt: null, likeCount: 0, pinned: false, pinnedAt: null });
    batch.set(ownerRef, { commentId, authorUid: 'reader', createdAt });
    return batch.commit();
  };
  for (const whitespace of ['  \n\t ', '\u00a0', '\u2003', '\u3000']) {
    await rules.assertFails(create(whitespace));
    assert.equal((await db.doc(`publishedContent/${id}/comments/${commentId}`).get()).exists, false);
  }
  await rules.assertSucceeds(create('A question with substance.'));
  for (const whitespace of ['\n  \t', '\u00a0', '\u2003', '\u3000']) await rules.assertFails(client.updateDoc(commentRef, { body: whitespace, edited: true, updatedAt: client.serverTimestamp() }));
  assert.equal((await db.doc(`publishedContent/${id}/comments/${commentId}`).get()).data().body, 'A question with substance.');
});

test('AI113-MET-01: Admin metrics reveal only aggregates and reconcile newly saved articles', async () => {
  for (const uid of ['author', 'publisher', 'reader']) await denied(workflow.threadMetrics({ db, uid }));
  const beforeCounts = await workflow.threadMetrics({ db, uid: 'admin' });
  const id = await fresh(); const result = await workflow.threadMetrics({ db, uid: 'admin' });
  assert.equal(result.metrics.reading.draft, beforeCounts.metrics.reading.draft + 1);
  assert.ok(!JSON.stringify(result).includes(id));
  for (const metric of Object.values(result.metrics)) for (const value of Object.values(metric)) assert.ok(Number.isInteger(value) && value >= 0);
});

test('AI113-MET-02: private thread reassignment does not move Published counts until publication', async () => {
  const id = await fresh(); await transition(id, 'submit'); await publish(id);
  const baseline = (await workflow.threadMetrics({ db, uid: 'admin' })).metrics;
  await publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: 'author', draft: { ...payload(id), tags: 'collection:philosophy' }, ...evidence(await record(id)), now: now() });
  const result = (await workflow.threadMetrics({ db, uid: 'admin' })).metrics;
  assert.equal(result.reading.published, baseline.reading.published);
  assert.equal(result['philosophy'].published, baseline['philosophy'].published);
  assert.equal(result['philosophy'].pendingRevisions, baseline['philosophy'].pendingRevisions + 1);
});

test('AI113-PRIV-03: review list exposes submitted version, not private checkpoints or raw documents', async () => {
  const id = await fresh();
  await db.collection('contentDrafts').doc(id).update({ revisions: [{ privateMarker: 'PRIVATE-CHECKPOINT-CONTENT' }] });
  await transition(id, 'submit');
  for (const uid of ['publisher', 'admin']) {
    const result = await workflow.listEditorialDrafts({ db, uid });
    assert.ok(JSON.stringify(result.drafts).includes(id));
    assert.ok(!JSON.stringify(result.drafts).includes('PRIVATE-CHECKPOINT-CONTENT'));
    const row = result.drafts.find(d => d.id === id);
    assert.equal(row.ownerEmail, undefined);
    const store = environment.authenticatedContext(uid, { email_verified: true }).firestore();
    await rules.assertFails(client.getDoc(client.doc(store, 'contentDrafts', id)));
  }
});

test('AI113-THREAD-02: archive preserves live articles and owned work but blocks new assignment, submission and publication until restored', async () => {
  const tag = 'collection:ai113-thread';
  const liveId = 'ai113-' + randomUUID(), draftId = 'ai113-' + randomUUID();
  for (const id of [liveId, draftId]) await publishing.saveCanonicalDraft({ db, draftId: id, publisherUid: 'author', publisherEmail: 'author@example.test', draft: { ...payload(id), tags: tag }, expectedRevision: 0, now: now() });
  await transition(liveId, 'submit'); await publish(liveId);
  await transition(draftId, 'submit'); const receipt = await preview(draftId), reviewed = await record(draftId);
  const registry = await listCollections(db);
  await denied(manageCollection({ db, uid: 'publisher', body: { action: 'archive', id: 'ai113-thread', expectedRevision: registry.revision } }));
  const archived = await manageCollection({ db, uid: 'admin', body: { action: 'archive', id: 'ai113-thread', expectedRevision: registry.revision } });
  assert.equal(archived.collections.find(row => row.id === 'ai113-thread').archived, true);
  assert.equal((await db.collection('publishedContent').doc(liveId).get()).exists, true);
  await assert.rejects(publishing.publishDraft({ db, draftId, publisherUid: 'publisher', articleTemplate: template, origin: 'https://publisher.example', ...evidence(reviewed), previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now() }));
  await transition(draftId, 'withdraw');
  await publishing.saveCanonicalDraft({ db, draftId, publisherUid: 'author', draft: { ...payload(draftId, 'Preserved private refinement.'), tags: tag }, ...evidence(await record(draftId)), now: now() });
  await assert.rejects(transition(draftId, 'submit'));
  const newId = 'ai113-' + randomUUID();
  await assert.rejects(publishing.saveCanonicalDraft({ db, draftId: newId, publisherUid: 'author', publisherEmail: 'author@example.test', draft: { ...payload(newId), tags: tag }, expectedRevision: 0, now: now() }), /archived/i);
  await manageCollection({ db, uid: 'admin', body: { action: 'restore', id: 'ai113-thread', expectedRevision: archived.revision } });
  await transition(draftId, 'submit'); await publish(draftId);
  assert.equal((await db.collection('publishedContent').doc(draftId).get()).exists, true);
});

test('AI113-COLLECTION-03: five collection types validate and persist through create, edit and listing; legacy types resolve', async () => {
  const initial = await listCollections(db);
  assert.equal(initial.collections.find(row => row.id === 'reading').type, 'text');
  assert.equal(initial.collections.find(row => row.id === 'philosophy').type, 'philosophy');
  const id = 'type-' + randomUUID();
  const collection = { id, title: 'A typed collection', subtitle: 'Type selection', description: 'Collection type acceptance fixture.', family: 'Practice', order: 80, featured: false, image: '', imageAlt: '' };
  let revision = initial.revision;
  await denied(manageCollection({ db, uid: 'admin', body: { action: 'create', collection: { ...collection, type: 'invalid-type' }, expectedRevision: revision } }), 400);
  for (const [index, type] of ['philosophy', 'practice', 'theme', 'tradition', 'text'].entries()) {
    const result = await manageCollection({ db, uid: 'admin', body: { action: index === 0 ? 'create' : 'update', collection: { ...collection, type }, expectedRevision: revision } });
    revision = result.revision;
    assert.equal(result.collections.find(row => row.id === id).type, type);
    assert.equal(result.collections.find(row => row.id === 'reading').type, 'text', 'Saving another collection preserves legacy type labels in the response');
    assert.equal(result.collections.find(row => row.id === 'philosophy').type, 'philosophy');
    assert.equal((await listCollections(db)).collections.find(row => row.id === id).type, type);
  }
  await denied(manageCollection({ db, uid: 'admin', body: { action: 'update', collection: { ...collection, type: 'invalid-type' }, expectedRevision: revision } }), 400);
  assert.equal((await listCollections(db)).collections.find(row => row.id === id).type, 'text');
});

test('AI113-COMPAT-01: current reader loads immutable publications written by previous release', { skip: !process.env.BLOG_PREVIOUS_RUNTIME ? 'Provide hash-verified BLOG_PREVIOUS_RUNTIME for upgrade evidence' : false }, async () => {
  const prior = await import(pathToFileURL(resolve(process.env.BLOG_PREVIOUS_RUNTIME, 'server/content-publishing.mjs')));
  const priorDocument = await import(pathToFileURL(resolve(process.env.BLOG_PREVIOUS_RUNTIME, 'server/studio-content-document.mjs')));
  const id = 'legacy-' + randomUUID();
  await prior.saveCanonicalDraft({ db, draftId: id, publisherUid: 'publisher', publisherEmail: 'publisher@example.test', draft: {title:'Historical article',slug:id,excerpt:'Prior release',tags:'collection:reading', ...priorDocument.createContentDocument({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Historical body'}]}]})}, expectedRevision: 0, now: now() });
  const stored = await record(id);
  const receipt = await prior.previewDraft({ db, draftId: id, publisherUid: 'publisher', articleTemplate: template, origin: 'https://publisher.example', ...evidence(stored), now: now() });
  await prior.publishDraft({ db, draftId: id, publisherUid: 'publisher', articleTemplate: template, origin: 'https://publisher.example', ...evidence(stored), previewReceiptId: receipt.receiptId, idempotencyKey: randomUUID(), now: now() });
  const manifest = (await db.collection('publishedContent').doc(id).get()).data();
  assert.equal(manifest.authorName, undefined, 'Fixture must exercise historical manifest without new attribution fields');
  assert.equal(manifest.derivedFrom, undefined);
  const oldResult = await prior.loadPublishedArticle(db, id);
  const currentResult = await publishing.loadPublishedArticle(db, id);
  assert.ok(currentResult, 'Current reader rejected prior-release immutable publication');
  assert.equal(currentResult.bodyHtml, oldResult.bodyHtml);
  assert.equal(currentResult.releaseId, oldResult.releaseId);
  assert.equal(currentResult.snapshotSha256, oldResult.snapshotSha256);
  assert.deepEqual((await db.collection('publishedContent').doc(id).get()).data(), manifest);
});

test('AI113-ROLE-06: Commentator becomes Author then applies for Publisher using same application record; no downgrade or Admin escalation follows', async () => {
  const uid = 'progression-' + randomUUID(), email = `${uid}@example.test`;
  const store = environment.authenticatedContext(uid, { email, email_verified: true }).firestore();
  await rules.assertSucceeds(client.setDoc(client.doc(store, 'studioAccess', uid), { active: true, role: 'commenter', email, claimedAt: now().toISOString() }));
  const request = (currentRole, requestedRole) => ({ uid, email, currentRole, requestedRole, status: 'pending', createdAt: now().toISOString(), reviewedAt: '', reviewedBy: '', lastCancelledAt: '' });
  const requestRef = client.doc(store, 'roleRequests', uid);
  const approve = () => manageAccess({ db, user: { uid: 'admin' }, body: { action: 'review-request', uid, decision: 'approved' }, now: now() });
  await rules.assertSucceeds(client.setDoc(requestRef, request('commenter', 'author')));
  await approve();
  assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role, 'author');
  await rules.assertFails(client.setDoc(requestRef, request('author', 'administrator')));
  await rules.assertFails(client.setDoc(requestRef, request('author', 'author')));
  await rules.assertSucceeds(client.setDoc(requestRef, request('author', 'publisher')));
  await approve();
  assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role, 'publisher');
  for (const role of ['author', 'publisher', 'administrator']) await rules.assertFails(client.setDoc(requestRef, request('publisher', role)));
  assert.equal((await db.collection('roleRequests').doc(uid).get()).data().status, 'approved');
});


test('AI113-USERS-01: only active administrators list minimal paginated account data', async () => {
  for (const uid of ['author', 'publisher', 'reader']) await denied(manageAccess({ db, user: { uid }, body: { action: 'list-users' } }));
  const batch = db.batch();
  for (let i=0;i<55;i++) batch.set(db.collection('studioAccess').doc('users-page-' + String(i).padStart(3,'0')), {role:'commenter',active:true,email:`reader${i}@example.test`,privateNote:'never expose'});
  await batch.commit();
  let cursor, ids = new Set();
  do {
    const page = await manageAccess({ db, user:{uid:'admin'}, body:{action:'list-users', ...(cursor ? {cursor} : {})} });
    assert.ok(page.users.length <= 50);
    for (const user of page.users) { assert.deepEqual(Object.keys(user).sort(), ['active','email','role','uid']); assert.ok(!ids.has(user.uid)); ids.add(user.uid); }
    cursor = page.nextCursor;
  } while(cursor);
  assert.ok(ids.has('users-page-054'));
  await denied(manageAccess({db,user:{uid:'admin'},body:{action:'list-users',cursor:'bad/path'}}),400);
});

test('AI113-INVITE-01: role invitations are admin-only, bound, expiring and single-use for existing users', async () => {
  for (const role of ['author','publisher','administrator']) {
    const uid = 'role-invite-' + randomUUID(), email = uid + '@example.test';
    await db.collection('studioAccess').doc(uid).set({role: role === 'administrator' ? 'publisher' : 'commenter',active:true,email});
    await denied(manageAccess({db,user:{uid:'publisher'},body:{action:'invite-role',email,role},now:now()}));
    const invitation = await manageAccess({db,user:{uid:'admin'},body:{action:'invite-role',email,role},now:now()});
    const user = {uid,email,email_verified:true,firebase:{sign_in_provider:'google.com'}};
    assert.equal((await manageAccess({db,user:{...user,email:'other@example.test'},body:{action:'claim-invite'},now:now()})).claimed,false);
    assert.equal((await manageAccess({db,user,body:{action:'claim-invite'},now:new Date(Date.parse(invitation.expiresAt)+1)})).claimed,false);
    assert.deepEqual(await manageAccess({db,user,body:{action:'claim-invite'},now:now()}),{claimed:true,role});
    assert.equal((await manageAccess({db,user,body:{action:'claim-invite'},now:now()})).claimed,false);
  }
  await denied(manageAccess({db,user:{uid:'admin'},body:{action:'invite-role',email:'valid@example.test',role:'owner'}}),400);
});

test('AI113-INVITE-02: invitations cannot downgrade or reactivate an account', async () => {
  for (const active of [true,false]) {
    const uid='invite-guard-'+randomUUID(), email=uid+'@example.test';
    await db.collection('studioAccess').doc(uid).set({role:'publisher',active,email});
    await manageAccess({db,user:{uid:'admin'},body:{action:'invite-role',email,role: active ? 'author':'administrator'},now:now()});
    assert.equal((await manageAccess({db,user:{uid,email,email_verified:true,firebase:{sign_in_provider:'google.com'}},body:{action:'claim-invite'},now:now()})).claimed,false);
    assert.equal((await db.collection('studioAccess').doc(uid).get()).data().active,active);
    assert.equal((await db.collection('studioAccess').doc(uid).get()).data().role,'publisher');
  }
});

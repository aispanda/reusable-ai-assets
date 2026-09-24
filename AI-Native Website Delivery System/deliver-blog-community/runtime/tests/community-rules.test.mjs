import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

// Never substitute a real project or connect these fixtures to a deployed database.
const projectId = 'demo-blog-community';
const slug = 'disposable-community-fixture';
const claimedAt = '2026-01-01T00:00:00.000Z';
let environment;
const email = (uid) => `${uid}@example.test`;
const databaseFor = (uid, verified = true) => environment.authenticatedContext(uid, {
  email: email(uid), email_verified: verified,
}).firestore();
const access = (uid, role = 'commenter', active = true) => ({ active, role, email: email(uid), claimedAt });
const requestFor = (uid, requestedRole = 'author') => ({
  uid, email: email(uid), currentRole: 'commenter', requestedRole,
  status: 'pending', createdAt: claimedAt, reviewedAt: '', reviewedBy: '', lastCancelledAt: '',
});
const commentRef = (db, id) => doc(db, 'publishedContent', slug, 'comments', id);
const ownerRef = (db, id) => doc(db, 'publishedContent', slug, 'commentOwners', id);
const comment = (uid, parentId = '') => ({
  articleSlug: slug, parentId, body: 'A useful contribution.', authorName: `Fixture ${uid}`,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), edited: false,
  deleted: false, deletedAt: null, likeCount: 0, pinned: false, pinnedAt: null,
});
const createComment = (db, uid, id, overrides = {}) => {
  const batch = writeBatch(db);
  batch.set(commentRef(db, id), { ...comment(uid), ...overrides });
  batch.set(ownerRef(db, id), { commentId: id, authorUid: uid, createdAt: serverTimestamp() });
  return batch.commit();
};
const edit = (db, id) => updateDoc(commentRef(db, id), {
  body: 'Updated contribution.', edited: true, updatedAt: serverTimestamp(),
});
const tombstone = (db, id) => updateDoc(commentRef(db, id), {
  body: '', deleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  pinned: false, pinnedAt: null,
});
const seed = async (records) => environment.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  const batch = writeBatch(db);
  for (const [path, value] of Object.entries(records)) batch.set(doc(db, path), value);
  await batch.commit();
});

before(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST ?? '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(emulator)) {
    throw new Error('A local FIRESTORE_EMULATOR_HOST is required; these tests never use live Firebase.');
  }
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  const records = { [`publishedContent/${slug}`]: { slug, title: 'Disposable fixture' } };
  for (const role of ['administrator', 'publisher', 'author', 'commenter', 'viewer']) {
    records[`studioAccess/${role}`] = access(role, role);
    records[`userProfiles/${role}`] = { displayName: `Fixture ${role}` };
  }
  records['studioAccess/inactive'] = access('inactive', 'commenter', false);
  records['userProfiles/inactive'] = { displayName: 'Fixture inactive' };
  records['studioAccess/other'] = access('other');
  records['userProfiles/other'] = { displayName: 'Fixture other' };
  await seed(records);
});

after(async () => environment?.cleanup());

test('AUTH-01 ROLE-04: fresh verified users can claim only Commenter without an invitation', async () => {
  const db = databaseFor('fresh');
  const reference = doc(db, 'studioAccess', 'fresh');
  for (const role of ['administrator', 'publisher', 'author', 'viewer']) {
    await assertFails(setDoc(reference, access('fresh', role)));
  }
  await assertFails(setDoc(reference, { ...access('fresh'), email: email('other') }));
  await assertFails(setDoc(doc(db, 'studioAccess', 'someone-else'), access('someone-else')));
  await assertSucceeds(setDoc(reference, access('fresh')));
  assert.equal((await getDoc(reference)).data().role, 'commenter');
  await assertFails(updateDoc(reference, { role: 'administrator' }));
  await assertFails(getDoc(doc(db, 'contentDrafts', 'private-draft')));
});

test('AUTH-02: signed-out and unverified identities cannot register or read protected access', async () => {
  for (const db of [environment.unauthenticatedContext().firestore(), databaseFor('fresh', false)]) {
    await assertFails(setDoc(doc(db, 'studioAccess', 'fresh'), access('fresh')));
    await assertFails(getDoc(doc(db, 'studioAccess', 'administrator')));
  }
});

test('ROLE-01 ROLE-03: each editorial role requires an Admin approval before access changes', async () => {
  const admin = databaseFor('administrator');
  for (const role of ['author', 'publisher', 'administrator']) {
    const uid = `applicant-${role}`;
    await seed({ [`studioAccess/${uid}`]: access(uid) });
    const applicant = databaseFor(uid);
    await assertSucceeds(setDoc(doc(applicant, 'roleRequests', uid), requestFor(uid, role)));
    assert.equal((await getDoc(doc(applicant, 'studioAccess', uid))).data().role, 'commenter');
    await assertFails(updateDoc(doc(applicant, 'studioAccess', uid), { role }));
    const batch = writeBatch(admin);
    batch.update(doc(admin, 'roleRequests', uid), {
      status: 'approved', reviewedAt: claimedAt, reviewedBy: 'administrator',
    });
    batch.update(doc(admin, 'studioAccess', uid), {
      role, approvedAt: claimedAt, approvedBy: 'administrator',
    });
    await assertSucceeds(batch.commit());
    assert.equal((await getDoc(doc(applicant, 'studioAccess', uid))).data().role, role);
    const reviewed = (await getDoc(doc(applicant, 'roleRequests', uid))).data();
    assert.equal(reviewed.status, 'approved');
    assert.equal(reviewed.reviewedBy, 'administrator');
  }
});

test('ROLE-02: cancellation and denial allow a fresh request without granting privileges', async () => {
  const db = databaseFor('commenter');
  const reference = doc(db, 'roleRequests', 'commenter');
  await assertSucceeds(setDoc(reference, requestFor('commenter')));
  await assertFails(updateDoc(reference, { requestedRole: 'administrator' }));
  await assertSucceeds(updateDoc(reference, { status: 'cancelled', lastCancelledAt: claimedAt }));
  await assertSucceeds(setDoc(reference, { ...requestFor('commenter', 'publisher'), lastCancelledAt: claimedAt }));
  const admin = databaseFor('administrator');
  await assertSucceeds(updateDoc(doc(admin, 'roleRequests', 'commenter'), {
    status: 'denied', reviewedAt: claimedAt, reviewedBy: 'administrator',
  }));
  await assertSucceeds(setDoc(reference, { ...requestFor('commenter'), lastCancelledAt: claimedAt }));
  assert.equal((await getDoc(doc(db, 'studioAccess', 'commenter'))).data().role, 'commenter');
});

test('ROLE-04: non-Admins cannot review another request, promote themselves, or forge reviewer identity', async () => {
  await seed({ 'roleRequests/other': requestFor('other') });
  for (const role of ['commenter', 'viewer', 'author', 'publisher']) {
    const db = databaseFor(role);
    await assertFails(updateDoc(doc(db, 'roleRequests', 'other'), {
      status: 'approved', reviewedAt: claimedAt, reviewedBy: role,
    }));
    await assertFails(updateDoc(doc(db, 'studioAccess', role), { role: 'administrator' }));
    await assertFails(updateDoc(doc(db, 'studioAccess', 'other'), { role: 'publisher' }));
  }
  await assertFails(updateDoc(doc(databaseFor('administrator'), 'roleRequests', 'other'), {
    status: 'approved', reviewedAt: claimedAt, reviewedBy: 'other',
  }));
});

test('ROLE-05: a retained session loses draft/comment rights after current access is revoked', async () => {
  const author = databaseFor('author');
  await seed({ 'contentDrafts/own-draft': { ownerUid: 'author', title: 'Private' } });
  await assertSucceeds(getDoc(doc(author, 'contentDrafts', 'own-draft')));
  await assertSucceeds(createComment(author, 'author', 'before-revocation'));
  await assertSucceeds(updateDoc(doc(databaseFor('administrator'), 'studioAccess', 'author'), { active: false }));
  await assertFails(getDoc(doc(author, 'contentDrafts', 'own-draft')));
  await assertFails(createComment(author, 'author', 'after-revocation'));
  await assertFails(edit(author, 'before-revocation'));
  await assertFails(tombstone(author, 'before-revocation'));
});

test('COM-01: eligible roles create public comments/replies while ownership records stay private', async () => {
  const anonymous = environment.unauthenticatedContext().firestore();
  for (const role of ['commenter', 'author', 'publisher', 'administrator']) {
    const db = databaseFor(role);
    const id = `comment-${role}`;
    await assertSucceeds(createComment(db, role, id));
    await assertSucceeds(createComment(db, role, `${id}-reply`, { parentId: id }));
    await assertFails(createComment(db, role, `${id}-deep`, { parentId: `${id}-reply` }));
    const publicComment = (await assertSucceeds(getDoc(commentRef(anonymous, id)))).data();
    assert.equal(publicComment.authorName, `Fixture ${role}`);
    assert.equal(Object.hasOwn(publicComment, 'authorUid'), false);
    assert.equal(Object.hasOwn(publicComment, 'email'), false);
    await assertFails(getDoc(ownerRef(anonymous, id)));
    await assertFails(getDoc(ownerRef(databaseFor('other'), id)));
    await assertSucceeds(getDoc(ownerRef(db, id)));
  }
});

test('COM-02: owners edit and tombstone their comment without destroying replies or ownership', async () => {
  const db = databaseFor('commenter');
  await assertSucceeds(createComment(db, 'commenter', 'parent'));
  await assertSucceeds(createComment(databaseFor('other'), 'other', 'reply', { parentId: 'parent' }));
  await assertSucceeds(edit(db, 'parent'));
  assert.equal((await getDoc(commentRef(db, 'parent'))).data().edited, true);
  await assertFails(deleteDoc(commentRef(db, 'parent')));
  await assertSucceeds(tombstone(db, 'parent'));
  const deleted = (await getDoc(commentRef(db, 'parent'))).data();
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.body, '');
  assert.equal((await getDoc(commentRef(db, 'reply'))).data().parentId, 'parent');
  assert.equal((await getDoc(ownerRef(db, 'parent'))).data().authorUid, 'commenter');
  await assertFails(edit(db, 'parent'));
});

test('COM-03 COM-04: only Admin can moderate another comment, and even Admin cannot rewrite it', async () => {
  await assertSucceeds(createComment(databaseFor('commenter'), 'commenter', 'owned'));
  await assertSucceeds(createComment(databaseFor('other'), 'other', 'reply', { parentId: 'owned' }));
  for (const role of ['other', 'author', 'publisher', 'administrator']) {
    const db = databaseFor(role);
    await assertFails(edit(db, 'owned'));
    await assertFails(updateDoc(ownerRef(db, 'owned'), { authorUid: role }));
    if (role !== 'administrator') await assertFails(tombstone(db, 'owned'));
  }
  const admin = databaseFor('administrator');
  await assertSucceeds(tombstone(admin, 'owned'));
  assert.equal((await getDoc(commentRef(admin, 'owned'))).data().deleted, true);
  assert.equal((await getDoc(commentRef(admin, 'reply'))).data().body, 'A useful contribution.');
});

test('COM-05: signed-out, Viewer and inactive actors cannot mutate public discussion', async () => {
  await assertSucceeds(createComment(databaseFor('commenter'), 'commenter', 'owned'));
  for (const [db, uid] of [
    [environment.unauthenticatedContext().firestore(), 'anonymous'],
    [databaseFor('viewer'), 'viewer'], [databaseFor('inactive'), 'inactive'],
  ]) {
    await assertSucceeds(getDoc(commentRef(db, 'owned')));
    await assertFails(createComment(db, uid, `attempt-${uid}`));
    await assertFails(edit(db, 'owned'));
    await assertFails(tombstone(db, 'owned'));
  }
});

test('COM-06: likes are actor-bound and coupled to their counter; only Publisher/Admin pin', async () => {
  const owner = databaseFor('commenter');
  await assertSucceeds(createComment(owner, 'commenter', 'liked'));
  const db = databaseFor('other');
  const like = doc(db, 'publishedContent', slug, 'commentLikes', 'liked_other');
  await assertFails(updateDoc(commentRef(db, 'liked'), { likeCount: 1 }));
  let batch = writeBatch(db);
  batch.set(like, { commentId: 'liked', userUid: 'other', createdAt: serverTimestamp() });
  batch.update(commentRef(db, 'liked'), { likeCount: 1 });
  await assertSucceeds(batch.commit());
  batch = writeBatch(db);
  batch.set(like, { commentId: 'liked', userUid: 'other', createdAt: serverTimestamp() });
  batch.update(commentRef(db, 'liked'), { likeCount: 2 });
  await assertFails(batch.commit());
  batch = writeBatch(db);
  batch.delete(like);
  batch.update(commentRef(db, 'liked'), { likeCount: 0 });
  await assertSucceeds(batch.commit());
  for (const role of ['commenter', 'author']) {
    await assertFails(updateDoc(commentRef(databaseFor(role), 'liked'), { pinned: true, pinnedAt: serverTimestamp() }));
  }
  for (const role of ['publisher', 'administrator']) {
    const actor = databaseFor(role);
    await assertSucceeds(updateDoc(commentRef(actor, 'liked'), { pinned: true, pinnedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(commentRef(actor, 'liked'), { pinned: false, pinnedAt: null }));
  }
});

test('COM-07: empty/oversized body and forged public identity or metadata are rejected atomically', async () => {
  const db = databaseFor('commenter');
  const attempts = [
    { body: '' }, { body: 'x'.repeat(5001) }, { authorName: 'Impersonated person' },
    { authorUid: 'other' }, { email: email('other') }, { likeCount: 100 }, { pinned: true },
  ];
  for (const [index, overrides] of attempts.entries()) {
    const id = `invalid-${index}`;
    await assertFails(createComment(db, 'commenter', id, overrides));
    assert.equal((await getDoc(commentRef(db, id))).exists(), false);
  }
});

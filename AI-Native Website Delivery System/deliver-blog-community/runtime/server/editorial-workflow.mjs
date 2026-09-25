import { loadPublishedArticle, validateDraftForPublication } from './content-publishing.mjs';
import { canonicalContentFields, createContentDocument } from './studio-content-document.mjs';
import { articleCollectionIds, listCollections, assertCollectionTags } from './collection-management.mjs';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const read = async (tx, ref) => { const s = await tx.get(ref); return s.exists ? s.data() : null; };
// Administrators inherit Publisher review and publication rights. Their
// administrative powers are deliberately checked separately elsewhere.
const hasPublisherRights = access => access?.active === true
  && ['publisher', 'administrator'].includes(access.role);
const editor = access => {
  if (!(hasPublisherRights(access) || (access?.active === true && access.role === 'author'))) fail('Editorial access is required.', 403);
};
const reviewer = access => {
  editor(access);
  if (!hasPublisherRights(access)) fail('Publisher access is required.', 403);
};
const id = value => { if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(value)) fail('Invalid article identifier.'); return value; };

export async function transitionReview({ db, uid, draftId, action, expectedUpdatedAt, feedback, now = new Date() }) {
  if (!['submit', 'withdraw', 'return'].includes(action)) fail('Unknown review action.');
  const ref = db.collection('contentDrafts').doc(id(draftId));
  return db.runTransaction(async tx => {
    const [access, draft] = await Promise.all([read(tx, db.collection('studioAccess').doc(uid)), read(tx, ref)]);
    editor(access);
    if (!draft) fail('Article not found.', 404);
    if (action === 'return') reviewer(access);
    else if (draft.ownerUid !== uid) fail('Only the author can submit or withdraw this article.', 403);
    if (draft.archivedAt || !expectedUpdatedAt || draft.updatedAt !== expectedUpdatedAt) fail('This article changed. Reload before continuing.', 409);
    if (action !== 'submit' && draft.reviewStatus !== 'submitted') fail('This article is not awaiting review.', 409);
    if (action === 'submit' && draft.reviewStatus === 'submitted') fail('This article was already submitted.', 409);
    if (action === 'return' && (typeof feedback !== 'string' || !feedback.trim() || feedback.length > 5000)) fail('Provide feedback of 1–5000 characters.');
    if (action === 'submit') {
      validateDraftForPublication(draft);
      await assertCollectionTags({ db, transaction: tx, tags: draft.tags });
    }
    const updatedAt = new Date(Math.max(now.getTime(), Date.parse(draft.updatedAt) + 1)).toISOString();
    const reviewStatus = { submit: 'submitted', withdraw: 'draft', return: 'returned' }[action];
    const event = { action, actorUid: uid, revision: draft.revision, occurredAt: updatedAt, feedback: action === 'return' ? feedback.trim() : '' };
    const update = {
      reviewStatus, updatedAt,
      reviewFeedback: action === 'return' ? feedback.trim() : '',
      reviewHistory: [...(draft.reviewHistory ?? []), event].slice(-100),
      submittedRevision: action === 'submit' ? draft.revision : null,
      submittedContentSha256: action === 'submit' ? draft.contentSha256 : null,
    };
    tx.update(ref, update);
    tx.create(db.collection('contentAuditEvents').doc(), { ...event, draftId });
    return { draftId, ...update };
  });
}

export async function listEditorialDrafts({ db, uid }) {
  const access = (await db.collection('studioAccess').doc(uid).get()).data();
  editor(access);
  const own = await db.collection('contentDrafts').where('ownerUid', '==', uid).get();
  const rows = new Map(own.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
  if (hasPublisherRights(access)) {
    const submitted = await db.collection('contentDrafts').where('reviewStatus', '==', 'submitted').get();
    const visible = ['title', 'excerpt', 'slug', 'tags', 'format', 'schemaVersion', 'registryVersion', 'content', 'contentSha256', 'layout', 'ownerUid', 'publicationStatus', 'publicationLiveUrl', 'reviewStatus', 'revision', 'updatedAt', 'reviewFeedback', 'derivedFrom'];
    const profiles = new Map(await Promise.all([...new Set(submitted.docs.map(d => d.data().ownerUid))].map(async ownerUid => {
      const profile = (await db.collection('userProfiles').doc(ownerUid).get()).data();
      return [ownerUid, String(profile?.displayName || 'Contributor').slice(0, 150)];
    })));
    submitted.docs.forEach(d => {
      if (rows.has(d.id)) return;
      const data = d.data();
      if (data.archivedAt) return;
      rows.set(d.id, { ...Object.fromEntries(visible.filter(k => data[k] !== undefined).map(k => [k, data[k]])), id: d.id, authorName: profiles.get(data.ownerUid) });
    });
  }
  if (access.role === 'administrator') {
    // Administrative removal uses only last-public metadata. Never reveal an
    // author's saved refinements or private title through this list.
    const offline = await db.collection('contentPublicationIndex').where('state', '==', 'unpublished').get();
    await Promise.all(offline.docs.map(async indexDoc => {
      if (rows.has(indexDoc.id)) return;
      const index = indexDoc.data();
      if (!index.releaseId) return;
      const [draftDoc, releaseDoc] = await Promise.all([
        db.collection('contentDrafts').doc(indexDoc.id).get(),
        db.collection('contentReleases').doc(index.releaseId).get(),
      ]);
      if (!draftDoc.exists || !releaseDoc.exists) return;
      const draft = draftDoc.data(), release = releaseDoc.data();
      if (draft.publicationStatus !== 'unpublished' || release.draftId !== indexDoc.id) return;
      rows.set(indexDoc.id, {
        id: indexDoc.id, administrationOnly: true,
        title: release.title, slug: release.slug, tags: release.tags,
        ownerUid: draft.ownerUid, publicationStatus: 'unpublished',
        reviewStatus: draft.reviewStatus, updatedAt: draft.updatedAt,
        ...(draft.archivedAt ? { archivedAt: draft.archivedAt } : {}),
      });
    }));
  }
  return { drafts: [...rows.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) };
}

export async function threadMetrics({ db, uid }) {
  const access = (await db.collection('studioAccess').doc(uid).get()).data();
  if (!access?.active || access.role !== 'administrator') fail('Administrator access is required.', 403);
  const [registry, drafts, publications] = await Promise.all([listCollections(db), db.collection('contentDrafts').get(), db.collection('publishedContent').get()]);
  const metrics = Object.fromEntries(registry.collections.map(c => [c.id, { draft: 0, submitted: 0, returned: 0, published: 0, unpublished: 0, pendingRevisions: 0 }]));
  for (const snapshot of drafts.docs) {
    const d = snapshot.data();
    if (d.archivedAt) continue;
    for (const topic of articleCollectionIds(d.tags, d.slug)) {
      const m = metrics[topic]; if (!m) continue;
      const live = ['published', 'published-with-changes'].includes(d.publicationStatus);
      const state = d.publicationStatus === 'unpublished' ? 'unpublished' : ['submitted', 'returned'].includes(d.reviewStatus) ? d.reviewStatus : 'draft';
      if (!live) m[state]++;
      if (live && d.publicationStatus === 'published-with-changes') m.pendingRevisions++;
    }
  }
  for (const published of publications.docs) {
    const row = published.data();
    for (const topic of articleCollectionIds(row.tags, row.slug)) if (metrics[topic]) metrics[topic].published++;
  }
  return { metrics };
}

export async function deriveArticle({ db, uid, slug, newDraftId, origin, now = new Date() }) {
  id(newDraftId);
  const article = await loadPublishedArticle(db, slug);
  if (!article) fail('Only published originals can be used for a linked article.', 404);
  // Start a separate attributed response rather than copying another author's prose
  // or taking ownership of their media. The original remains available by link.
  const document = createContentDocument({ type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'text', text: 'In response to ' },
    { type: 'text', text: article.title, marks: [{ type: 'link', attrs: { href: new URL(`/stories/${slug}`, origin).href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null, title: null } }] },
    { type: 'text', text: '. ' },
  ] }] }, article.layout);
  const ref = db.collection('contentDrafts').doc(newDraftId);
  return db.runTransaction(async tx => {
    const [access, existing, currentPublic] = await Promise.all([
      read(tx, db.collection('studioAccess').doc(uid)), read(tx, ref), read(tx, db.collection('publishedContent').doc(slug)),
    ]);
    reviewer(access);
    if (existing) fail('This article identifier is already in use.', 409);
    if (!currentPublic || currentPublic.releaseId !== article.releaseId) fail('The original changed. Reload before creating a linked article.', 409);
    await assertCollectionTags({ db, transaction: tx, tags: article.tags });
    tx.create(ref, {
      ...canonicalContentFields(document), ownerUid: uid, ownerEmail: access.email || '',
      title: `A response to ${article.title}`.slice(0, 200), excerpt: '', slug: '', tags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags || '',
      revision: 1, revisions: [], updatedAt: now.toISOString(), publicationStatus: 'draft',
      publicationReleaseId: '', publicationLiveUrl: '', reviewStatus: 'draft', reviewHistory: [],
      derivedFrom: { slug, title: article.title, releaseId: article.releaseId, authorUid: article.ownerUid || article.publisherUid || '' },
    });
    tx.create(db.collection('contentAuditEvents').doc(), { action: 'derive', actorUid: uid, draftId: newDraftId, sourceReleaseId: article.releaseId, occurredAt: now.toISOString() });
    return { draftId: newDraftId };
  });
}

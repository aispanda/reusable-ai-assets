import { loadCollectionProfile } from './collection-profile.mjs';
const seeds = loadCollectionProfile();

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const registryRef = db => db.collection('contentCollections').doc('registry');
export const collectionTypes = Object.freeze({ text: 'Text', philosophy: 'Philosophy', tradition: 'Tradition', practice: 'Practice', theme: 'Theme' });
const collectionType = row => row.type || 'theme';
export const seedCollections = seeds.topics;
export const approvedCollectionImages = [...new Set([
  ...seeds.topics.flatMap(row => [row.art?.src, row.art?.smallSrc]),
  ...Object.values(seeds.articlePresentation || {}).map(row => row.cover),
  ...(seeds.approvedImages || []),
].filter(Boolean))];
const tagsOf = tags => (Array.isArray(tags) ? tags : String(tags || '').split(',')).map(tag => tag.trim()).filter(Boolean);
export const articleCollectionIds = (tags, slug) => {
  const assigned = tagsOf(tags).filter(tag => tag.startsWith('collection:'));
  return assigned.length ? assigned.filter(tag => tag !== 'collection:none').map(tag => tag.slice(11))
    : (Object.hasOwn(seeds.articleTopics, slug) ? seeds.articleTopics[slug] : []);
};
const readRegistry = snapshot => snapshot.exists
  ? { collections: snapshot.data().collections, revision: snapshot.data().revision }
  : { collections: structuredClone(seedCollections), revision: 0 };
export async function listCollections(db) {
  const data = readRegistry(await registryRef(db).get());
  return { ...data, collections: data.collections.map(row => ({ ...row, type: collectionType(row) })).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)), approvedImages: approvedCollectionImages, collectionTypes };
}

function normalizeCollection(input, previous, uploadedImage) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Collection details are required.');
  const allowed = new Set(['id', 'title', 'subtitle', 'description', 'family', 'type', 'order', 'featured', 'image', 'imageAlt']);
  if (Object.keys(input).some(key => !allowed.has(key))) fail('Unknown collection field.');
  if (typeof input.id !== 'string' || !slugPattern.test(input.id) || input.id.length > 80 || input.id === 'none') fail('Choose a unique lowercase URL slug with words separated by hyphens.');
  if (previous && input.id !== previous.id) fail('Collection URL identifiers cannot be changed; rename its title instead.');
  const row = { ...(previous || {}), id: input.id };
  row.type = input.type ?? (previous ? collectionType(previous) : 'theme');
  if (!Object.hasOwn(collectionTypes, row.type)) fail('Choose a valid collection type.');
  for (const [key, max] of [['title', 120], ['subtitle', 200], ['description', 1000], ['family', 80]]) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > max) fail(`Collection ${key} must contain between 1 and ${max} characters.`);
    row[key] = input[key].trim();
  }
  if (!Number.isInteger(input.order) || input.order < 0 || input.order > 10000) fail('Order must be a whole number from 0 to 10000.');
  if (typeof input.featured !== 'boolean') fail('Featured must be true or false.');
  row.order = input.order; row.featured = input.featured;
  row.keywords ||= []; row.tone ||= 'emerald'; row.motif ||= 'river';
  if (input.image) {
    if (!approvedCollectionImages.includes(input.image) && input.image !== previous?.art?.src
      && input.image !== (uploadedImage ? `/content-assets/collections/${uploadedImage.id}` : null)) fail('Choose an existing image or upload a new one.');
    if (typeof input.imageAlt !== 'string' || !input.imageAlt.trim() || input.imageAlt.length > 500) fail('Describe the purpose of the collection image.');
    row.art = { src: input.image, smallSrc: input.image, alt: input.imageAlt.trim() };
  } else delete row.art;
  return row;
}

// Read the same registry inside draft/publication transactions so a concurrent
// delete cannot leave an assignment referring to a removed collection.
export async function assertCollectionTags({ db, transaction, tags, existingTags }) {
  const { collections } = readRegistry(await transaction.get(registryRef(db)));
  const assigned = tagsOf(tags).filter(tag => tag.startsWith('collection:'));
  if (assigned.length && tagsOf(tags).length > 30) fail('Use at most thirty tags and collection assignments in total.');
  if (assigned.length !== 1 || assigned[0] === 'collection:none') fail('Choose one collection for this article.');
  const ids = new Set(collections.map(row => row.id));
  if (assigned.some(tag => tag !== 'collection:none' && !ids.has(tag.slice(11)))) fail('A selected collection no longer exists. Reload the collection choices.');
  const selected = collections.find(row => row.id === assigned[0].slice(11));
  if (selected.archived && !tagsOf(existingTags).includes(assigned[0])) fail('This collection is archived. Choose an active collection before submitting or publishing.', 409);
}

export async function manageCollection({ db, uid, body, uploadedImage, hostArticles = [] }) {
  if (!body || !['create', 'update', 'delete', 'archive', 'restore'].includes(body.action)) fail('Choose a supported collection action.');
  if (Object.keys(body).some(key => !['action', 'collection', 'id', 'expectedRevision'].includes(key))) fail('Unknown collection request field.');
  return db.runTransaction(async transaction => {
    const ref = registryRef(db);
    const [accessSnap, registry] = await Promise.all([
      transaction.get(db.collection('studioAccess').doc(uid)), transaction.get(ref),
    ]);
    const access = accessSnap.exists && accessSnap.data();
    if (!access || access.active !== true || access.role !== 'administrator') fail('Administrator access is required to manage collections.', 403);
    const current = readRegistry(registry);
    if (!Number.isInteger(body.expectedRevision) || body.expectedRevision !== current.revision) fail('Collections changed in another session. Reload before saving.', 409);
    let rows = [...current.collections];
    const id = ['delete', 'archive', 'restore'].includes(body.action) ? body.id : body.collection?.id;
    const previous = rows.find(row => row.id === id);
    if (body.action === 'create') {
      if (previous) fail('That collection URL slug is already in use.', 409);
      if (rows.length >= 100) fail('This site supports up to 100 collections.');
      rows.push(normalizeCollection(body.collection, undefined, uploadedImage));
    } else {
      if (!previous) fail('Collection not found.', 404);
      if (body.action === 'update') rows = rows.map(row => row.id === id ? normalizeCollection(body.collection, previous, uploadedImage) : row);
      else if (['archive', 'restore'].includes(body.action)) rows = rows.map(row => row.id === id ? { ...row, archived: body.action === 'archive' } : row);
      else {
        if (hostArticles.some(row => row.collectionIds.includes(id))) {
          fail('This collection contains host-managed articles. Reassign them in the site catalogue before deleting it.', 409);
        }
        const snapshots = await Promise.all([
          transaction.get(db.collection('contentDrafts')), transaction.get(db.collection('publishedContent')), transaction.get(db.collection('contentReleases')),
        ]);
        if (snapshots.some(snapshot => snapshot.docs.some(doc => articleCollectionIds(doc.data().tags, doc.data().slug).includes(id)))) {
          fail('This collection contains drafts or published articles. Reassign them before deleting it.', 409);
        }
        rows = rows.filter(row => row.id !== id);
      }
    }
    const revision = current.revision + 1;
    if (uploadedImage) transaction.create(db.collection('collectionImages').doc(uploadedImage.id), uploadedImage);
    transaction.set(ref, { collections: rows, revision, updatedAt: new Date().toISOString(), updatedBy: uid });
    transaction.create(db.collection('contentAuditEvents').doc(), { action: `collection-${body.action}`, actorUid: uid, collectionId: id, revision, occurredAt: new Date().toISOString() });
    return { collections: rows.map(row => ({ ...row, type: collectionType(row) })).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)), revision, approvedImages: approvedCollectionImages, collectionTypes };
  });
}

// Consumer-owned public pages may join discovery without becoming editable CMS
// publications. Content and route ownership stay with the host application.
const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pathPattern = /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const ownedRoots = new Set(['api', 'account', 'studio', 'my-articles', 'write', 'review', 'manage', 'topics', 'stories', 'content-assets']);
export const isHostArticlePath = path => typeof path === 'string' && path.length <= 240
  && pathPattern.test(path) && !ownedRoots.has(path.split('/')[1]);

export function validateHostArticles(input = []) {
  if (!Array.isArray(input) || input.length > 100) throw new Error('Host articles must be an array of at most 100 public pages.');
  const ids = new Set(), paths = new Set();
  return input.map(row => {
    const fields = ['id', 'title', 'excerpt', 'path', 'collectionIds', 'readMinutes'];
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !fields.includes(key))
      || typeof row.id !== 'string' || row.id.length > 80 || !identifier.test(row.id) || ids.has(row.id)
      || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 200
      || typeof row.excerpt !== 'string' || !row.excerpt.trim() || row.excerpt.length > 1000
      || !isHostArticlePath(row.path) || paths.has(row.path)
      || !Array.isArray(row.collectionIds) || !row.collectionIds.length || row.collectionIds.length > 30
      || row.collectionIds.some(id => typeof id !== 'string' || id.length > 80 || !identifier.test(id) || id === 'none')
      || new Set(row.collectionIds).size !== row.collectionIds.length
      || (row.readMinutes !== undefined && (!Number.isInteger(row.readMinutes) || row.readMinutes < 1 || row.readMinutes > 240))) {
      throw new Error('Host articles require unique IDs and public paths, title, excerpt and collection IDs; only discovery metadata is allowed.');
    }
    ids.add(row.id); paths.add(row.path);
    return Object.freeze({ ...row, title: row.title.trim(), excerpt: row.excerpt.trim(), collectionIds: Object.freeze([...row.collectionIds]) });
  });
}

export function visibleHostArticles(hostArticles, collections, publishedSlugs = new Set()) {
  const active = new Set(collections.filter(row => !row.archived).map(row => row.id));
  return hostArticles.filter(row => !publishedSlugs.has(row.id))
    .map(row => ({ ...row, slug: row.id, source: 'host', collectionIds: row.collectionIds.filter(id => active.has(id)) }))
    .filter(row => row.collectionIds.length);
}

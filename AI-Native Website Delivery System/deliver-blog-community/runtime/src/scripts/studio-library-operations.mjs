// A working draft may have a new slug while its previous release is still live.
export const studioPublicUrl = ({ publicationStatus, publicationLiveUrl, archivedAt }, staticPath) => {
  if (archivedAt || !['published', 'published-with-changes'].includes(publicationStatus)) return undefined;
  if (!publicationLiveUrl) return staticPath;
  try {
    const url = new URL(publicationLiveUrl);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};

// Name the destination and consequence of the primary row action. A published
// document already has a working record, but opening that record starts a
// private revision when it still matches the live release and resumes it after
// unpublished changes exist.
export const studioArticleAction = ({ title, publicationStatus, viewOnly, source, ownerUid, reviewStatus }, currentUserId) => {
  if (viewOnly) {
    const label = source === 'host' ? 'View page' : 'View article';
    const ariaLabel = source === 'host' ? `View page ${title}` : `View ${title}`;
    return { kind: 'view', label, ariaLabel };
  }
  if (ownerUid !== currentUserId || reviewStatus === 'submitted') {
    return { kind: 'review', label: 'Review article', ariaLabel: `Review article ${title}` };
  }
  if (publicationStatus === 'published-with-changes') {
    return { kind: 'continue-revision', label: 'Continue draft', ariaLabel: `Continue revision draft for ${title}` };
  }
  if (publicationStatus === 'published') {
    return { kind: 'create-revision', label: 'Create revision draft', ariaLabel: `Create revision draft for ${title}` };
  }
  return { kind: 'edit', label: 'Edit', ariaLabel: `Edit ${title}` };
};

// The site catalogue contains published metadata, not editable drafts. Merge it
// with this user's own workspace by the live URL (a draft's slug can change).
// Use live titles/tags in the site view so collection counts and filters agree.
export function siteArticleIndex(owned, published) {
  const rows = new Map(owned.map(row => [row.id, { ...row }]));
  const byPath = new Map(owned.filter(row => row.publicPath && !row.archivedAt)
    .map(row => [row.publicPath, row]));
  const seen = new Set();
  for (const article of published) {
    if (!article || typeof article.title !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) continue;
    const path = article.source === 'host' ? article.path : `/stories/${article.slug}`;
    if (typeof path !== 'string' || !/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(path) || seen.has(path)) continue;
    seen.add(path);
    const own = byPath.get(path);
    const id = own?.id ?? `public:${path}`;
    rows.set(id, {
      ...(own ?? { id, publicationStatus: 'published', updatedAt: '', viewOnly: true }),
      title: article.title,
      publicPath: path,
      tags: (Array.isArray(article.collectionIds) ? article.collectionIds : []).map(id => `collection:${id}`).join(', '),
      source: article.source === 'host' ? 'host' : 'published',
      ...(!own && typeof article.publishedAt === 'string' && Number.isFinite(Date.parse(article.publishedAt)) ? { updatedAt: article.publishedAt } : {}),
    });
  }
  return [...rows.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}

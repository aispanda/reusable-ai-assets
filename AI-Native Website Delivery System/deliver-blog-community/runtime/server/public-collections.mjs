const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const localImage = value => typeof value === 'string' && /^\/(?!\/)[^\\\s<>]+$/.test(value) ? value : '';
export function renderCollectionsPage({ collections, articles, collectionId, allArticles = false, siteName = 'Library' }) {
  const visible = collections.filter(row => !row.archived);
  const collection = collectionId ? visible.find(row => row.id === collectionId) : null;
  if (collectionId && !collection) return null;
  const articleList = Boolean(collection || allArticles);
  const title = allArticles ? 'Stories & insights' : collection?.title || 'Explore collections';
  const items = allArticles ? articles : collection ? articles.filter(row => row.collectionIds.includes(collection.id)) : visible;
  const cards = items.map(row => {
    const href = articleList ? '/stories/' + encodeURIComponent(row.slug) : '/topics/' + encodeURIComponent(row.id);
    const image = !articleList && localImage(row.art?.src);
    return `<article>${image ? `<img src="${escape(image)}" alt="${escape(row.art.alt)}" loading="lazy" width="600" height="360">` : ''}<h2><a href="${href}">${escape(row.title)}</a></h2><p>${escape(articleList ? row.excerpt : row.description || row.subtitle)}</p></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · ${escape(siteName)}</title><style>body{margin:0;background:#faf9f5;color:#20342d;font:18px/1.65 system-ui}main,header,footer{max-width:1140px;margin:auto;padding:24px}nav{display:flex;gap:24px;flex-wrap:wrap}a{color:inherit}h1,h2{font-family:Georgia,serif;line-height:1.2}h1{font-size:clamp(2rem,5vw,4rem)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:32px}img{width:100%;height:auto;aspect-ratio:5/3;object-fit:cover;border-radius:8px}a:focus-visible{outline:3px solid #257a63;outline-offset:4px}</style></head><body><header><nav aria-label="Main navigation"><a href="/">${escape(siteName)}</a><a href="/topics">Collections</a><a href="/account">My account</a></nav></header><main><h1>${escape(title)}</h1><p>${escape(collection?.description || 'Explore the growing library.')}</p><section class="grid" aria-label="${articleList ? 'Published articles' : 'Collections'}">${cards || '<p>No published articles yet.</p>'}</section></main><footer><a href="/topics">All collections</a></footer></body></html>`;
}

// Target-owned configuration only; no query parameter or browser state is accepted.
export function normalizeBlogOrigin(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /[\s?#]/u.test(value)) {
    throw new TypeError('blogOrigin must be an explicit HTTPS origin without whitespace, query or fragment.');
  }
  let url;
  try { url = new URL(value); } catch { throw new TypeError('blogOrigin must be a valid HTTPS origin.'); }
  const authority = value.split('/')[2];
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password
      || authority.includes('@') || (url.pathname !== '/' && url.pathname !== '')
      || (url.port && Number(url.port) < 1)) {
    throw new TypeError('blogOrigin must contain only an HTTPS host and optional port.');
  }
  return url.origin;
}

export function buildBlogLinks(blogOrigin) {
  const origin = normalizeBlogOrigin(blogOrigin);
  return Object.freeze([
    Object.freeze({ label: 'Blog', href: `${origin}/` }),
    Object.freeze({ label: 'Write an article', href: `${origin}/studio` }),
    Object.freeze({ label: 'Account settings', href: `${origin}/account` }),
  ]);
}

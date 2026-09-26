// Mount an installed blog runtime in an existing Node HTTP application.
// Unowned URLs remain with the host; no socket, credentials or cloud resource is created.
import { existsSync, readdirSync } from 'node:fs';
import { basename, resolve, sep } from 'node:path';
import { compatibleVersionedAsset } from '../../runtime/server/static-routing.mjs';

const pages = new Map([
  ['/account', '/account'], ['/studio', '/studio'], ['/my-articles', '/studio'],
  ['/write', '/studio'], ['/review', '/studio'], ['/manage/collections', '/studio'],
  ['/manage/threads', '/studio'], ['/manage/users', '/studio'],
]);

export function blogRoute(rawUrl, distRoot, hostDistRoot) {
  const url = new URL(rawUrl, 'https://host.example');
  // Encoded separators/dot segments must not gain access to another static file.
  if (/%(?:2e|2f|5c|00)/i.test(rawUrl) || rawUrl.includes('\\')) return null;
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (pages.has(pathname)) return pages.get(pathname) + url.search;
  if (pathname === '/stories' || pathname === '/topics' || /^\/topics\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname)) return pathname + url.search;
  const story = /^\/stories\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/discussion)?$/.exec(pathname);
  if (story) return '/' + story[1] + url.search;
  if (pathname.startsWith('/api/content/') || pathname === '/api/content'
      || pathname.startsWith('/__/auth/') || pathname === '/__/auth'
      || /^\/content-assets\/(?:collections\/)?[a-f0-9-]+$/.test(pathname)) return url.pathname + url.search;
  if (pathname.startsWith('/_astro/')) {
    const root = resolve(distRoot); const file = resolve(root, '.' + pathname);
    if (file.startsWith(root + sep) && existsSync(file)) return url.pathname + url.search;
    // A host and the package share /_astro. Never replace an existing host bundle.
    if (hostDistRoot && existsSync(resolve(hostDistRoot, '.' + pathname))) return null;
    if (basename(pathname) !== pathname.slice('/_astro/'.length)) return null;
    try {
      if (compatibleVersionedAsset(basename(pathname), readdirSync(resolve(root, '_astro')))) return url.pathname + url.search;
    } catch { /* No packaged assets; leave the route with the host. */ }
  }
  return null;
}

export function mountBlog({ server, distRoot, hostDistRoot }) {
  if (!server || typeof server.emit !== 'function' || !distRoot) throw new Error('An initialized blog server and built distRoot are required');
  return (request, response) => {
    const route = blogRoute(request.url || '/', distRoot, hostDistRoot);
    if (route === null) return false;
    // Preserve public URL for client navigation; rewrite only server-side static lookup.
    request.url = route;
    server.emit('request', request, response);
    return true;
  };
}

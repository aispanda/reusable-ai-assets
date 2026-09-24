import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendPublishedUrlsToSitemap,
  assertContentMutationRequest,
  archiveDraft,
  listPublishedArticles,
  loadPublishedArticle,
  migrateLegacyDraft,
  previewDraft,
  publishDraft,
  renderPublishedInsightRows,
  restoreDraft,
  saveCanonicalDraft,
  unpublishDraft,
  withContentFailureAudit,
} from './content-publishing.mjs';
import { isInternalArticleShellFile } from './static-routing.mjs';
import { publicStudioContentErrorDetails } from './studio-content-document.mjs';
import { createStudioImageAsset, resolveStudioContentAsset } from './studio-content-assets.mjs';
import { listCollections, manageCollection } from './collection-management.mjs';
import { saveCollectionArtwork, resolveCollectionArtwork } from './collection-artwork.mjs';
import { buildRuntimePublicConfig, injectRuntimePublicConfig, prepareServedText } from './runtime-config.mjs';

export const createBlogServer = ({ db, auth, bucket, siteOrigin, runtimeConfig, distRoot }) => {
const DIST_ROOT = resolve(distRoot);
const SITE_ORIGIN = new URL(siteOrigin).origin;
if (!runtimeConfig?.firebase?.projectId) throw new Error('Runtime Firebase configuration is required.');
const RUNTIME_PUBLIC_CONFIG = runtimeConfig;
const FIREBASE_AUTH_ORIGIN = new URL('https://' + runtimeConfig.firebase.authDomain);
const JSON_LIMIT = 64 * 1024;
const CONTENT_JSON_LIMIT = 600 * 1024;
const IMAGE_UPLOAD_LIMIT = 6 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const contentRequestsByUser = new Map();
let articleShellPromise;
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const json = (response, status, payload) => {
  const body = status === 204 ? '' : JSON.stringify(payload);
  response.writeHead(status, { ...securityHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
  response.end(body);
};

const readJson = async (request, limit = JSON_LIMIT) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 });
  }
};

const readBody = async (request, limit) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request is too large.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const requestOrigin = (request) => {
  const protocol = String(request.headers['x-forwarded-proto'] ?? 'http').split(',')[0].trim();
  const host = String(request.headers['x-forwarded-host'] ?? request.headers.host ?? '').split(',')[0].trim();
  return `${protocol}://${host}`;
};

const requireSameOrigin = (request) => {
  const origin = request.headers.origin;
  if (origin && origin !== SITE_ORIGIN) throw Object.assign(new Error('Cross-origin request rejected.'), { statusCode: 403 });
};

const requireUser = async (request) => {
  const authorization = request.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) throw Object.assign(new Error('Sign in to continue.'), { statusCode: 401 });
  try {
    const user = await auth.verifyIdToken(authorization.slice(7), true);
    if (user.email_verified !== true) throw new Error('Verified sign-in required.');
    return user;
  } catch {
    throw Object.assign(new Error('Your sign-in session expired. Sign in again.'), { statusCode: 401 });
  }
};

const enforceContentRateLimit = (uid) => {
  const now = Date.now();
  const recent = (contentRequestsByUser.get(uid) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) throw Object.assign(new Error('Too many content requests. Wait briefly and try again.'), { statusCode: 429 });
  recent.push(now);
  contentRequestsByUser.set(uid, recent);
};

const contentRouteFromPath = (pathname) => {
  const match = pathname.match(/^\/api\/content\/drafts\/([^/]+)\/(save|migrate|publish|unpublish|preview|preview-document|archive|restore)$/);
  if (!match) return null;
  try {
    const draftId = decodeURIComponent(match[1]);
    return /^[a-zA-Z0-9-]{1,128}$/.test(draftId) ? { draftId, action: match[2] } : null;
  } catch {
    return null;
  }
};

const contentImageUploadFromPath = (pathname) => {
  const match = pathname.match(/^\/api\/content\/drafts\/([^/]+)\/images$/);
  if (!match) return null;
  try {
    const draftId = decodeURIComponent(match[1]);
    return /^[a-zA-Z0-9-]{1,128}$/.test(draftId) ? draftId : null;
  } catch {
    return null;
  }
};

const handleApi = async (request, response, url) => {
  if (url.pathname === '/api/content/collections' && ['GET', 'HEAD'].includes(request.method)) {
    json(response, 200, await listCollections(db));
    return;
  }
  if (url.pathname === '/api/content/articles' && ['GET', 'HEAD'].includes(request.method)) {
    const articles = await listPublishedArticles(db);
    json(response, 200, { articles: articles.map(({ slug, title, excerpt }) => ({ slug, title, excerpt })) });
    return;
  }
  requireSameOrigin(request);
  const user = await requireUser(request);
  if (url.pathname === '/api/content/collections') {
    if (request.method !== 'POST') throw Object.assign(new Error('Method not allowed.'), { statusCode: 405 });
    enforceContentRateLimit(user.uid);
    const contentType = String(request.headers['content-type'] ?? '');
    if (contentType.toLowerCase().startsWith('multipart/form-data;')) {
      let form;
      try {
        form = await new Response(await readBody(request, IMAGE_UPLOAD_LIMIT), {
          headers: { 'Content-Type': contentType },
        }).formData();
      } catch (error) {
        if (error.statusCode === 413) throw error;
        throw Object.assign(new Error('Image uploads require valid multipart form data.'), { statusCode: 400 });
      }
      const file = form.get('file');
      if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
        throw Object.assign(new Error('Choose an image file to upload.'), { statusCode: 400 });
      }
      let body;
      try { body = JSON.parse(form.get('collection')); }
      catch { throw Object.assign(new Error('Collection details must be valid JSON.'), { statusCode: 400 }); }
      json(response, 200, await saveCollectionArtwork({ db, bucket, uid: user.uid, body,
        bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type }));
      return;
    }
    json(response, 200, await manageCollection({ db, uid: user.uid, body: await readJson(request) }));
    return;
  }
  const imageDraftId = contentImageUploadFromPath(url.pathname);
  if (imageDraftId) {
    if (request.method !== 'POST') throw Object.assign(new Error('Method not allowed.'), { statusCode: 405 });
    enforceContentRateLimit(user.uid);
    const contentType = String(request.headers['content-type'] ?? '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
      throw Object.assign(new Error('Image uploads require multipart form data.'), { statusCode: 400 });
    }
    const form = await new Response(await readBody(request, IMAGE_UPLOAD_LIMIT), {
      headers: { 'Content-Type': contentType },
    }).formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      throw Object.assign(new Error('Choose an image file to upload.'), { statusCode: 400 });
    }
    const result = await createStudioImageAsset({
      db,
      bucket,
      draftId: imageDraftId,
      publisherUid: user.uid,
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      alt: form.get('alt'),
      decorative: form.get('decorative') === 'true',
      caption: form.get('caption'),
      credit: form.get('credit') ?? undefined,
    });
    json(response, 201, result);
    return;
  }
  const contentRoute = contentRouteFromPath(url.pathname);
  if (contentRoute) {
    const preflight = async () => {
      if (request.method !== 'POST') throw Object.assign(new Error('Method not allowed.'), { statusCode: 405 });
      enforceContentRateLimit(user.uid);
      const usesContentPayload = contentRoute.action.startsWith('preview') || contentRoute.action === 'save' || contentRoute.action === 'migrate';
      const body = await readJson(request, usesContentPayload ? CONTENT_JSON_LIMIT : JSON_LIMIT);
      if (contentRoute.action === 'save' || contentRoute.action === 'migrate') {
        assertContentMutationRequest(contentRoute.action, body);
      }
      return body;
    };
    const body = contentRoute.action.startsWith('preview')
      ? await preflight()
      : await withContentFailureAudit({
        db,
        action: contentRoute.action,
        publisherUid: user.uid,
        draftId: contentRoute.draftId,
        occurredAt: new Date().toISOString(),
      }, preflight);
    const common = { db, draftId: contentRoute.draftId, publisherUid: user.uid };
    const articleTemplate = contentRoute.action.startsWith('preview') || contentRoute.action === 'publish'
      ? injectRuntimePublicConfig(await loadArticleShell(), RUNTIME_PUBLIC_CONFIG)
      : undefined;
    if (contentRoute.action === 'preview-document') {
      const preview = await previewDraft({
        ...common,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedRevision: body.expectedRevision,
        expectedContentSha256: body.expectedContentSha256,
        articleTemplate,
        origin: SITE_ORIGIN,
      });
      json(response, 200, preview);
      return;
    }
    const result = contentRoute.action === 'preview'
      ? await previewDraft({
        ...common,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedRevision: body.expectedRevision,
        expectedContentSha256: body.expectedContentSha256,
        articleTemplate,
        origin: SITE_ORIGIN,
      })
      : contentRoute.action === 'save'
        ? await saveCanonicalDraft({
          ...common,
          publisherEmail: user.email,
          draft: body.draft,
          expectedUpdatedAt: body.expectedUpdatedAt,
          expectedRevision: body.expectedRevision,
          expectedContentSha256: body.expectedContentSha256,
          checkpoint: body.checkpoint,
        })
        : contentRoute.action === 'migrate'
          ? await migrateLegacyDraft({
            ...common,
            expectedUpdatedAt: body.expectedUpdatedAt,
            expectedRevision: body.expectedRevision,
            expectedSourceSha256: body.expectedSourceSha256,
          })
      : contentRoute.action === 'archive'
        ? await archiveDraft({ ...common, expectedUpdatedAt: body.expectedUpdatedAt })
        : contentRoute.action === 'restore'
          ? await restoreDraft({ ...common, expectedUpdatedAt: body.expectedUpdatedAt })
        : contentRoute.action === 'publish'
          ? await publishDraft({
            ...common,
            expectedUpdatedAt: body.expectedUpdatedAt,
            expectedRevision: body.expectedRevision,
            expectedContentSha256: body.expectedContentSha256,
            previewReceiptId: body.previewReceiptId,
            idempotencyKey: body.idempotencyKey,
            origin: SITE_ORIGIN,
            articleTemplate,
          })
          : await unpublishDraft({ ...common, expectedUpdatedAt: body.expectedUpdatedAt });
    json(response, 200, result);
    return;
  }
  throw Object.assign(new Error('API route not found.'), { statusCode: 404 });
};

const proxyFirebaseAuth = async (request, response, url) => {
  const target = new URL(url.pathname + url.search, FIREBASE_AUTH_ORIGIN);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || ['host', 'connection', 'content-length'].includes(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('host', FIREBASE_AUTH_ORIGIN.host);
  const body = ['GET', 'HEAD'].includes(request.method ?? 'GET') ? undefined : Buffer.concat(await Array.fromAsync(request));
  const upstream = await fetch(target, { method: request.method, headers, body, redirect: 'manual' });
  const responseHeaders = Object.fromEntries(upstream.headers.entries());
  response.writeHead(upstream.status, responseHeaders);
  if (request.method === 'HEAD' || !upstream.body) response.end();
  else for await (const chunk of upstream.body) response.write(chunk);
  response.end();
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const resolveStaticFile = async (pathname) => {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const clean = normalize(decoded).replace(/^([/\\])+/, '');
  const candidates = decoded.endsWith('/')
    ? [join(DIST_ROOT, clean, 'index.html')]
    : [join(DIST_ROOT, clean), join(DIST_ROOT, clean, 'index.html'), join(DIST_ROOT, `${clean}.html`)];
  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (resolved !== DIST_ROOT && !resolved.startsWith(`${DIST_ROOT}${sep}`)) continue;
    try { if ((await stat(resolved)).isFile()) return resolved; } catch { /* Try the next candidate. */ }
  }
  return null;
};

const loadArticleShell = () => {
  articleShellPromise ??= readFile(join(DIST_ROOT, 'article-shell-internal', 'index.html'), 'utf8');
  return articleShellPromise;
};

const serveFile = async (request, response, file, status = 200) => {
  if (extname(file).toLowerCase() === '.html') {
    serveText(request, response, await readFile(file, 'utf8'), 'text/html; charset=utf-8', status);
    return;
  }
  const immutable = /\.(?:css|js|png|jpg|jpeg|webp|gif|ico|svg|woff2)$/i.test(file);
  response.writeHead(status, {
    ...securityHeaders,
    'Content-Type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=2592000, immutable' : 'no-cache',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
};

const serveText = (
  request,
  response,
  body,
  contentType,
  status = 200,
  cacheControl = 'public, max-age=0, must-revalidate',
  { preserveExactBytes = false } = {},
) => {
  const renderedBody = prepareServedText({
    body,
    contentType,
    runtimeConfig: RUNTIME_PUBLIC_CONFIG,
    preserveExactBytes,
  });
  response.writeHead(status, {
    ...securityHeaders,
    'Cache-Control': cacheControl,
    'Content-Type': contentType,
  });
  response.end(request.method === 'HEAD' ? '' : renderedBody);
};

const loadPublishedArticlesSafely = async () => {
  try {
    return await listPublishedArticles(db);
  } catch (error) {
    console.error('Published-content discovery is temporarily unavailable.', error);
    return [];
  }
};

const optionalUser = async (request) => {
  if (!String(request.headers.authorization ?? '').startsWith('Bearer ')) return null;
  return requireUser(request);
};

const serveContentAsset = async (request, response, assetId) => {
  const { asset, file } = assetId.startsWith('collections/')
    ? await resolveCollectionArtwork({ db, bucket, id: assetId.slice('collections/'.length) })
    : await resolveStudioContentAsset({
    db,
    bucket,
    assetId,
    user: await optionalUser(request),
  });
  response.writeHead(200, {
    ...securityHeaders,
    'Cache-Control': 'no-store',
    'Vary': 'Authorization',
    'Content-Type': asset.contentType,
    'Content-Length': String(asset.size),
  });
  if (request.method === 'HEAD') response.end();
  else {
    try {
      await pipeline(file.createReadStream({ validation: true }), response);
    } catch (error) {
      // Storage errors can arrive after headers or bytes have been sent. End the
      // incomplete response without trying to write a second JSON response.
      response.destroy();
      console.error('Content asset stream failed.', { name: error?.name });
    }
  }
};

const serveStatic = async (request, response, url) => {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = await resolveStaticFile(requested);
  const normalizedPath = requested.length > 1 ? requested.replace(/\/$/, '') : requested;
  if (file && normalizedPath === '/insights') {
    const [template, articles] = await Promise.all([readFile(file, 'utf8'), loadPublishedArticlesSafely()]);
    const html = template.replace('<!--@@BLOG_DYNAMIC_INSIGHTS@@-->', renderPublishedInsightRows(articles));
    serveText(request, response, html, 'text/html; charset=utf-8');
    return;
  }
  if (file && normalizedPath === '/sitemap-0.xml') {
    const [template, articles] = await Promise.all([readFile(file, 'utf8'), loadPublishedArticlesSafely()]);
    serveText(request, response, appendPublishedUrlsToSitemap(template, articles, SITE_ORIGIN), 'application/xml; charset=utf-8');
    return;
  }
  if (file && !isInternalArticleShellFile(file, DIST_ROOT)) {
    await serveFile(request, response, file);
    return;
  }

  const pathSegments = requested.split('/').filter(Boolean);
  if (pathSegments.length === 1) {
    const article = await loadPublishedArticle(db, pathSegments[0]);
    if (article) {
      serveText(
        request,
        response,
        article.renderedPageHtml,
        'text/html; charset=utf-8',
        200,
        'public, max-age=0, must-revalidate',
        { preserveExactBytes: true },
      );
      return;
    }
  }

  const notFound = await resolveStaticFile('/404.html');
  if (!notFound) throw Object.assign(new Error('Page not found.'), { statusCode: 404 });
  await serveFile(request, response, notFound, 404);
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', SITE_ORIGIN);
    if (url.pathname.startsWith('/api/')) await handleApi(request, response, url);
    else if (url.pathname.startsWith('/__/auth')) await proxyFirebaseAuth(request, response, url);
    else if ((request.method === 'GET' || request.method === 'HEAD') && /^\/content-assets\/(?:collections\/)?[a-f0-9-]+$/.test(url.pathname)) {
      await serveContentAsset(request, response, url.pathname.slice('/content-assets/'.length));
    }
    else if (request.method === 'GET' || request.method === 'HEAD') await serveStatic(request, response, url);
    else json(response, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    if (status >= 500) console.error('Request failed', { status, name: error?.name });
    const details = status < 500 ? publicStudioContentErrorDetails(error) : null;
    json(response, status, {
      error: status >= 500 ? 'The service could not complete this request.' : error.message,
      ...(details ?? {}),
    });
  }
});

return server;
};

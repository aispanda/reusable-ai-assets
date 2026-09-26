import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium, expect } from '@playwright/test';
import { createContentDocument, renderContentDocument } from '../server/studio-content-document.mjs';
import { renderPublishedArticle, renderPublishedPreview, sanitizeArticleBody } from '../server/content-publishing.mjs';

// Fresh test contexts only. Every external request is intercepted; this suite
// verifies consent, fallback and isolation, never real YouTube availability.
const videoId = 'AbCdEf123_-';
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const studioSource = readFileSync(new URL('../src/pages/studio/index.astro', import.meta.url), 'utf8');
const previewSandbox = studioSource.match(/<iframe\b[^>]*data-preview-frame[^>]*sandbox="([^"]+)"/)?.[1];
assert.ok(previewSandbox, 'Studio must declare its preview sandbox explicitly.');
const template = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="@@STYLE_URL@@"></head><body><main class="shell"><h1>@@BLOG_ARTICLE_TITLE@@</h1>@@BLOG_ARTICLE_BODY@@</main></body></html>';
const document = createContentDocument({ type: 'doc', content: [{ type: 'youtube', attrs: { videoId } }] });
const article = {
  title: 'Media regression fixture', excerpt: '', slug: 'media-test', draftId: 'disposable-media-test', readMinutes: 1,
  bodyHtml: sanitizeArticleBody(renderContentDocument(document) + '<script>window.__authorScript=true</script>'),
};
const scriptJson = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
let browser;
let server;
let origin;
const localRequests = [];

test.before(async () => {
  browser = await chromium.launch({ headless: true, timeout: 30000,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
  });
  server = createServer((request, response) => {
    localRequests.push(request.url);
    if (request.url === '/style.css') {
      response.writeHead(200, { 'Content-Type': 'text/css' }); response.end(css); return;
    }
    const shell = template.replace('@@STYLE_URL@@', `${origin}/style.css`);
    let html = renderPublishedArticle(shell, article, origin);
    if (request.url === '/preview-host') {
      const preview = renderPublishedPreview(shell, article, origin);
      html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}iframe{display:block;width:100%;height:800px;border:0}</style></head><body><div id="parent-auth-canary" hidden>fictional-parent-only-value</div><iframe title="Preview" sandbox="${previewSandbox}"></iframe><script>const parsed = new DOMParser().parseFromString(${scriptJson(preview)}, 'text/html'); document.querySelector('iframe').srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;</script></body></html>`;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

for (const width of [1280, 320]) {
  for (const surface of ['public', 'preview']) {
    test(`${surface} media at ${width}px: explicit load, private provider, visible fallback and isolation`, { timeout: 30000 }, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      context.setDefaultTimeout(10000);
      const remoteRequests = [];
      await context.route('**/*', async route => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        remoteRequests.push(route.request().url());
        // Includes YouTube, thumbnails and fallback navigation: zero provider traffic.
        return route.fulfill({ status: 503, contentType: 'text/html', body: '<!doctype html><p>Video unavailable in this test.</p>' });
      });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/${surface === 'preview' ? 'preview-host' : 'public'}`);
        await page.waitForLoadState('networkidle');
        const root = surface === 'preview' ? page.frameLocator('iframe[title="Preview"]') : page;
        const load = root.getByRole('button', { name: 'Load YouTube player', exact: true });
        const fallback = root.getByRole('link', { name: 'Watch on YouTube (opens a new tab)', exact: true });
        await expect(load).toBeVisible();
        await expect(fallback).toBeVisible();
        await expect(root.locator('[data-youtube-player] iframe')).toHaveCount(0);
        assert.deepEqual(remoteRequests, []);
        const frame = surface === 'preview' ? page.frames().find(frame => frame.parentFrame() === page.mainFrame()) : page.mainFrame();
        assert.ok(frame);
        assert.equal(await frame.evaluate(() => window.__authorScript), undefined);

        if (surface === 'preview') {
          const sandbox = await page.locator('iframe[title="Preview"]').getAttribute('sandbox');
          assert.equal(sandbox.split(/\s+/).includes('allow-same-origin'), false);
          assert.equal(await frame.evaluate(() => {
            try { return parent.document.querySelector('#parent-auth-canary').textContent; }
            catch (error) { return error.name; }
          }), 'SecurityError');
          const policy = await root.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
          assert.match(policy, /script-src 'sha256-[^']+'/);
          assert.doesNotMatch(policy.split(';').find(part => part.trim().startsWith('script-src')), /unsafe-inline|unsafe-eval/);
          await frame.evaluate(() => {
            const script = document.createElement('script');
            script.textContent = 'window.__authorScript=true';
            document.body.append(script);
          });
          assert.equal(await frame.evaluate(() => window.__authorScript), undefined);
          assert.equal(await frame.evaluate(async target => {
            try { await fetch(target, { credentials: 'include' }); return 'unexpected request'; }
            catch (error) { return error.name; }
          }, `${origin}/parent-only-endpoint`), 'TypeError');
          assert.equal(localRequests.includes('/parent-only-endpoint'), false);
          assert.deepEqual(remoteRequests, []);
        }

        const unavailable = page.waitForResponse(response => response.url().startsWith('https://www.youtube-nocookie.com/embed/'));
        await load.click();
        assert.equal((await unavailable).status(), 503);
        const player = root.locator('[data-youtube-player] iframe');
        await expect(player).toHaveCount(1);
        const url = new URL(await player.getAttribute('src'));
        assert.equal(url.origin, 'https://www.youtube-nocookie.com');
        assert.equal(url.pathname, `/embed/${videoId}`);
        assert.equal(url.searchParams.get('autoplay'), '0');
        assert.equal(remoteRequests.length, 1);
        await expect(load).toBeHidden();
        await expect(fallback).toBeVisible();
        await expect(fallback).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videoId}`);
        assert.match(await fallback.getAttribute('rel'), /noopener/);
        // Duplicate handler calls cannot create additional embeds or requests.
        await root.locator('[data-youtube-load]').evaluate(button => button.click());
        await expect(player).toHaveCount(1);
        assert.equal(remoteRequests.length, 1);
        const dimensions = await frame.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
          overflowing: [...document.querySelectorAll('main,figure,[data-youtube-player],iframe,h1')].map(element => ({
            element: element.tagName, className: element.className, width: element.getBoundingClientRect().width,
          })).filter(element => element.width > innerWidth),
        }));
        assert.ok(dimensions.scroll <= dimensions.width + 1, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
        const box = await player.boundingBox();
        assert.ok(box && box.width <= width && box.height >= 200);
      } finally { await context.close(); }
    });
  }
}

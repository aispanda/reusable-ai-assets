// Fresh local Chromium only: no production accounts, browser profiles or assets.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { after, before, test } from 'node:test';
import { renderPublishedPreview } from '../server/content-publishing.mjs';

const runtime = new URL('../', import.meta.url);
const require = createRequire(new URL('package.json', runtime));
const { chromium, expect } = require('@playwright/test');
const sharp = require('sharp');
const moduleSource = await readFile(new URL('src/scripts/studio-preview-operations.mjs', runtime), 'utf8');
const studioSource = await readFile(new URL('src/pages/studio/index.astro', runtime), 'utf8');
const iframeMarkup = studioSource.match(/<iframe\b[^>]*data-preview-frame[^>]*><\/iframe>/)?.[0];
assert.ok(iframeMarkup, 'Test uses the actual studio preview iframe and sandbox');
// Execute the actual refreshPreview and click-handler source, not a copied
// implementation. Surrounding editor state and backend responses remain fixtures.
const handlerStart = studioSource.indexOf('      const refreshPreview = async () => {');
const handlerEnd = studioSource.indexOf("      document.querySelector<HTMLButtonElement>('[data-close-preview]')", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'Actual Studio Preview handler boundaries must exist');
const previewHandlerSource = stripTypeScriptTypes(studioSource.slice(handlerStart, handlerEnd));
const assetIds = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const imageBytes = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#286951' } }).png().toBuffer();
let server, browser, origin;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === '/preview-operations.mjs') {
      response.writeHead(200, { 'Content-Type': 'text/javascript' });
      response.end(moduleSource);
    } else if (request.url === '/fixture.png') {
      response.writeHead(200, { 'Content-Type': 'image/png' });
      response.end(imageBytes);
    } else if (request.url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html><html><head><meta charset="UTF-8"></head><body><input aria-label="Fixture article title" value="Saved fixture"><article contenteditable="true">Existing editor text</article><p role="status">Draft saved</p>${iframeMarkup}</body></html>`);
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
});

after(async () => {
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

async function pageFor(t) {
  const context = await browser.newContext();
  t.after(() => context.close());
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(origin);
  return page;
}

test('Chromium decodes valid saved bytes in the active document but rejects the same bytes in DOMParser HTML', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async () => {
    const blob = await (await fetch('/fixture.png')).blob();
    const url = URL.createObjectURL(blob);
    try {
      const active = new Image();
      active.src = url;
      await active.decode();
      const parsed = new DOMParser().parseFromString('<img alt="Fixture">', 'text/html');
      const detached = parsed.querySelector('img');
      detached.src = url;
      let detachedError;
      try { await detached.decode(); } catch (error) { detachedError = error.name; }
      return { width: active.naturalWidth, detachedError };
    } finally { URL.revokeObjectURL(url); }
  });
  assert.deepEqual(result, { width: 64, detachedError: 'EncodingError' });
});

test('Actual preview hydration renders both private images with the production CSP and opaque iframe sandbox', async t => {
  const page = await pageFor(t);
  const browserErrors = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  const bodyHtml = `<figure><img src="/content-assets/${assetIds[0]}" alt="Lead illustration"><figcaption>Original caption</figcaption></figure>`
    + '<p>A long local test article.</p>'.repeat(160)
    + `<figure><img loading="lazy" src="/content-assets/${assetIds[1]}" alt="Later illustration"><figcaption>Original credit</figcaption></figure>`;
  const html = renderPublishedPreview('<!doctype html><html><head><title>@@BLOG_ARTICLE_TITLE@@</title></head><body><article>@@BLOG_ARTICLE_BODY@@</article></body></html>', {
    slug: 'local-preview-fixture', title: 'Local preview fixture', excerpt: 'Disposable test', bodyHtml,
  }, origin);
  const result = await page.evaluate(async ({ html }) => {
    const { hydratePrivatePreviewImages } = await import('/preview-operations.mjs');
    const loaded = [];
    const hydrated = await hydratePrivatePreviewImages(html, async id => {
      loaded.push(id);
      return (await fetch('/fixture.png')).blob();
    });
    const parsed = new DOMParser().parseFromString(hydrated, 'text/html');
    const original = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('[data-preview-frame]').srcdoc = hydrated;
    return {
      loaded,
      sources: [...parsed.images].map(image => image.getAttribute('src')),
      csp: parsed.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
      originalCsp: original.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
      captions: [...parsed.querySelectorAll('figcaption')].map(node => node.textContent),
    };
  }, { html });
  assert.deepEqual(result.loaded, assetIds);
  assert.ok(result.sources.every(source => source.startsWith('data:image/png;base64,')));
  assert.equal(result.csp, result.originalCsp);
  assert.deepEqual(result.captions, ['Original caption', 'Original credit']);
  const iframe = page.locator('[data-preview-frame]');
  assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
  assert.equal(await iframe.evaluate(frame => frame.contentDocument), null, 'Preview must retain its opaque origin');
  for (const name of ['Lead illustration', 'Later illustration']) {
    const image = page.frameLocator('[data-preview-frame]').getByRole('img', { name });
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    const decoded = await image.evaluate(async node => {
      try { await node.decode(); } catch (error) { return { error: error.name, source: node.src, width: node.naturalWidth }; }
      return { width: node.naturalWidth };
    });
    assert.equal(decoded.width, 64, JSON.stringify({ name, decoded, browserErrors }));
  }
});

test('A failed image waits for a delayed successful sibling and releases every object URL before rejecting', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async ids => {
    const { hydratePrivatePreviewImages } = await import('/preview-operations.mjs');
    const blob = await (await fetch('/fixture.png')).blob();
    const created = [], revoked = [];
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => { const url = create(value); created.push(url); return url; };
    URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
    let releaseSlow, signalStarted;
    const slow = new Promise(resolve => { releaseSlow = resolve; });
    const started = new Promise(resolve => { signalStarted = resolve; });
    let errorText = '', settled = false;
    const hydration = hydratePrivatePreviewImages(ids.map(id => `<img src="/content-assets/${id}">`).join(''), async id => {
      if (id === ids[0]) throw new Error('Fixture image unavailable');
      signalStarted();
      await slow;
      return blob;
    }).catch(error => { errorText = error.message; }).finally(() => { settled = true; });
    await started;
    await new Promise(resolve => setTimeout(resolve, 0));
    const settledBeforeSibling = settled;
    releaseSlow();
    await hydration;
    // Allow the old fail-fast implementation's abandoned decoder to finish too.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { settledBeforeSibling, created, revoked, errorText };
  }, assetIds);
  assert.equal(result.settledBeforeSibling, false, 'Cleanup must not finish while a sibling can still create a URL');
  assert.equal(result.created.length, 1, 'Delayed successful sibling was exercised');
  assert.deepEqual(result.revoked, result.created);
  assert.match(result.errorText, /image 1/i);
  assert.match(result.errorText, /try preview again/i);
  assert.doesNotMatch(result.errorText, /replace/i);
});

test('Corrupt siblings and invalid references release temporary URLs; retry succeeds without changing editor state', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async ids => {
    const { hydratePrivatePreviewImages } = await import('/preview-operations.mjs');
    const blob = await (await fetch('/fixture.png')).blob();
    const created = [], revoked = [];
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => { const url = create(value); created.push(url); return url; };
    URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
    const editorBefore = document.body.innerHTML;
    let corruptError, invalidError, invalidLoads = 0;
    try { await hydratePrivatePreviewImages(ids.map(id => `<img src="/content-assets/${id}">`).join(''), async id => id === ids[0] ? new Blob(['not an image'], { type: 'image/png' }) : blob); }
    catch (error) { corruptError = error.message; }
    const outstandingAfterFailure = created.filter(url => !revoked.includes(url));
    try { await hydratePrivatePreviewImages('<img src="/content-assets/%invalid">', async () => { invalidLoads++; return blob; }); }
    catch (error) { invalidError = error.message; }
    const html = `<img src="/content-assets/${ids[0]}" alt="Retry">`;
    const firstSuccess = await hydratePrivatePreviewImages(html, async () => blob);
    const nextSuccess = await hydratePrivatePreviewImages(html, async () => blob);
    return { created, revoked, outstandingAfterFailure, invalidLoads, corruptError, invalidError, firstSuccess, nextSuccess, editorUnchanged: document.body.innerHTML === editorBefore };
  }, assetIds);
  assert.match(result.corruptError, /image 1/i);
  assert.match(result.invalidError, /image 1/i);
  assert.equal(result.invalidLoads, 0, 'Malformed references must not reach the authenticated loader');
  assert.deepEqual(result.outstandingAfterFailure, []);
  assert.equal(result.created.length, 4);
  assert.deepEqual(result.revoked.sort(), result.created.sort());
  assert.match(result.firstSuccess, /data:image\/png;base64,/);
  assert.equal(result.nextSuccess, result.firstSuccess);
  assert.equal(result.editorUnchanged, true);
});

test('An authenticated image read failure leaves the current editor and preview untouched', async t => {
  const page = await pageFor(t);
  const result = await page.evaluate(async id => {
    const { hydratePrivatePreviewImages } = await import('/preview-operations.mjs');
    const before = document.body.innerHTML;
    const html = `<img src="/content-assets/${id}" alt="Private fixture">`;
    let message, cause, calls = 0;
    try {
      await hydratePrivatePreviewImages(html, async requestedId => {
        if (requestedId !== id) throw new Error('Wrong image requested');
        calls++;
        throw new Error('Fixture authorization denied');
      });
    } catch (error) { message = error.message; cause = error.cause?.message; }
    return { unchanged: before === document.body.innerHTML, calls, message, cause };
  }, assetIds[0]);
  assert.equal(result.unchanged, true);
  assert.equal(result.calls, 1);
  assert.equal(result.cause, 'Fixture authorization denied');
  assert.match(result.message, /saved image has not been changed/);
  assert.doesNotMatch(result.message, /replace/i);
});

test('Actual Studio Preview handler rejects a delayed result after a newer autosaved edit, then recovers', async t => {
  const page = await pageFor(t);
  const editedText = 'Edited while the first preview image was loading';
  const previewHtml = text => renderPublishedPreview('<!doctype html><html><head><title>@@BLOG_ARTICLE_TITLE@@</title></head><body><article>@@BLOG_ARTICLE_BODY@@</article></body></html>', {
    slug: 'local-preview-race', title: 'Local preview race', excerpt: 'Disposable test',
    bodyHtml: `<p>${text}</p><img src="/content-assets/${assetIds[0]}" alt="Saved illustration">`,
  }, origin);
  await page.evaluate(async ({ source, originalHtml, editedHtml }) => {
    const operations = await import('/preview-operations.mjs');
    const blob = await (await fetch('/fixture.png')).blob();
    const editor = document.querySelector('article[contenteditable]');
    const frame = document.querySelector('[data-preview-frame]');
    const button = document.createElement('button');
    button.textContent = 'Preview'; button.setAttribute('data-preview', '');
    const dialog = document.createElement('dialog'); dialog.setAttribute('data-preview-dialog', '');
    document.body.append(button, dialog); dialog.append(frame);
    frame.srcdoc = '<p>Previously checked preview</p>';
    const previousHtml = frame.srcdoc;
    const assignments = [], created = [], revoked = [], messages = [], requests = [];
    const srcdoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
    Object.defineProperty(frame, 'srcdoc', {
      get: () => srcdoc.get.call(frame),
      set: value => { assignments.push(value); srcdoc.set.call(frame, value); },
    });
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => { const url = create(value); created.push(url); return url; };
    URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
    let dirty = false, imageLoads = 0, imageStarted = false, releaseImage, controls;
    const delayedImage = new Promise(resolve => { releaseImage = resolve; });
    const state = { editVersion: 0, lastKnownUpdatedAt: '2026-09-24T12:00:00.000Z', currentRevision: 1, currentContentSha256: 'original-fixture-hash' };
    let savedText = editor.textContent;
    const persist = async () => {
      if (dirty) {
        savedText = editor.textContent;
        state.currentRevision++;
        state.currentContentSha256 = 'edited-fixture-hash';
        state.lastKnownUpdatedAt = '2026-09-24T12:00:01.000Z';
        dirty = false;
        controls.setState(state);
      }
      return true;
    };
    const fixture = {
      state, previewButton: button, previewFrame: frame, previewDialog: dialog,
      draftId: 'local-preview-race', persist, hasUnsavedChanges: () => dirty,
      showToast: message => messages.push(message),
      studioBackend: {
        async previewDocument(id) {
          requests.push({ id, revision: state.currentRevision });
          return { previewHtml: state.currentRevision === 1 ? originalHtml : editedHtml, receiptId: `receipt-${state.currentRevision}` };
        },
        async loadImage() {
          imageLoads++;
          if (imageLoads === 1) { imageStarted = true; await delayedImage; }
          return blob;
        },
      },
    };
    const install = new Function('fixture', 'operations', `
      const { captureStudioPreviewState, isStudioPreviewStateCurrent, hydratePrivatePreviewImages } = operations;
      const { previewButton, previewFrame, previewDialog, draftId, persist, hasUnsavedChanges, showToast, studioBackend } = fixture;
      let { editVersion, lastKnownUpdatedAt, currentRevision, currentContentSha256 } = fixture.state;
      let publicationPreviewReceiptId = 'previous-fixture-receipt', lastPreviewError = '';
      ${source}
      return {
        setState(state) { ({ editVersion, lastKnownUpdatedAt, currentRevision, currentContentSha256 } = state); },
        snapshot() { return { receipt: publicationPreviewReceiptId, error: lastPreviewError }; },
      };
    `);
    controls = install(fixture, operations);
    editor.addEventListener('input', () => { dirty = true; state.editVersion++; controls.setState(state); });
    window.previewRace = {
      releaseImage, autosave: persist,
      get imageStarted() { return imageStarted; },
      snapshot: () => ({ ...controls.snapshot(), dirty, savedText, editorText: editor.textContent,
        frameHtml: frame.srcdoc, previousHtml, assignments: [...assignments], created: [...created], revoked: [...revoked],
        messages: [...messages], requests: [...requests], dialogOpen: dialog.open }),
    };
  }, { source: previewHandlerSource, originalHtml: previewHtml('Existing editor text'), editedHtml: previewHtml(editedText) });
  const button = page.locator('[data-preview]');
  await button.click();
  await page.waitForFunction(() => window.previewRace.imageStarted);
  await expect(button).toBeDisabled();
  await page.locator('article[contenteditable]').fill(editedText);
  await page.evaluate(() => window.previewRace.autosave());
  assert.equal((await page.evaluate(() => window.previewRace.snapshot())).dirty, false,
    'The newer edit was autosaved; rejection must use the captured revision, not only an unsaved flag');
  await page.evaluate(() => window.previewRace.releaseImage());
  await expect(button).toBeEnabled();
  const stale = await page.evaluate(() => window.previewRace.snapshot());
  assert.equal(stale.editorText, editedText); assert.equal(stale.savedText, editedText);
  assert.equal(stale.receipt, '', 'An obsolete preview must not leave a usable publication receipt');
  assert.match(stale.error, /changed while preview was loading/);
  assert.deepEqual(stale.assignments, [], 'Stale HTML must never be installed, even temporarily');
  assert.equal(stale.frameHtml, stale.previousHtml); assert.equal(stale.dialogOpen, false);
  assert.equal(stale.created.length, 1); assert.deepEqual(stale.revoked, stale.created);
  assert.deepEqual(stale.messages, [stale.error]);
  await button.click();
  await expect(page.locator('[data-preview-dialog]')).toBeVisible();
  await expect(button).toBeEnabled();
  const recovered = await page.evaluate(() => window.previewRace.snapshot());
  assert.equal(recovered.editorText, editedText); assert.equal(recovered.savedText, editedText);
  assert.equal(recovered.receipt, 'receipt-2'); assert.equal(recovered.error, '');
  assert.equal(recovered.assignments.length, 1); assert.match(recovered.frameHtml, /data:image\/png;base64,/);
  assert.deepEqual(recovered.requests.map(request => request.revision), [1, 2]);
  assert.equal(recovered.created.length, 2); assert.deepEqual(recovered.revoked, recovered.created);
  await expect(page.frameLocator('[data-preview-frame]').locator('article')).toContainText(editedText);
  const image = page.frameLocator('[data-preview-frame]').getByRole('img', { name: 'Saved illustration' });
  assert.equal(await image.evaluate(async node => { await node.decode(); return node.naturalWidth; }), 64);
});

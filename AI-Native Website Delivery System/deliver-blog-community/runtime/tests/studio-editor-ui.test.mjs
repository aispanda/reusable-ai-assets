import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import {
  closeToolbarMenuAndFocusSummary,
  evaluateStudioClipboardPaste,
  evaluateStudioPasteHtml,
  nextToolbarControlIndex,
} from '../src/scripts/studio-toolbar-navigation.mjs';
import { createStudioImageOperationCoordinator } from '../src/scripts/studio-image-operations.mjs';
import { captureStudioPreviewState, isStudioPreviewStateCurrent } from '../src/scripts/studio-preview-operations.mjs';
import { studioPublicUrl, siteArticleIndex } from '../src/scripts/studio-library-operations.mjs';

test('site library joins published pages and own drafts without counterfeit edit rights or dates', () => {
  const own = [{ id: 'own', title: 'My private retitle', updatedAt: '2026-01-03T00:00:00.000Z', publicationStatus: 'published-with-changes', publicPath: '/stories/original', tags: 'collection:private-move' },
    { id: 'new', title: 'My private draft', updatedAt: '2026-01-02T00:00:00.000Z', publicationStatus: 'draft' }];
  const published = [{ slug: 'guide', title: 'Existing guide', source: 'host', path: '/guide', collectionIds: ['guides'], body: 'Never copied' },
    { slug: 'original', title: 'Original public title', collectionIds: ['original-collection'], publishedAt: '2026-01-01T00:00:00.000Z' },
    { slug: 'colleague', title: 'Another author’s live article', collectionIds: [], publishedAt: '2026-01-02T00:00:00.000Z', ownerUid: 'not exposed' }];
  const rows = siteArticleIndex(own, published);
  assert.equal(rows.length, 4);
  const live = rows.find(row => row.id === 'own');
  assert.equal(live.title, 'Original public title');
  assert.equal(live.tags, 'collection:original-collection');
  assert.equal(live.viewOnly, undefined);
  assert.equal(live.publicationStatus, 'published-with-changes');
  const host = rows.find(row => row.source === 'host');
  assert.equal(host.viewOnly, true);
  assert.equal(host.publicPath, '/guide');
  assert.equal(host.updatedAt, '');
  assert.equal(host.body, undefined);
  const colleague = rows.find(row => row.publicPath === '/stories/colleague');
  assert.equal(colleague.viewOnly, true);
  assert.equal(colleague.tags, '');
  assert.equal(colleague.ownerUid, undefined);
  assert.equal(own[0].title, 'My private retitle', 'My articles keeps the working revision');
  assert.equal(siteArticleIndex(own, [...published, published[0]]).length, 4, 'Deduplicate public URLs');
});

test('site library ignores unsafe links and does not retain removed publication rows', () => {
  const host = { slug: 'guide', title: 'Guide', source: 'host', collectionIds: [] };
  for (const path of ['//evil.test/guide', 'javascript:alert(1)', '/guide/../admin', '/guide?secret=1']) {
    assert.deepEqual(siteArticleIndex([], [{ ...host, path }]), []);
  }
  assert.deepEqual(siteArticleIndex([], []), []);
  assert.deepEqual(siteArticleIndex([], [{ slug: '../bad', title: 'Bad' }]), []);
  const offline = { id: 'own', title: 'Offline', updatedAt: '2026-01-01T00:00:00.000Z', publicationStatus: 'unpublished' };
  assert.deepEqual(siteArticleIndex([offline], []), [offline]);
});

test('library Read retains the published URL while a working draft changes slug', () => {
  const draft = { publicationStatus: 'published-with-changes', slug: 'new-draft-slug', publicationLiveUrl: 'https://journal.example/previous-release' };
  assert.equal(studioPublicUrl(draft), 'https://journal.example/previous-release');
  assert.equal(studioPublicUrl({ ...draft, publicationLiveUrl: 'https://journal.example/new-draft-slug' }), 'https://journal.example/new-draft-slug');
  assert.equal(studioPublicUrl({ ...draft, publicationStatus: 'unpublished' }), undefined);
  assert.equal(studioPublicUrl({ ...draft, archivedAt: '2026-09-05T12:00:00.000Z' }), undefined);
  assert.equal(studioPublicUrl({ ...draft, publicationLiveUrl: '' }), undefined);
  assert.equal(studioPublicUrl({ ...draft, publicationLiveUrl: 'javascript:alert(1)' }), undefined);
  assert.equal(studioPublicUrl({ publicationStatus: 'published' }, '/open-the-ai'), '/open-the-ai');
});

test('an edit during delayed preview cannot restore publication readiness', async () => {
  let current = {
    editVersion: 7,
    updatedAt: '2026-08-26T15:00:00.000Z',
    revision: 4,
    contentSha256: 'a'.repeat(64),
    hasUnsavedChanges: false,
  };
  const captured = captureStudioPreviewState(current);
  let finishPreview;
  const delayedPreview = new Promise((resolve) => { finishPreview = resolve; })
    .then(() => isStudioPreviewStateCurrent(captured, current));

  current = { ...current, editVersion: 8, hasUnsavedChanges: true };
  finishPreview();
  assert.equal(await delayedPreview, false);
});

test('cancelled or superseded image uploads cannot mutate the article', async () => {
  const operations = createStudioImageOperationCoordinator();
  let applyCount = 0;
  let resolveFirst;
  const firstUpload = new Promise((resolve) => { resolveFirst = resolve; });
  const first = operations.begin({ targetAssetId: 'first' });
  const delayedCompletion = firstUpload.then(() => operations.complete(first, () => {
    applyCount += 1;
    return true;
  }));

  operations.cancel();
  const second = operations.begin({ targetAssetId: 'second' });
  resolveFirst();
  assert.equal(await delayedCompletion, false);
  assert.equal(applyCount, 0);
  assert.equal(first.controller.signal.aborted, true);

  assert.equal(operations.complete(second, () => {
    applyCount += 1;
    return true;
  }), true);
  assert.equal(applyCount, 1);

  const submittedDescription = Object.freeze({ alt: 'Architecture diagram', decorative: false, caption: 'System' });
  const descriptionOperation = operations.begin({ description: submittedDescription });
  let currentDecorativeChoice = true;
  let appliedDescription;
  assert.equal(operations.complete(descriptionOperation, ({ description }) => {
    appliedDescription = description;
    return true;
  }), true);
  assert.equal(currentDecorativeChoice, true);
  assert.deepEqual(appliedDescription, submittedDescription);
});

const loadEditorSources = async () => Promise.all([
  readFile(new URL('../src/pages/studio/index.astro', import.meta.url), 'utf8'),
  readFile(new URL('../src/scripts/studio-tiptap-schema.mjs', import.meta.url), 'utf8'),
]);

test('settings and final review display the runtime publication origin, not a hardcoded host', async () => {
  const [studio] = await loadEditorSources();
  const server = await readFile(new URL('../server/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /const SITE_ORIGIN = new URL\(siteOrigin\).origin/);
  assert.match(studio, /data-review-url/);
  assert.match(studio, /slugPreview.textContent =[\s\S]*publicationOrigin/);
  assert.match(studio, /reviewUrl.textContent =[\s\S]*publicationOrigin/);
  assert.doesNotMatch(studio, /journal\.example/);
});

test('title controls are discoverable and settings uses the canonical save event', async () => {
  const [studio] = await loadEditorSources();
  assert.match(studio, /for="studio-article-title">Article title<\/label>/);
  assert.match(studio, /id="studio-article-title"[^>]*placeholder="Enter your article title"[^>]*required/);
  assert.match(studio, /aria-label="Article title in settings"[^>]*required data-settings-title/);
  assert.match(studio, /settingsTitle\?\.addEventListener\('input',[\s\S]*if \(title.disabled\) return;[\s\S]*title.value = settingsTitle.value;[\s\S]*title.dispatchEvent\(new Event\('input'/);
  assert.match(studio, /finalPublishButton.disabled = !ready/);
  assert.match(studio, /finally \{\s*\/\/ Opening final review after a fresh preview recalculates readiness\.\s*publishButton.disabled = true;/);
  assert.match(studio, /if \(!title.value.trim\(\)\) throw new Error\('Add an article title/);
  assert.match(studio, /publicationBadge.textContent =[\s\S]*statusLabel\(publicationStatus\)/);
  assert.doesNotMatch(studio, /<span class="studio-badge">Draft<\/span>/);
});

test('title metadata sync preserves text, reports missing input, and respects disabled editing', async () => {
  const [studio] = await loadEditorSources();
  const body = studio.match(/const updateTitleMetadata = \(\) => \{([\s\S]*?)\n      \};/)?.[1];
  assert.ok(body);
  const sync = (context) => runInNewContext(`(() => {${body}})()`, context);
  const field = (value) => ({ value, disabled: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
  const context = {
    title: field(''), settingsTitle: field('stale'), slug: field('valid-slug'), titleCheck: { textContent: '' },
    normalizeSlug: (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90),
  };
  for (const blank of ['', '   ']) {
    context.title.value = blank;
    sync(context);
    assert.equal(context.settingsTitle.value, blank);
    assert.equal(context.title.attributes['aria-invalid'], 'true');
    assert.match(context.titleCheck.textContent, /Add an article title/);
  }
  context.title.value = 'Example title — मानव';
  sync(context);
  assert.equal(context.settingsTitle.value, context.title.value);
  assert.equal(context.settingsTitle.attributes['aria-invalid'], 'false');
  assert.match(context.titleCheck.textContent, /ready/);
  context.slug.value = '';
  context.title.disabled = true;
  sync(context);
  assert.match(context.titleCheck.textContent, /valid URL slug/);
  assert.equal(context.settingsTitle.disabled, true);
});

test('professional editor exposes the approved understandable formatting controls', async () => {
  const [studio] = await loadEditorSources();

  assert.match(studio, /role="toolbar" aria-label="Article formatting"/);
  assert.match(studio, /data-text-style[\s\S]*Paragraph[\s\S]*Heading 2[\s\S]*Heading 3/);
  for (const action of [
    'bold', 'italic', 'link', 'bulletList', 'orderedList', 'liftListItem', 'sinkListItem',
    'blockquote', 'callout', 'horizontalRule', 'undo', 'redo',
  ]) {
    assert.match(studio, new RegExp(`data-editor-action="${action}"`), action);
  }

  assert.match(studio, /data-link-dialog aria-labelledby="studio-link-title"/);
  assert.match(studio, /Select the text you want to link, then choose Link/);
  assert.match(studio, /aria-pressed="false"/);
  assert.match(studio, /button\.setAttribute\('aria-pressed'/);
  assert.match(studio, /button\.disabled = !canRunEditorAction\(action\)/);
  assert.equal(studio.includes('window.prompt('), false);
  assert.equal(studio.includes('data-command='), false);
  assert.equal(studio.includes('data-block='), false);
});

test('toolbar keyboard, paste, and narrow-screen behavior remain explicit', async () => {
  const [studio] = await loadEditorSources();

  assert.match(studio, /aria-keyshortcuts="Control\+B Meta\+B"/);
  assert.match(studio, /aria-keyshortcuts="Control\+I Meta\+I"/);
  assert.match(studio, /aria-keyshortcuts="Control\+K Meta\+K"/);
  assert.match(studio, /event\.altKey && event\.key === 'F10'/);
  assert.match(studio, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.match(studio, /setToolbarTabStop/);
  assert.match(studio, /transformPastedHTML: normalizePastedHtml/);
  assert.match(studio, /handlePaste: \(_view, event\)/);
  assert.match(studio, /event\.preventDefault\(\);[\s\S]*showToast\(result\.message\);[\s\S]*return true;/);
  assert.match(studio, /querySelectorAll\('script, style, iframe, object, embed'\)/);
  assert.match(studio, /parsed\.querySelectorAll\('h1'\)/);
  assert.match(studio, /\.studio-toolbar-more \{ display: block/);
  assert.match(studio, /grid-template-columns: minmax\(100px, 1fr\) repeat\(4, 40px\)/);
  assert.match(studio, /\.studio-toolbar-wide \{ display: none !important; \}/);
  assert.match(studio, /min-height: 44px/);
});

test('Style participates in desktop and mobile roving toolbar navigation', () => {
  const desktopControlCount = 12;
  const mobileControlCount = 5;
  assert.equal(nextToolbarControlIndex('ArrowRight', 0, desktopControlCount), 1);
  assert.equal(nextToolbarControlIndex('ArrowLeft', 0, desktopControlCount), desktopControlCount - 1);
  assert.equal(nextToolbarControlIndex('End', 0, mobileControlCount), mobileControlCount - 1);
  assert.equal(nextToolbarControlIndex('Home', mobileControlCount - 1, mobileControlCount), 0);
  assert.equal(nextToolbarControlIndex('ArrowRight', mobileControlCount - 1, mobileControlCount), 0);
});

test('closing an Insert or mobile More menu restores focus to its visible summary', () => {
  let focused = false;
  const summary = { focus: () => { focused = true; } };
  const menu = { open: true, querySelector: (selector) => selector === 'summary' ? summary : null };
  const control = { closest: (selector) => selector === 'details' ? menu : null };

  assert.equal(closeToolbarMenuAndFocusSummary(control), true);
  assert.equal(menu.open, false);
  assert.equal(focused, true);
});

test('Word, Docs, code, and image paste cannot silently lose unsupported structure', () => {
  const goldenRejectedPastes = [
    '<table class="MsoTableGrid"><tr><td>Alpha</td><td>Beta</td></tr></table>',
    '<table><tbody><tr><td><p>Google Docs A</p></td><td><p>Google Docs B</p></td></tr></tbody></table>',
    '<pre><code>const answer = 42;</code></pre>',
    '<p>Before</p><img src="data:image/png;base64,AAAA" alt="diagram"><p>After</p>',
  ];
  for (const html of goldenRejectedPastes) {
    const result = evaluateStudioPasteHtml(html);
    assert.equal(result.accepted, false, html);
    assert.match(result.message, /Use Paste as plain text instead/);
    assert.ok(result.unsupportedTags.length > 0);
  }

  assert.deepEqual(evaluateStudioPasteHtml('<h2>Heading</h2><p><strong>Safe</strong> text</p><ul><li>One</li></ul>'), {
    accepted: true,
    unsupportedTags: [],
    message: '',
  });
});

test('file-only clipboard images are rejected visibly before the editor can mutate', () => {
  const screenshotPaste = evaluateStudioClipboardPaste({
    html: '',
    items: [{ kind: 'file', type: 'image/png' }],
    files: [{ type: 'image/png' }],
  });
  assert.equal(screenshotPaste.accepted, false);
  assert.deepEqual(screenshotPaste.unsupportedTags, ['clipboard-file']);
  assert.match(screenshotPaste.message, /Pasted files and images are not supported yet/);
  assert.match(screenshotPaste.message, /Paste as plain text/);

  assert.deepEqual(evaluateStudioClipboardPaste({
    html: '',
    items: [{ kind: 'string', type: 'text/plain' }],
    files: [],
  }), { accepted: true, unsupportedTags: [], message: '' });
});

test('the editor schema excludes word-processor styling that the publisher does not support', async () => {
  const [studio, schema] = await loadEditorSources();

  assert.match(schema, /heading: \{ levels: \[2, 3\] \}/);
  assert.match(schema, /strike: false/);
  assert.match(schema, /underline: false/);
  assert.match(schema, /code: false/);
  assert.match(schema, /codeBlock: false/);
  for (const excluded of ['underline', 'strike', 'fontFamily', 'fontSize', 'textColor', 'highlight']) {
    assert.equal(studio.includes(`data-editor-action="${excluded}"`), false, excluded);
  }
});

test('image UX changes the editor only after governed upload success', async () => {
  const [studio] = await loadEditorSources();
  const [backend, schema, server] = await Promise.all([
    readFile(new URL('../src/scripts/studio-firebase.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/studio-tiptap-schema.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../server/server.mjs', import.meta.url), 'utf8'),
  ]);

  assert.match(studio, /data-editor-action="image"/);
  assert.match(studio, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(studio, /data-image-alt/);
  assert.match(studio, /data-image-decorative/);
  assert.match(studio, /Add alternative text or mark the image as decorative/);
  assert.match(studio, /if \(!await persist\(false\)\)[\s\S]*studioBackend\.uploadImage/);
  assert.match(studio, /uploadImage[\s\S]*updateAttributes\('image', attrs\)/);
  assert.match(studio, /deleteSelection\(\)\.run\(\)[\s\S]*Undo is available/);
  assert.match(backend, /new FormData\(\)/);
  assert.match(backend, /\/api\/content\/drafts\/\$\{encodeURIComponent\(id\)\}\/images/);
  assert.match(backend, /loadImage:[\s\S]*Authorization:[\s\S]*cache: 'no-store'/);
  assert.match(schema, /configureStudioImageLoader/);
  assert.match(schema, /studioImageLoader\(String\(assetId\)\)[\s\S]*URL\.createObjectURL/);
  assert.match(schema, /await image\.decode\(\)/);
  assert.match(studio, /configureStudioImageLoader\(\(assetId\) => studioBackend\.loadImage\(assetId\)\)/);
  assert.match(studio, /hydratePrivatePreviewImages[\s\S]*studioBackend\.loadImage\(assetId\)/);
  // Preview decoding, temporary URL cleanup and stale-revision rejection are
  // exercised in Chromium by studio-private-preview-images.test.mjs.
  assert.match(studio, /imageOperations\.cancel\(\)[\s\S]*imageDialog\.close\(\)/);
  assert.match(studio, /imageOperations\.complete\(operation/);
  assert.match(studio, /const description = Object\.freeze\(/);
  assert.match(studio, /setImageFormBusy\(true\)/);
  assert.match(studio, /const attrs = \{ assetId, \.\.\.description \}/);
  assert.match(server, /'Cache-Control': 'no-store'/);
  assert.match(server, /'Vary': 'Authorization'/);
});

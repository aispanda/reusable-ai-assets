import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeYouTubeUrl, youtubeMarkup, mountYouTubePlayers } from '../src/scripts/studio-youtube.mjs';
import { createContentDocument, assertContentDocument, canonicalContentFields, resolveStoredDraftContent, renderContentDocument, stableJson, sha256 } from '../server/studio-content-document.mjs';
import { renderPublishedArticle, renderPublishedPreview, sanitizeArticleBody } from '../server/content-publishing.mjs';
const id = 'AbCdEf12_-3';
test('YouTube normalization accepts explicit video routes and drops tracking/playback parameters', () => {
  for (const url of [`https://www.youtube.com/watch?v=${id}`, `https://youtube.com/watch?v=${id}&autoplay=1&list=ignored&t=10#tracking`, `https://m.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?si=tracking`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`]) assert.deepEqual(normalizeYouTubeUrl(url), { videoId: id });
});
test('YouTube normalization rejects malformed, ambiguous, non-video and attacker URLs', () => {
  for (const url of [null, '', id, `http://youtube.com/watch?v=${id}`, `https://youtube.com.evil.example/watch?v=${id}`, `https://youtube.com@evil.example/watch?v=${id}`, `https://user@youtube.com/watch?v=${id}`, `https://youtube.com:8443/watch?v=${id}`, `https://youtube.com/watch?v=${id}&v=${id}`, 'https://youtube.com/playlist?list=abc', 'https://youtube.com/@channel', 'https://youtu.be/not-an-id', `https://youtu.be/${id}/extra`, `javascript:${id}`, `<iframe src="https://youtu.be/${id}"></iframe>`, `https://youtu.be/\n${id}`]) assert.throws(() => normalizeYouTubeUrl(url));
});
test('server markup has consent and permanent canonical fallback, no iframe or remote thumbnail', () => {
  const markup = JSON.stringify(youtubeMarkup(id));
  assert.match(markup, /Load YouTube player/); assert.match(markup, /Watch on YouTube/);
  assert.doesNotMatch(markup, /iframe|<script|i\.ytimg|autoplay|nocookie/);
  assert.throws(() => youtubeMarkup('bad\" onclick=1'));
});
test('consent creates exactly one no-autoplay privacy player and does not remove the fallback', () => {
  const frames = [], events = {};
  const button = { dataset: {}, hidden: false, addEventListener: (type, callback) => events[type] = callback };
  const container = { querySelector: () => frames[0], append: frame => frames.push(frame) };
  const figure = { getAttribute: () => id, querySelector: selector => selector === '[data-youtube-load]' ? button : container, ownerDocument: { createElement: () => ({ attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, focus() {} }) } };
  const root = { querySelectorAll: () => [figure] };
  mountYouTubePlayers(root); mountYouTubePlayers(root);
  assert.equal(frames.length, 0); events.click(); events.click();
  assert.equal(frames.length, 1); assert.equal(button.hidden, true);
  assert.equal(frames[0].src, `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1`);
  assert.doesNotMatch(frames[0].allow, /autoplay|camera|microphone|clipboard/);
  assert.equal(frames[0].referrerPolicy, 'strict-origin-when-cross-origin');
});

test('media-v2 persists normalized video data and v1 rejects new-only content without rewriting old hashes', () => {
  const old = { format: 'tiptap-json', schemaVersion: 1, registryVersion: 'ai-91-v1', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original v1' }] }] } };
  const oldBytes = stableJson(old), oldHash = sha256(oldBytes);
  const v1 = resolveStoredDraftContent({ ...old, contentSha256: oldHash });
  assert.equal(stableJson(v1.document), oldBytes); assert.equal(v1.contentSha256, oldHash);
  assert.equal(v1.renderedHtml, '<p>Original v1</p>');
  const content = { type: 'doc', content: [...old.content.content, { type: 'youtube', attrs: normalizeYouTubeUrl(`https://youtu.be/${id}`) }] };
  const media = createContentDocument(content);
  assert.equal(media.schemaVersion, 2); assert.equal(media.registryVersion, 'blog-community-media-v2');
  const persisted = canonicalContentFields(media);
  assert.deepEqual(resolveStoredDraftContent(JSON.parse(JSON.stringify(persisted))).document, media);
  assert.throws(() => assertContentDocument({ ...old, content }), /media-v2/);
  for (const attrs of [{ videoId: id, src: 'https://evil.example' }, { videoId: 'bad' }, { videoId: id, autoplay: true }]) assert.throws(() => createContentDocument({ type: 'doc', content: [{ type: 'youtube', attrs }] }));
  assert.throws(() => assertContentDocument({ ...media, registryVersion: 'unregistered' }), /schema version/);
});

test('video publication sanitization retains consent/fallback but never permits author iframe or scripts', () => {
  const media = createContentDocument({ type: 'doc', content: [{ type: 'youtube', attrs: { videoId: id } }] });
  const bodyHtml = sanitizeArticleBody(renderContentDocument(media));
  assert.match(bodyHtml, new RegExp(`data-youtube-id="${id}"`));
  assert.match(bodyHtml, /data-youtube-load/); assert.match(bodyHtml, /target="_blank"/);
  assert.doesNotMatch(sanitizeArticleBody(bodyHtml + '<iframe src="https://evil.example"></iframe><script>alert(1)</script>'), /<iframe|<script|evil\.example/);
  const article = { title: 'Video', excerpt: 'Fixture', slug: 'video', draftId: 'fixture', bodyHtml };
  const template = '<html><head><script>window.untrusted=1</script></head><body>@@BLOG_ARTICLE_BODY@@</body></html>';
  const publicPage = renderPublishedArticle(template, article, 'https://journal.example');
  const preview = renderPublishedPreview(template, article, 'https://journal.example');
  assert.ok(publicPage.includes(bodyHtml)); assert.ok(preview.includes(bodyHtml));
  assert.doesNotMatch(preview, /window\.untrusted/);
  assert.match(preview, /Content-Security-Policy/);
  assert.match(preview, /script-src &#39;sha256-/);
  assert.match(preview, /frame-src https:\/\/www.youtube-nocookie.com/);
  assert.doesNotMatch(preview, /script-src[^;]*unsafe-inline/);
});

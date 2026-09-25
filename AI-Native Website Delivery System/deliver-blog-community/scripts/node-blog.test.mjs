import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blogRoute, mountBlog } from '../assets/integrations/node-blog.mjs';

test('native mount owns editorial routes and preserves host routes', () => {
  for (const route of ['/my-articles', '/manage/users', '/manage/collections', '/write?draft=abc', '/review']) assert.ok(blogRoute(route, '/absent')?.startsWith('/studio'));
  assert.equal(blogRoute('/stories/example-story/discussion', '/absent'), '/example-story');
  assert.equal(blogRoute('/topics/example-topic', '/absent'), '/topics/example-topic');
  assert.equal(blogRoute('/stories', '/absent'), '/stories');
  for (const route of ['/', '/assets', '/ai', '/api/ai/connections', '/insights', '/contact', '/_astro/host.js', '/api/content-not-owned']) assert.equal(blogRoute(route, '/absent'), null);
  for (const route of ['/_astro/%2e%2e/private', '/_astro/..%2fprivate', '/_astro/x\\y']) assert.equal(blogRoute(route, '/absent'), null);
});

test('only existing packaged assets are delegated and requests retain method/body/headers', () => {
  const root = mkdtempSync(join(tmpdir(), 'blog-mount-'));
  try {
    mkdirSync(join(root, '_astro')); writeFileSync(join(root, '_astro', 'editor.js'), 'test');
    assert.equal(blogRoute('/_astro/editor.js?v=1', root), '/_astro/editor.js?v=1');
    let received;
    const handler = mountBlog({ distRoot: root, server: { emit: (...args) => { received = args; } } });
    const req = { url: '/api/content/editorial/access', method: 'POST', headers: { authorization: 'fixture' } }; const res = {};
    assert.equal(handler(req, res), true); assert.deepEqual(received, ['request', req, res]);
    const host = { url: '/api/ai/connections' }; assert.equal(handler(host, res), false); assert.equal(host.url, '/api/ai/connections');
  } finally { rmSync(root, { recursive: true }); }
});

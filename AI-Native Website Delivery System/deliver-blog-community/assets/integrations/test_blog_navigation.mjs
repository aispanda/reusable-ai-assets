import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { buildBlogLinks, normalizeBlogOrigin } from './blog-origin.mjs';

test('explicit canonical HTTPS origin produces only standalone full-page links', () => {
  assert.equal(normalizeBlogOrigin('https://BLOG.JOURNAL.EXAMPLE:443/'), 'https://blog.journal.example');
  assert.deepEqual(buildBlogLinks('https://blog.journal.example'), [
    { label: 'Blog', href: 'https://blog.journal.example/' },
    { label: 'Write an article', href: 'https://blog.journal.example/studio' },
    { label: 'Account settings', href: 'https://blog.journal.example/account' },
  ]);
});

test('each navigation destination has a shipped runtime page', async () => {
  const links = buildBlogLinks('https://blog.journal.example');
  for (const { href } of links) {
    const pathname = new URL(href).pathname;
    const page = pathname === '/' ? 'index.astro' : `${pathname.slice(1)}/index.astro`;
    await access(new URL(`../../runtime/src/pages/${page}`, import.meta.url));
  }
});

test('missing origins, credentials, non-HTTPS and URL payloads fail before rendering', () => {
  for (const value of [undefined, null, '', '/blog', '//blog.example', 'javascript:alert(1)',
    'http://blog.example', 'https://user:secret@blog.example', 'https://@blog.example',
    'https://blog.example/path', 'https://blog.example?next=https://other.example',
    'https://blog.example#token', 'https://blog.example?', 'https://blog.example#',
    ' https://blog.example', 'https://blog.example\n', 'https://blog.example:0',
    'https://blog.example:65536', 'https://blog.example:notaport']) {
    assert.throws(() => buildBlogLinks(value), TypeError, String(value));
  }
});

test('explicit HTTPS port is preserved and callers cannot modify shared link entries', () => {
  const links = buildBlogLinks('https://blog.journal.example:8443');
  assert.equal(links[1].href, 'https://blog.journal.example:8443/studio');
  assert.throws(() => { links[1].href = 'https://other.example'; }, TypeError);
});

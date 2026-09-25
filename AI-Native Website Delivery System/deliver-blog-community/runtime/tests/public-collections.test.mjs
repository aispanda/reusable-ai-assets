import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderCollectionsPage} from '../server/public-collections.mjs';
import { validateHostArticles, visibleHostArticles } from '../server/host-articles.mjs';
const collections=[{id:'sample',title:'Sample <collection>',description:'Explore',art:{src:'/art.webp',alt:'Image'}},{id:'hidden',title:'Hidden',archived:true}];
test('catalogue escapes content, omits archived collections and links to stable routes',()=>{const html=renderCollectionsPage({collections,articles:[]});assert.ok(html.includes('Sample &lt;collection&gt;'));assert.ok(html.includes('/topics/sample'));assert.ok(!html.includes('Hidden'));});
test('detail includes only matching public articles; missing or archived collection is not found',()=>{const html=renderCollectionsPage({collections,articles:[{slug:'one',title:'One',collectionIds:['sample']},{slug:'two',title:'Two',collectionIds:[]}],collectionId:'sample'});assert.ok(html.includes('/stories/one'));assert.ok(!html.includes('/stories/two'));assert.equal(renderCollectionsPage({collections,articles:[],collectionId:'hidden'}),null);});
test('untrusted external or protocol-relative artwork cannot inject attributes',()=>{const html=renderCollectionsPage({collections:[{id:'x',title:'X',art:{src:'//evil.test/a',alt:'bad'}}],articles:[]});assert.ok(!html.includes('<img'));});
test('all-articles index uses public story links across collections',()=>{const html=renderCollectionsPage({collections,articles:[{slug:'one',title:'One',excerpt:'Read it',collectionIds:[]}],allArticles:true});assert.ok(html.includes('Stories &amp; insights'));assert.ok(html.includes('/stories/one'));});

test('empty collections index explains missing collections and provides a useful exit', () => {
  const html = renderCollectionsPage({collections: [], articles: []});
  assert.ok(html.includes('No collections are available yet.'));
  assert.ok(!html.includes('No published articles yet.'));
  assert.ok(html.includes('<footer><a href="/">Back to home</a></footer>'));
  assert.ok(html.includes('href="/topics" aria-current="page"'));
});
test('empty collection detail retains article empty state and returns to catalogue', () => {
  const html = renderCollectionsPage({collections, articles: [], collectionId: 'sample'});
  assert.ok(html.includes('No published articles yet.'));
  assert.ok(html.includes('<footer><a href="/topics">All collections</a></footer>'));
});

const hostPage = { id: 'guide', title: 'A host guide', excerpt: 'Existing public page.', path: '/guide', collectionIds: ['sample'] };
const cover = { src: '/images/guides/cover-1.webp', alt: 'A diagram of the learning process' };
test('host artwork is optional discovery metadata, copied without changing canonical identity', () => {
  const input = { ...hostPage, art: { ...cover, alt: ` ${cover.alt} ` } };
  const [article] = validateHostArticles([input]);
  assert.deepEqual(article.art, cover);
  assert.equal(article.path, hostPage.path);
  input.art.src = '/changed.png';
  assert.equal(article.art.src, cover.src);
  assert.ok(Object.isFrozen(article.art));
  assert.deepEqual(visibleHostArticles([article], collections)[0].art, cover);
  assert.equal(validateHostArticles([hostPage])[0].art, undefined);
});

test('host artwork rejects unsafe URLs, encoded traversal and missing descriptions', () => {
  const unsafe = ['https://evil.test/a.png', '//evil.test/a.png', '/\\evil.test/a.png', '/a\\b.png',
    '/a/../b.png', '/a/./b.png', '/a/%2e%2e/b.png', '/a/%252e%252e/b.png', '/%2f%2fevil.test/a.png',
    '/a%5cb.png', '/a%00.png', '/a\n.png', '/a\u007f.png', '/a//b.png', '/a.png?redirect=evil', '/a.png#bad',
    '/a"onerror="bad.png', 'data:image/png;base64,AAAA'];
  for (const src of unsafe) {
    assert.throws(() => validateHostArticles([{ ...hostPage, art: { ...cover, src } }]), undefined, src);
    for (const options of [{ allArticles: true }, { collectionId: 'sample' }]) {
      const html = renderCollectionsPage({ collections,
        articles: [{ ...hostPage, slug: hostPage.id, art: { src, alt: 'Cover' } }], ...options });
      assert.ok(!html.includes('<img'), src);
    }
  }
  for (const art of [null, [], {}, { ...cover, alt: '' }, { ...cover, alt: '   ' }, { ...cover, alt: 'a'.repeat(501) },
    { ...cover, alt: 'Text\u0000' }, { ...cover, onerror: 'bad' }]) {
    assert.throws(() => validateHostArticles([{ ...hostPage, art }]));
  }
});

test('collection and article cover links preserve destinations and escape accessible descriptions', () => {
  const art = { ...cover, alt: 'Workflow "steps" & <choices>' };
  const articles = visibleHostArticles(validateHostArticles([{ ...hostPage, art }]), collections);
  for (const options of [{ collectionId: 'sample' }, { allArticles: true }]) {
    const html = renderCollectionsPage({ collections, articles, ...options });
    assert.ok(html.includes('<a aria-labelledby="catalogue-title-0" href="/guide"><img src="/images/guides/cover-1.webp"'));
    assert.ok(html.includes('alt="Workflow &quot;steps&quot; &amp; &lt;choices&gt;"'));
    assert.ok(html.includes('loading="lazy" width="600" height="360"'));
    assert.ok(html.includes('<h2 id="catalogue-title-0">A host guide</h2></a>'));
    assert.ok(html.includes('style="object-fit:contain"'));
    assert.ok(!html.includes('/stories/guide'));
  }
  const catalogue = renderCollectionsPage({ collections, articles: [] });
  assert.ok(catalogue.includes('<a aria-labelledby="catalogue-title-0" href="/topics/sample"><img src="/art.webp"'));
  const withoutArt = renderCollectionsPage({ collections, articles: [{ ...hostPage, slug: 'guide' }], allArticles: true });
  assert.ok(!withoutArt.includes('<img'));
  assert.ok(withoutArt.includes('href="/stories/guide"'));
});

test('host catalogue rejects unsafe paths, duplicate identity and editable content fields', () => {
  assert.deepEqual(validateHostArticles(), []);
  assert.deepEqual(validateHostArticles([hostPage]), [hostPage]);
  for (const path of ['https://evil.test/a', '//evil.test/a', '/a/../b', '/a%2fb', '/a?next=b', '/a#b', '/api/content/access', '/manage/users', '/stories/guide', '/topics/sample', '/a\\b']) {
    assert.throws(() => validateHostArticles([{ ...hostPage, path }]));
  }
  for (const change of [{ bodyHtml: '<p>not catalogue metadata</p>' }, { collectionIds: [] }, { collectionIds: ['sample', 'sample'] }, { readMinutes: 0 }, { title: '' }, { id: 'bad/id' }]) {
    assert.throws(() => validateHostArticles([{ ...hostPage, ...change }]));
  }
  assert.throws(() => validateHostArticles([hostPage, { ...hostPage, id: 'other' }]));
  assert.throws(() => validateHostArticles([hostPage, { ...hostPage, path: '/other' }]));
});

test('host pages retain canonical URLs and never appear through missing or archived collections', () => {
  const articles = visibleHostArticles(validateHostArticles([hostPage]), collections);
  const html = renderCollectionsPage({ collections, articles, collectionId: 'sample' });
  assert.ok(html.includes('href="/guide"'));
  assert.ok(!html.includes('/stories/guide'));
  assert.deepEqual(visibleHostArticles([hostPage], []), []);
  assert.deepEqual(visibleHostArticles([hostPage], [{ id: 'sample', archived: true }]), []);
  assert.deepEqual(visibleHostArticles([hostPage], collections, new Set(['guide'])), []);
  const defensive = renderCollectionsPage({ collections, articles: [{ ...hostPage, slug: 'guide', source: 'host', path: '//evil.test' }], allArticles: true });
  assert.ok(!defensive.includes('//evil.test'));
});

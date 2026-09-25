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

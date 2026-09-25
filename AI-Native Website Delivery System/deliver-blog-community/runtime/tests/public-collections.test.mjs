import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderCollectionsPage} from '../server/public-collections.mjs';
const collections=[{id:'sample',title:'Sample <collection>',description:'Explore',art:{src:'/art.webp',alt:'Image'}},{id:'hidden',title:'Hidden',archived:true}];
test('catalogue escapes content, omits archived collections and links to stable routes',()=>{const html=renderCollectionsPage({collections,articles:[]});assert.ok(html.includes('Sample &lt;collection&gt;'));assert.ok(html.includes('/topics/sample'));assert.ok(!html.includes('Hidden'));});
test('detail includes only matching public articles; missing or archived collection is not found',()=>{const html=renderCollectionsPage({collections,articles:[{slug:'one',title:'One',collectionIds:['sample']},{slug:'two',title:'Two',collectionIds:[]}],collectionId:'sample'});assert.ok(html.includes('/stories/one'));assert.ok(!html.includes('/stories/two'));assert.equal(renderCollectionsPage({collections,articles:[],collectionId:'hidden'}),null);});
test('untrusted external or protocol-relative artwork cannot inject attributes',()=>{const html=renderCollectionsPage({collections:[{id:'x',title:'X',art:{src:'//evil.test/a',alt:'bad'}}],articles:[]});assert.ok(!html.includes('<img'));});
test('all-articles index uses public story links across collections',()=>{const html=renderCollectionsPage({collections,articles:[{slug:'one',title:'One',excerpt:'Read it',collectionIds:[]}],allArticles:true});assert.ok(html.includes('Stories &amp; insights'));assert.ok(html.includes('/stories/one'));});

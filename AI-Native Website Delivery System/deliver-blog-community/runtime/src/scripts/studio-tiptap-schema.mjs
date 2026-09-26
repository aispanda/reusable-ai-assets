import { validArticleLayout } from './article-layouts.mjs';
import { Node, mergeAttributes } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { youtubeMarkup, mountYouTubePlayers } from './studio-youtube.mjs';

export const STUDIO_CONTENT_FORMAT = 'tiptap-json';
export const STUDIO_SCHEMA_VERSION = 1;
export const STUDIO_REGISTRY_VERSION = 'ai-91-v1';
export const STUDIO_MEDIA_SCHEMA_VERSION = 2;
export const STUDIO_MEDIA_REGISTRY_VERSION = 'blog-community-media-v2';
export const STUDIO_LAYOUT_SCHEMA_VERSION = 3;
export const STUDIO_LAYOUT_REGISTRY_VERSION = 'sanatanavoice-article-layouts-v1';
export const isSupportedStudioVersion = ({ schemaVersion, registryVersion }) =>
  schemaVersion === STUDIO_SCHEMA_VERSION && registryVersion === STUDIO_REGISTRY_VERSION
  || schemaVersion === STUDIO_MEDIA_SCHEMA_VERSION && registryVersion === STUDIO_MEDIA_REGISTRY_VERSION
  || schemaVersion === STUDIO_LAYOUT_SCHEMA_VERSION && registryVersion === STUDIO_LAYOUT_REGISTRY_VERSION;

// A normal v1 edit keeps its version. New-only media explicitly selects v2 on save;
// readers never stamp a new version onto an existing document or its hash.
export function studioContentVersion(content, layout) {
  if (layout !== undefined) {
    if (!validArticleLayout(layout)) throw new Error('Choose a supported article layout.');
    return { schemaVersion: STUDIO_LAYOUT_SCHEMA_VERSION, registryVersion: STUDIO_LAYOUT_REGISTRY_VERSION };
  }
  const pending = [content];
  let visited = 0;
  while (pending.length) {
    if (++visited > 10000) throw new Error('The article structure is too complex.');
    const node = pending.pop();
    if (node?.type === 'youtube' || node?.type === 'image' && node.attrs?.credit !== undefined && node.attrs.credit !== '') return { schemaVersion: STUDIO_MEDIA_SCHEMA_VERSION, registryVersion: STUDIO_MEDIA_REGISTRY_VERSION };
    if (Array.isArray(node?.content)) pending.push(...node.content);
  }
  return { schemaVersion: STUDIO_SCHEMA_VERSION, registryVersion: STUDIO_REGISTRY_VERSION };
}

let studioImageLoader = null;
const imageCaptionText = (caption, credit) => [caption, credit ? `Credit: ${credit}` : ''].filter(Boolean).join(' · ');

export const configureStudioImageLoader = (loader) => {
  studioImageLoader = typeof loader === 'function' ? loader : null;
};

export const StudioCallout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML: () => [{ tag: 'aside.studio-callout' }],
  renderHTML: ({ HTMLAttributes }) => [
    'aside',
    mergeAttributes({ class: 'studio-callout' }, HTMLAttributes),
    0,
  ],
});

export const StudioImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes: () => ({
    assetId: { default: '' },
    alt: { default: '' },
    decorative: { default: false },
    caption: { default: '' },
    // Undefined disappears during JSON serialization, preserving older image hashes.
    credit: { default: undefined },
  }),
  parseHTML: () => [{ tag: 'figure[data-studio-image]' }],
  renderHTML: ({ node }) => {
    const { assetId, alt, decorative, caption, credit } = node.attrs;
    const children = [
      ['img', {
        src: `/content-assets/${encodeURIComponent(String(assetId))}`,
        alt: decorative ? '' : String(alt),
        loading: 'lazy',
        decoding: 'async',
      }],
    ];
    const captionText = imageCaptionText(caption, credit);
    if (captionText) children.push(['figcaption', {}, captionText]);
    return [
      'figure',
      {
        'data-studio-image': '',
        'data-asset-id': String(assetId),
        'data-decorative': decorative ? 'true' : 'false',
      },
      ...children,
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const status = document.createElement('span');
      let objectUrl = '';
      let loadSequence = 0;

      figure.setAttribute('data-studio-image', '');
      status.className = 'studio-image-status';
      status.setAttribute('role', 'status');
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.append(image, status);

      const revokeObjectUrl = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = '';
      };
      const renderNode = (nextNode) => {
        const { assetId, alt, decorative, caption, credit } = nextNode.attrs;
        figure.dataset.assetId = String(assetId);
        figure.dataset.decorative = decorative ? 'true' : 'false';
        image.alt = decorative ? '' : String(alt);
        figure.querySelector('figcaption')?.remove();
        const captionText = imageCaptionText(caption, credit);
        if (captionText) {
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = captionText;
          figure.append(figcaption);
        }

        const sequence = ++loadSequence;
        status.textContent = 'Loading image…';
        figure.setAttribute('aria-busy', 'true');
        if (!studioImageLoader) {
          image.src = `/content-assets/${encodeURIComponent(String(assetId))}`;
          status.textContent = '';
          figure.removeAttribute('aria-busy');
          return;
        }
        studioImageLoader(String(assetId)).then(async (blob) => {
          if (sequence !== loadSequence) return;
          const nextUrl = URL.createObjectURL(blob);
          image.src = nextUrl;
          try {
            await image.decode();
          } catch (error) {
            URL.revokeObjectURL(nextUrl);
            throw error;
          }
          if (sequence !== loadSequence) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          revokeObjectUrl();
          objectUrl = nextUrl;
          status.textContent = '';
          figure.removeAttribute('aria-busy');
        }).catch(() => {
          if (sequence !== loadSequence) return;
          revokeObjectUrl();
          image.removeAttribute('src');
          status.textContent = 'This image could not be loaded. Try refreshing the article.';
          figure.removeAttribute('aria-busy');
        });
      };

      renderNode(node);
      return {
        dom: figure,
        update(nextNode) {
          if (nextNode.type.name !== 'image') return false;
          renderNode(nextNode);
          return true;
        },
        selectNode() { figure.classList.add('ProseMirror-selectednode'); },
        deselectNode() { figure.classList.remove('ProseMirror-selectednode'); },
        destroy() {
          loadSequence += 1;
          revokeObjectUrl();
        },
      };
    };
  },
});

export const StudioYouTube = Node.create({
  name: 'youtube', group: 'block', atom: true, selectable: true, draggable: true,
  addAttributes: () => ({ videoId: { default: '', parseHTML: element => element.getAttribute('data-youtube-id') } }),
  parseHTML: () => [{ tag: 'figure[data-studio-youtube]' }],
  renderHTML: ({ node }) => youtubeMarkup(node.attrs.videoId),
  addNodeView() {
    return ({ node }) => {
      const render = ([tag, attrs, ...children]) => {
        const element = document.createElement(tag);
        for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
        for (const child of children) element.append(typeof child === 'string' ? document.createTextNode(child) : render(child));
        return element;
      };
      const dom = render(youtubeMarkup(node.attrs.videoId));
      dom.contentEditable = 'false';
      mountYouTubePlayers({ querySelectorAll: () => [dom] });
      return { dom, stopEvent: event => Boolean(event.target.closest('button, a, iframe')),
        selectNode: () => dom.classList.add('ProseMirror-selectednode'),
        deselectNode: () => dom.classList.remove('ProseMirror-selectednode') };
    };
  },
});

export const studioTiptapV1Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: false,
    strike: false,
    underline: false,
    code: false,
    codeBlock: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: false,
    linkOnPaste: false,
    protocols: ['http', 'https', 'mailto'],
  }),
  StudioCallout,
  StudioImage,
];
export const studioTiptapExtensions = [...studioTiptapV1Extensions, StudioYouTube];

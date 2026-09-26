import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const imagePath = value => typeof value === 'string' && /^\/(?!\/)[^\\\s<>\u0000-\u001f\u007f]+$/.test(value);

// Optional consumer-owned migration seeds. New installations start empty.
// Never import another site's catalog, artwork or legacy article assignments.
export function loadCollectionProfile(environment = process.env) {
  if (environment.BLOG_COLLECTION_PROFILE === undefined) {
    return { topics: [], articleTopics: {}, articlePresentation: {}, approvedImages: [] };
  }
  if (!environment.BLOG_COLLECTION_PROFILE?.trim()) throw new Error('BLOG_COLLECTION_PROFILE requires a JSON file path.');
  const input = JSON.parse(readFileSync(resolve(environment.BLOG_COLLECTION_PROFILE), 'utf8'));
  const keys = ['topics', 'articleTopics', 'articlePresentation', 'approvedImages'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) {
    throw new Error('Invalid collection profile fields.');
  }
  const result = { topics: [], articleTopics: {}, articlePresentation: {}, approvedImages: [], ...input };
  if (!Array.isArray(result.topics) || result.topics.length > 100 || !Array.isArray(result.approvedImages)
    || result.approvedImages.some(src => !imagePath(src))) {
    throw new Error('Invalid collection seeds or approved image paths.');
  }
  const ids = new Set();
  for (const row of result.topics) {
    if (!record(row) || typeof row.id !== 'string' || row.id.length > 80
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) || row.id === 'none' || ids.has(row.id)
      || typeof row.title !== 'string' || !row.title.trim() || row.title.trim().length > 120
      || !Number.isInteger(row.order) || row.order < 0 || row.order > 10000
      || !['text', 'philosophy', 'tradition', 'practice', 'theme'].includes(row.type)) {
      throw new Error('Collection seeds require unique IDs, titles, order and explicit types.');
    }
    if (row.art !== undefined && (!record(row.art) || !imagePath(row.art.src)
      || (row.art.smallSrc !== undefined && !imagePath(row.art.smallSrc))
      || typeof row.art.alt !== 'string' || !row.art.alt.trim() || row.art.alt.length > 500)) {
      throw new Error('Seed artwork requires local image paths and an image description.');
    }
    ids.add(row.id);
  }
  for (const key of ['articleTopics', 'articlePresentation']) {
    if (!record(result[key])) throw new Error('Invalid legacy collection mappings.');
  }
  if (Object.values(result.articleTopics).some(value => !Array.isArray(value) || value.some(id => !ids.has(id)))) {
    throw new Error('Legacy article assignments must reference a seeded collection.');
  }
  if (Object.values(result.articlePresentation).some(row => !record(row)
    || (row.cover !== undefined && !imagePath(row.cover)))) {
    throw new Error('Legacy article presentation requires objects with local cover paths.');
  }
  return result;
}

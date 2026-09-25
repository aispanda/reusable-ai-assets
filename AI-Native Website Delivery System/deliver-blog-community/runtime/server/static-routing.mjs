import { resolve, sep } from 'node:path';

const versionedAsset = /^(?<stem>.+)\.[A-Za-z0-9_-]{8,32}\.(?<extension>js|css)$/;

export const compatibleVersionedAsset = (requested, candidates) => {
  if (typeof requested !== 'string' || requested.includes('/') || requested.includes('\\')) return null;
  const requestedMatch = requested.match(versionedAsset);
  if (!requestedMatch?.groups) return null;
  const matches = candidates.filter((candidate) => {
    if (typeof candidate !== 'string' || candidate.includes('/') || candidate.includes('\\')) return false;
    const candidateMatch = candidate.match(versionedAsset);
    return candidateMatch?.groups?.stem === requestedMatch.groups.stem
      && candidateMatch.groups.extension === requestedMatch.groups.extension;
  });
  return matches.length === 1 ? matches[0] : null;
};

export const isInternalArticleShellFile = (file, distRoot) => {
  const internalRoot = resolve(distRoot, 'article-shell-internal');
  const candidate = resolve(file);
  return candidate === internalRoot || candidate.startsWith(`${internalRoot}${sep}`);
};

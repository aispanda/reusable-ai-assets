import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Consumer branding belongs in an external JSON profile, not in installed core.
// Its siteOrigin must match the separately required runtime PUBLIC_SITE_ORIGIN.
export const validateSiteProfile = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !['siteName', 'description', 'siteOrigin'].includes(key))) {
    throw new Error('Site profile must contain only siteName, description and siteOrigin.');
  }
  const text = (key, limit) => {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim() || value.length > limit
      || /[<>\u0000-\u001f\u007f]/u.test(value)) {
      throw new Error(`${key} must be nonempty plain text of at most ${limit} characters.`);
    }
    return value.trim();
  };
  const siteName = text('siteName', 120);
  const description = text('description', 500);
  const rawOrigin = text('siteOrigin', 2048);
  let url;
  try { url = new URL(rawOrigin); } catch { throw new Error('siteOrigin must be an absolute HTTP or HTTPS origin.'); }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash || !/^https?:\/\/[^/?#@\\\s]+\/?$/iu.test(rawOrigin)) {
    throw new Error('siteOrigin must contain only HTTP(S) scheme, hostname and optional port; no credentials, path, query or fragment.');
  }
  return Object.freeze({ siteName, description, siteOrigin: url.origin });
};

export const loadSiteProfile = (environment = process.env) => {
  const configured = environment.BLOG_SITE_PROFILE;
  if (configured !== undefined && (typeof configured !== 'string' || !configured.trim())) {
    throw new Error('BLOG_SITE_PROFILE must name an existing external JSON profile.');
  }
  const path = configured === undefined ? new URL('./site.json', import.meta.url) : resolve(configured);
  let input;
  try { input = JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error('Site profile could not be read as JSON. Check BLOG_SITE_PROFILE.'); }
  return validateSiteProfile(input);
};

export const serializeSiteProfile = (profile) => JSON.stringify(validateSiteProfile(profile))
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSiteProfile, validateSiteProfile } from '../site-profile.mjs';

export const assertProductionSiteProfile = (input, publicSiteOrigin) => {
  const profile = validateSiteProfile(input);
  if (!publicSiteOrigin) throw new Error('PUBLIC_SITE_ORIGIN is required for the production build profile.');
  const runtime = validateSiteProfile({ ...profile, siteOrigin: publicSiteOrigin });
  if (new URL(profile.siteOrigin).protocol !== 'https:' || new URL(runtime.siteOrigin).protocol !== 'https:') {
    throw new Error('Production build profile and PUBLIC_SITE_ORIGIN must use HTTPS.');
  }
  if (profile.siteOrigin !== runtime.siteOrigin) {
    throw new Error('Production build profile must match PUBLIC_SITE_ORIGIN.');
  }
  return profile;
};

const projectId = value => {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value) || value.startsWith('demo-')) throw new Error('An explicit non-emulator Firebase project identity is required.');
  return value;
};
const exactObject = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value,key))) throw new Error(`Invalid ${label} fields.`);
};

// A deployment approval is external configuration, never inferred from the host
// header or from a staging flag alone. The immutable image pins its production
// origin and project; a stage approval must name both that source and its target.
export function resolveBuiltDeploymentProfile(built, actual, approvedStaging) {
  const envelope = Boolean(built && Object.hasOwn(built, 'site'));
  if (envelope) exactObject(built, ['site','productionProjectId'], 'build profile');
  const site = validateSiteProfile(envelope ? built.site : built);
  if (new URL(site.siteOrigin).protocol !== 'https:') throw new Error('Built production origin must use HTTPS.');
  const productionProjectId = envelope ? projectId(built.productionProjectId) : null;
  if (!actual || !['production','staging'].includes(actual.environment)) throw new Error('An explicit deployment environment is required.');
  if (actual.environment === 'production') {
    if (approvedStaging) throw new Error('Staging approval cannot be used in production.');
    const result = assertProductionSiteProfile(site, actual.siteOrigin);
    if (productionProjectId && projectId(actual.projectId) !== productionProjectId) throw new Error('Production Firebase project does not match the immutable build.');
    return result;
  }
  if (!productionProjectId) throw new Error('Staging requires a build with an explicit production project identity.');
  exactObject(approvedStaging, ['productionSiteOrigin','productionProjectId','siteOrigin','projectId'], 'approved staging profile');
  if (approvedStaging.productionSiteOrigin !== site.siteOrigin || approvedStaging.productionProjectId !== productionProjectId) throw new Error('Staging approval does not match the immutable production build.');
  const stage = validateSiteProfile({...site,siteOrigin:approvedStaging.siteOrigin});
  if (new URL(stage.siteOrigin).protocol !== 'https:' || stage.siteOrigin !== approvedStaging.siteOrigin || stage.siteOrigin === site.siteOrigin) throw new Error('Approved staging origin must be a distinct canonical HTTPS origin.');
  if (projectId(approvedStaging.projectId) === productionProjectId) throw new Error('Staging requires an isolated Firebase project.');
  if (actual.siteOrigin !== stage.siteOrigin || projectId(actual.projectId) !== approvedStaging.projectId) throw new Error('Actual staging origin and Firebase project must match the approval.');
  return Object.freeze(stage);
}

export const loadBuiltProductionProfile = (publicSiteOrigin, options) => {
  const built = JSON.parse(readFileSync(new URL('../production-site.json', import.meta.url), 'utf8'));
  // Retain old strict production call behavior. New envelopes additionally need
  // the actual Firebase project supplied by the already validated startup config.
  if (!options) {
    if (built.site) throw new Error('The built deployment requires actual runtime environment and Firebase project facts.');
    return assertProductionSiteProfile(built, publicSiteOrigin);
  }
  const approved = options.stagingProfilePath ? JSON.parse(readFileSync(resolve(options.stagingProfilePath), 'utf8')) : undefined;
  return resolveBuiltDeploymentProfile(built, {environment:options.environment,siteOrigin:publicSiteOrigin,projectId:options.projectId}, approved);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.BLOG_SITE_PROFILE?.trim()) throw new Error('BLOG_SITE_PROFILE must explicitly name the consumer production profile.');
  const site = assertProductionSiteProfile(loadSiteProfile(process.env), process.env.PUBLIC_SITE_ORIGIN);
  const productionProjectId = projectId(process.env.BLOG_PRODUCTION_PROJECT_ID);
  writeFileSync(new URL('../production-site.json', import.meta.url), JSON.stringify({site,productionProjectId}) + '\n');
}

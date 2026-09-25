import { readFile } from 'node:fs/promises';

const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required for the hosted staging test.`);
  return value.trim();
};

const exactHttpsOrigin = (value, field) => {
  const text = requiredText(value, field);
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error(`${field} must be a canonical HTTPS origin.`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.origin !== text) {
    throw new Error(`${field} must be a canonical HTTPS origin without credentials, path, query or fragment.`);
  }
  return parsed.origin;
};

const hostedProject = (value, field) => {
  const text = requiredText(value, field);
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(text) || text.startsWith('demo-')) {
    throw new Error(`${field} must identify an explicit non-emulator hosted project.`);
  }
  return text;
};

// These checks establish target/fixture shape only. The caller retains deployment
// authority; the hosted browser journey must verify the actual identity and role.
export function validateStagingInputs({ origin, productionOrigin, projectId, productionProjectId, draftId, expectedSlug } = {}) {
  const stage = exactHttpsOrigin(origin, 'origin');
  const production = exactHttpsOrigin(productionOrigin, 'productionOrigin');
  if (stage === production) throw new Error('The staging origin must differ from the production origin.');
  const project = hostedProject(projectId, 'projectId');
  const productionProject = hostedProject(productionProjectId, 'productionProjectId');
  if (project === productionProject) throw new Error('The staging project must differ from the production project.');
  const draft = requiredText(draftId, 'draftId');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(draft)) {
    throw new Error('draftId must be an explicit UUID for the staging fixture.');
  }
  const slug = requiredText(expectedSlug, 'expectedSlug');
  if (slug.length > 90 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('expectedSlug must be a lowercase URL slug of at most 90 characters.');
  }
  return Object.freeze({ origin: stage, productionOrigin: production, projectId: project,
    productionProjectId: productionProject, draftId: draft.toLowerCase(), expectedSlug: slug });
}

const authKey = value => typeof value === 'string' && value.startsWith('firebase:authUser:') && value.length > 'firebase:authUser:'.length;
const nonemptyAuth = value => (typeof value === 'string' && value.trim().length > 0)
  || (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);

const hasFirebaseAuth = origin => (
  Array.isArray(origin.localStorage) && origin.localStorage.some(entry => authKey(entry?.name)
    && typeof entry.value === 'string' && entry.value.trim().length > 0)
) || (
  Array.isArray(origin.indexedDB) && origin.indexedDB.some(database => database?.name === 'firebaseLocalStorageDb'
    && Array.isArray(database.stores) && database.stores.some(store => store?.name === 'firebaseLocalStorage'
      && Array.isArray(store.records) && store.records.some(record => authKey(record?.value?.fbase_key)
        && nonemptyAuth(record.value.value))))
);

// Read only the caller-supplied capture. Never discover browser profiles, return
// state bytes, or attach parser/filesystem errors that might reveal private data.
export async function validateStagingSession({ storageState, ...input } = {}) {
  const validated = validateStagingInputs(input);
  const path = requiredText(storageState, 'storageState');
  let state;
  try { state = JSON.parse(await readFile(path, 'utf8')); }
  catch { throw new Error('storageState must be a readable Playwright storage-state JSON file.'); }
  const origins = state && Array.isArray(state.origins) ? state.origins : [];
  const matches = origins.filter(entry => entry && entry.origin === validated.origin);
  if (matches.length !== 1 || !hasFirebaseAuth(matches[0])) {
    throw new Error('storageState must contain Firebase Auth data for the exact staging origin. Capture an isolated staging session first.');
  }
  return validated;
}

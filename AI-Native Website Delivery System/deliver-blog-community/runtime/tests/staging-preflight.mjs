import { readFile } from 'node:fs/promises';

export const firebaseAuthUserLookupPermission = 'firebaseauth.users.get';

// verifyIdToken(token, true) reads the user's disabled/revocation state. Verify
// each deployed runtime's effective access without reading users or granting IAM.
export async function verifyFirebaseAuthPrerequisites({ projectId, runtimeIdentity, checkPermission }) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)
    || typeof runtimeIdentity !== 'string' || !/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(runtimeIdentity)) {
    throw new Error('An explicit Firebase project ID and runtime service account are required.');
  }
  if (typeof checkPermission !== 'function') throw new Error('Read-only effective Firebase Auth IAM verification is required.');
  const resource = `//cloudresourcemanager.googleapis.com/projects/${projectId}`;
  let access;
  try {
    access = await checkPermission({ resource, principalEmail: runtimeIdentity, permission: firebaseAuthUserLookupPermission });
  } catch {
    throw new Error(`Firebase Auth IAM query failed for runtime ${runtimeIdentity} in ${projectId}; user lookup access is unproven.`);
  }
  if (access !== 'CAN_ACCESS') {
    throw new Error(`Runtime Firebase Auth permission is missing or unproven in ${projectId}: ${firebaseAuthUserLookupPermission}.`);
  }
  return { projectId, runtimeIdentity, permission: firebaseAuthUserLookupPermission };
}

export const requiredImageStoragePermissions = Object.freeze([
  'storage.objects.create', 'storage.objects.get', 'storage.objects.delete',
]);

// Read-only deployment prerequisite, not a replacement for a real hosted upload.
// Metadata and effective IAM observations come from the consumer's cloud adapter.
export async function verifyImageStoragePrerequisites({ bucketName, projectNumber, runtimeIdentity,
  readBucketMetadata, checkPermission }) {
  if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucketName || '')
    || !/^[0-9]+$/.test(String(projectNumber || ''))
    || !/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(runtimeIdentity || '')) {
    throw new Error('An explicit image bucket, owning project number and runtime service account are required.');
  }
  const metadata = await readBucketMetadata(bucketName);
  if (metadata?.name !== bucketName || String(metadata?.projectNumber) !== String(projectNumber)) {
    throw new Error('Configured image bucket is missing or belongs to another project.');
  }
  if (metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled !== true
    || metadata.iamConfiguration?.publicAccessPrevention !== 'enforced') {
    throw new Error('Image bucket must enforce uniform bucket-level access and public access prevention to protect private drafts.');
  }
  const resource = `//storage.googleapis.com/projects/_/buckets/${bucketName}`;
  for (const permission of requiredImageStoragePermissions) {
    const access = await checkPermission({ resource, principalEmail: runtimeIdentity, permission });
    if (access !== 'CAN_ACCESS') throw new Error(`Runtime image storage permission is missing or unproven: ${permission}.`);
  }
  return { bucketName, projectNumber: String(projectNumber), runtimeIdentity,
    permissions: [...requiredImageStoragePermissions], private: true };
}

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

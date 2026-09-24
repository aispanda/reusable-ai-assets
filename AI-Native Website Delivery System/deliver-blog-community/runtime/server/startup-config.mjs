import { buildRuntimePublicConfig } from './runtime-config.mjs';

const loopback = (host) => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host);
const localEndpoint = (value, key, includesProtocol = false) => {
  const endpoint = new URL(includesProtocol ? value : 'http://' + value);
  if (endpoint.protocol !== 'http:' || !loopback(endpoint.hostname) || !endpoint.port
      || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
    throw new Error(key + ' must be a loopback emulator endpoint.');
  }
  return endpoint;
};

export const createStartupStorageBucket = (config, createBucket) => {
  if (config.emulators && !config.emulators.storage) {
    return Object.freeze({
      get file() {
        throw Object.assign(new Error('Images are disabled in local emulator mode until a local Storage emulator is configured.'), { statusCode: 503 });
      },
    });
  }
  return createBucket();
};

export const loadStartupConfig = (env = process.env) => {
  if (!env.PUBLIC_SITE_ORIGIN) throw new Error('PUBLIC_SITE_ORIGIN is required.');
  const origin = new URL(env.PUBLIC_SITE_ORIGIN);
  const emulator = env.BLOG_EMULATOR_MODE === 'true';
  if (origin.username || origin.password || origin.search || origin.hash || !['', '/'].includes(origin.pathname)) {
    throw new Error('PUBLIC_SITE_ORIGIN must be an origin without credentials, path or query.');
  }
  if (origin.protocol !== 'https:' && !(emulator && origin.protocol === 'http:' && loopback(origin.hostname))) {
    throw new Error('HTTPS is required outside a loopback emulator.');
  }
  const config = buildRuntimePublicConfig(env, origin.origin);
  if (!config) throw new Error('Explicit runtime Firebase configuration is required.');
  if (emulator) {
    if (!loopback(origin.hostname)) throw new Error('Emulator site origin must stay on loopback.');
    if (env.RUNTIME_ENVIRONMENT !== 'staging' || !config.firebase.projectId.startsWith('demo-')) {
      throw new Error('Emulators require staging and a disposable demo-* project.');
    }
    const endpoints = {};
    for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
      endpoints[key] = localEndpoint(env[key] ?? '', key);
    }
    const firebaseStorage = env.FIREBASE_STORAGE_EMULATOR_HOST
      ? localEndpoint(env.FIREBASE_STORAGE_EMULATOR_HOST, 'FIREBASE_STORAGE_EMULATOR_HOST') : null;
    const storage = env.STORAGE_EMULATOR_HOST
      ? localEndpoint(env.STORAGE_EMULATOR_HOST, 'STORAGE_EMULATOR_HOST', true) : firebaseStorage;
    if (firebaseStorage && storage.origin !== firebaseStorage.origin) {
      throw new Error('Storage emulator aliases must identify the same local endpoint.');
    }
    return { ...config, emulators: {
      auth: endpoints.FIREBASE_AUTH_EMULATOR_HOST.origin,
      firestore: { host: endpoints.FIRESTORE_EMULATOR_HOST.hostname, port: Number(endpoints.FIRESTORE_EMULATOR_HOST.port) },
      storage: storage?.origin ?? null,
    } };
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST || env.STORAGE_EMULATOR_HOST || config.firebase.projectId.startsWith('demo-')) {
    throw new Error('Emulator configuration is forbidden outside explicit emulator mode.');
  }
  return config;
};

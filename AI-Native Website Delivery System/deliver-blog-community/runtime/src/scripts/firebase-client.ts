import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

type RuntimePublicConfig = {
  environment: 'staging' | 'production';
  siteOrigin: string;
  firebase: { apiKey: string; authDomain: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string };
  googleClientId: string;
  emulators?: { auth: string; firestore: { host: string; port: number } };
};
const runtimeConfig = (globalThis as typeof globalThis & {
  __BLOG_RUNTIME_CONFIG__?: RuntimePublicConfig;
}).__BLOG_RUNTIME_CONFIG__;
const firebaseConfig = runtimeConfig?.firebase;
export const googleClientId = runtimeConfig?.googleClientId;
export const runtimeEnvironment = runtimeConfig?.environment ?? 'unconfigured';
export const publicationOrigin = runtimeConfig?.siteOrigin;
export const isFirebaseConfigured = Boolean(firebaseConfig && Object.values(firebaseConfig).every(
  value => typeof value === 'string' && value.trim().length > 0,
) && typeof googleClientId === 'string' && googleClientId.trim().length > 0);
const emulatorApps = new WeakSet<FirebaseApp>();
export const getFirebaseClientApp = () => {
  if (!isFirebaseConfigured) throw new Error('The blog runtime has no complete sign-in configuration.');
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig!);
  if (runtimeConfig?.emulators && !emulatorApps.has(app)) {
    const emulators = runtimeConfig.emulators;
    if (!firebaseConfig!.projectId.startsWith('demo-')
      || new URL(emulators.auth).hostname !== '127.0.0.1'
      || emulators.firestore.host !== '127.0.0.1') {
      throw new Error('Local emulators require a demo project and loopback endpoints.');
    }
    connectAuthEmulator(getAuth(app), emulators.auth);
    connectFirestoreEmulator(getFirestore(app), emulators.firestore.host, emulators.firestore.port);
    emulatorApps.add(app);
  }
  return app;
};

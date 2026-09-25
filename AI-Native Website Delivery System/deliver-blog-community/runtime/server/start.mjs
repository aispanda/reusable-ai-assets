import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createStartupStorageBucket, loadStartupConfig } from './startup-config.mjs';
import { createBlogServer } from './server.mjs';
import { loadBuiltProductionProfile } from './production-profile.mjs';
import { loadSiteProfile } from '../site-profile.mjs';

const config = loadStartupConfig();
if (config.emulators) process.env.METADATA_SERVER_DETECTION = 'none';
const site = config.emulators ? loadSiteProfile()
  : loadBuiltProductionProfile(config.siteOrigin, {environment:config.environment,projectId:config.firebase.projectId,stagingProfilePath:process.env.BLOG_APPROVED_STAGING_PROFILE});
const app = initializeApp({ projectId: config.firebase.projectId, storageBucket: config.firebase.storageBucket });
const server = createBlogServer({
  db: getFirestore(app), auth: getAuth(app),
  bucket: createStartupStorageBucket(config, () => getStorage(app).bucket()),
  siteOrigin: config.siteOrigin, siteName: site.siteName, runtimeConfig: config,
  distRoot: fileURLToPath(new URL('../dist', import.meta.url)),
});
server.listen(Number(process.env.PORT || 8080), config.emulators ? '127.0.0.1' : '0.0.0.0', () => console.log('Blog runtime listening on ' + server.address().port));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => process.exit(0)));

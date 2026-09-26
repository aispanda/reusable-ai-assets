import { defineConfig } from 'astro/config';
import { loadSiteProfile, serializeSiteProfile } from './site-profile.mjs';
const site = loadSiteProfile();
export default defineConfig({
  site: site.siteOrigin,
  output: 'static',
  trailingSlash: 'never',
  vite: { define: { __BLOG_SITE_PROFILE__: serializeSiteProfile(site) } },
});

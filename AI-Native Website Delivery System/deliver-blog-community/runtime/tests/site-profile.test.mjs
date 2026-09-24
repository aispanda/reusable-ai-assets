import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadSiteProfile, validateSiteProfile, serializeSiteProfile } from '../site-profile.mjs';

const profile = { siteName: 'Cedar Review', description: 'Independent community writing', siteOrigin: 'https://cedar.example' };

test('site profile validates plain text and refuses credential-bearing or path-bearing origins', () => {
  assert.deepEqual(validateSiteProfile(profile), profile);
  assert.ok(Object.isFrozen(validateSiteProfile(profile)));
  for (const siteOrigin of ['javascript:alert(1)', 'https://user:password@cedar.example', 'https://@cedar.example', 'https://cedar.example/blog', 'https://cedar.example/./', 'https://cedar.example?key=secret', 'https://cedar.example#fragment', 'C:\\private\\profile.json', 'https:\\cedar.example']) {
    assert.throws(() => validateSiteProfile({ ...profile, siteOrigin }), /siteOrigin/);
  }
  for (const input of [null, [], { ...profile, apiKey: 'not-permitted' }, { ...profile, siteName: '<script>bad</script>' }, { ...profile, description: 'line\nbreak' }, { ...profile, siteName: '' }, { ...profile, siteOrigin: undefined }]) {
    assert.throws(() => validateSiteProfile(input));
  }
  assert.throws(() => loadSiteProfile({ BLOG_SITE_PROFILE: '' }), /BLOG_SITE_PROFILE/);
  assert.equal(loadSiteProfile({}).siteName, 'Sample Journal');
});

test('serialized profile retains quotes and Unicode without executable script delimiters', () => {
  const source = { ...profile, siteName: 'Cedar "Notes" & Review', description: 'One\u2028Two\u2029Three' };
  const serialized = serializeSiteProfile(source);
  assert.equal(serialized.includes('\u2028'), false);
  assert.equal(serialized.includes('\u2029'), false);
  assert.deepEqual(JSON.parse(serialized), source);
});

test('two external fictional brand profiles build without editing installed core', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'blog-profile-build-'));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const astroPackage = fileURLToPath(import.meta.resolve('astro/package.json'));
  const astroMetadata = JSON.parse(readFileSync(astroPackage, 'utf8'));
  const cli = join(dirname(astroPackage), typeof astroMetadata.bin === 'string' ? astroMetadata.bin : astroMetadata.bin.astro);
  const originalDefault = readFileSync(new URL('../site.json', import.meta.url), 'utf8');
  try {
    for (const [index, site] of [profile, { siteName: 'Harbor Journal', description: 'Stories from a fictional harbor', siteOrigin: 'https://harbor.example' }].entries()) {
      const path = join(temporary, `profile-${index}.json`);
      const output = join(temporary, `build-${index}`);
      writeFileSync(path, JSON.stringify(site));
      assert.deepEqual(loadSiteProfile({ BLOG_SITE_PROFILE: path }), site);
      execFileSync(process.execPath, [cli, 'build', '--outDir', output], {
        cwd: root, env: { ...process.env, BLOG_SITE_PROFILE: path }, encoding: 'utf8', stdio: 'pipe', timeout: 60000,
      });
      const html = readFileSync(join(output, 'index.html'), 'utf8');
      assert.ok(html.includes(site.siteName));
      assert.ok(html.includes(site.description));
      assert.ok(!html.includes('Sample Journal'));
      assert.ok(readFileSync(join(output, 'studio/index.html'), 'utf8').includes(site.siteName));
    }
    assert.equal(readFileSync(new URL('../site.json', import.meta.url), 'utf8'), originalDefault);
    const bad = join(temporary, 'invalid.json');
    writeFileSync(bad, '{broken');
    assert.throws(() => loadSiteProfile({ BLOG_SITE_PROFILE: bad }), /could not be read as JSON/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

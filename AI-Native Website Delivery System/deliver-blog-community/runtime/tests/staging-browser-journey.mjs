import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { validateStagingInputs } from './staging-preflight.mjs';

// Hosted verification only. The caller supplies an explicitly designated staging
// fixture and an isolated test session; no users, roles or collections are seeded.
export async function runHostedPublicationJourney({ page, uploadFixture, onEvidence = () => {}, ...input }) {
  const target = validateStagingInputs(input);
  const { origin, projectId, draftId, expectedSlug } = target;
  const evidence = { projectId, origin, draftId, slug: expectedSlug, upload: 'NOT_REQUESTED',
    publicVerification: 'UNPROVEN', cleanup: 'Designated staging draft, media and immutable releases retained; no production changes' };
  const report = patch => { Object.assign(evidence, patch); onEvidence({ ...evidence }); };
  report({ stage: 'runtime-preflight' });
  // Account initialization can write a member profile or claim an invitation.
  // Check the public runtime contract before opening any authenticated page.
  const configuration = await page.request.get(origin + '/api/content/config', { maxRedirects: 0 });
  assert.equal(configuration.status(), 200, 'Staging public configuration must be available');
  const deployed = await configuration.json();
  assert.equal(deployed.environment, 'staging');
  assert.equal(deployed.firebase?.projectId, projectId);
  assert.equal(deployed.siteOrigin, origin);
  assert.equal(deployed.articleSiteOrigin, origin);
  const checkRuntime = async () => {
    const runtime = await page.evaluate(() => ({
      environment: globalThis.__BLOG_RUNTIME_CONFIG__?.environment,
      projectId: globalThis.__BLOG_RUNTIME_CONFIG__?.firebase?.projectId,
    }));
    assert.equal(new URL(page.url()).origin, origin);
    assert.equal(runtime.environment, 'staging');
    assert.equal(runtime.projectId, projectId);
  };
  await page.goto(origin + '/account');
  await expect(page.locator('[data-account-content]')).toBeVisible({ timeout: 30000 });
  await checkRuntime();
  await expect(page.locator('[data-account-role]')).toHaveText(/^(Administrator|Publisher)$/);
  await page.goto(origin + '/my-articles');
  await expect(page.locator('[data-content-library]')).toBeVisible();
  await expect(page.locator('[data-title]')).toBeHidden();
  await page.goto(origin + '/write?draft=' + encodeURIComponent(draftId));
  await expect(page.locator('[data-studio]')).toHaveAttribute('data-studio-ready', 'true');
  await checkRuntime();
  await expect(page.locator('[data-slug]')).toHaveValue(expectedSlug);
  const title = await page.locator('[data-title]').inputValue();
  assert.ok(title.trim(), 'A designated existing staging article is required');
  const editor = page.locator('.tiptap[contenteditable="true"]');
  const imageDescription = 'Disposable staging upload verification';
  const image = editor.locator(`img[alt="${imageDescription}"]`);
  let imageResult = 'NOT_REQUESTED';
  if (uploadFixture) {
    if (!await image.count()) {
      await expect(editor).toBeEditable();
      await editor.click();
      await editor.press('ControlOrMeta+End');
      await page.locator('[aria-label="Insert content"]').click();
      await page.locator('[data-editor-action="image"]:visible').click();
      await page.locator('[data-image-file]').setInputFiles(uploadFixture);
      await page.locator('[data-image-alt]').fill(imageDescription);
      await page.locator('[data-image-caption]').fill('Retained staging test fixture.');
      await page.locator('[data-submit-image]').click();
      await expect(page.locator('[data-image-dialog]')).not.toBeVisible({ timeout: 30000 });
      report({ stage: 'image-uploaded', upload: 'UPLOADED', draftSave: 'UNPROVEN' });
      await expect(image).toHaveCount(1);
      const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/content/drafts/${draftId}/save` && response.request().method() === 'POST');
      await page.locator('[data-save-draft]').click();
      assert.ok((await saved).ok(), 'Uploaded image must save to the cloud draft');
      imageResult = 'UPLOADED';
    } else imageResult = 'REUSED';
    await page.reload();
    await expect(page.locator('[data-studio]')).toHaveAttribute('data-studio-ready', 'true');
    await expect(image).toHaveCount(1);
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    report({ stage: 'draft-reloaded', upload: imageResult, draftSave: 'PASS' });
  }
  await expect(editor.locator('figure[aria-busy="true"]')).toHaveCount(0);
  const expectedText = await editor.evaluate(element => {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('.studio-image-status').forEach(status => status.remove());
    return copy.textContent.trim();
  });
  assert.ok(expectedText, 'The fixture must contain real article text');
  await page.locator('[data-preview]').click();
  await expect(page.locator('[data-preview-dialog]')).toBeVisible();
  await expect(page.frameLocator('[data-preview-frame]').locator('.insight-prose')).toContainText(expectedText);
  await page.locator('[data-close-preview]').click();
  await page.locator('[data-open-publish]').click();
  await expect(page.locator('[data-publish-readiness]')).toHaveText(/^Ready:/);
  const publication = page.waitForResponse(response => new URL(response.url()).pathname === `/api/content/drafts/${draftId}/publish` && response.request().method() === 'POST');
  await page.locator('[data-publish]').click();
  const publicationResponse = await publication;
  assert.ok(publicationResponse.ok(), 'Publication API must succeed');
  const result = await publicationResponse.json();
  assert.match(result.releaseId ?? '', /^[a-zA-Z0-9_-]+$/);
  report({ stage: 'published', releaseId: result.releaseId });
  assert.equal(new URL(result.liveUrl).origin, origin);
  assert.equal(new URL(result.liveUrl).pathname, '/stories/' + expectedSlug);
  await expect(page.locator('[data-publication-receipt]')).toBeVisible();
  await expect(page.locator('[data-publication-release]')).toHaveText(result.releaseId);
  await page.reload();
  await expect(page.locator('[data-studio]')).toHaveAttribute('data-studio-ready', 'true');
  await expect(page.locator('[data-publication-release]')).toHaveText(result.releaseId);
  const anonymous = await page.context().browser().newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const publicPage = await anonymous.newPage();
    assert.equal((await publicPage.goto(result.liveUrl)).status(), 200);
    await expect(publicPage.locator('h1')).toHaveText(title);
    await expect(publicPage.locator('.insight-prose')).toContainText(expectedText);
    if (uploadFixture) {
      const publicImage = publicPage.getByRole('img', { name: imageDescription, exact: true });
      await expect(publicImage).toBeVisible();
      await expect.poll(() => publicImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await publicPage.setViewportSize({ width: 390, height: 844 });
    assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Public article must fit a mobile viewport');
  } finally { await anonymous.close(); }
  report({ stage: 'complete', upload: imageResult, publicVerification: 'PASS' });
  return { ...evidence };
}

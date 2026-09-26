// Integrated host browser test. Never uses an owner's browser or a live Firebase project.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as client from 'firebase/app';
import * as clientAuth from 'firebase/auth';
import { canonicalContentFields, createContentDocument } from '../server/studio-content-document.mjs';

export async function runEditorialBrowserJourney({ origin, packageSha256, artifactDirectory, hostArticles = [] }) {
  assert.match(origin, /^http:\/\/127\.0\.0\.1:[0-9]+$/);
  assert.match(packageSha256, /^[a-f0-9]{64}$/);
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
  assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS, 'No live credential files in emulator verification');
  process.env.METADATA_SERVER_DETECTION = 'none';
  const projectId = 'demo-blog-community', fixture = 'adoption-' + randomUUID();
  const app = initializeApp({ projectId }, fixture), auth = getAuth(app), db = getFirestore(app);
  const users = [], contexts = [], clients = [], errors = [], checks = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const actor = async role => {
      const uid = fixture + '-' + role, email = uid + '@example.test', password = randomUUID();
      await auth.createUser({ uid, email, password, emailVerified: true }); users.push(uid);
      await db.collection('studioAccess').doc(uid).set({ active: true, role, email });
      const ca = client.initializeApp({ apiKey: 'demo-key', projectId, authDomain: projectId + '.firebaseapp.com' }, uid); clients.push(ca);
      const a = clientAuth.getAuth(ca); clientAuth.connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
      const login = await clientAuth.signInWithEmailAndPassword(a, email, password);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
      await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      await context.addInitScript(({ user, origin }) => {
        if (location.origin === origin && window === window.top && !localStorage.getItem('firebase:authUser:demo-key:[DEFAULT]')) {
          localStorage.setItem('firebase:authUser:demo-key:[DEFAULT]', JSON.stringify(user));
        }
      }, { user: login.user.toJSON(), origin });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/my-articles');
      await expect(page.locator('[data-profile-submit]')).toBeVisible();
      await page.locator('[data-profile-submit]').click();
      await expect(page.locator('[data-content-library]')).toBeVisible();
      return { page, uid };
    };
    const admin = await actor('administrator');
    await admin.page.goto(origin + '/account');
    await expect(admin.page.locator('[data-account-content]')).toBeVisible();
    await expect(admin.page).toHaveURL(origin + '/account');
    await admin.page.getByRole('link', { name: 'My articles', exact: true }).click();
    await expect(admin.page.locator('[data-content-library]')).toBeVisible();
    await expect(admin.page.locator('[data-title]')).toBeHidden();
    await admin.page.goto(origin + '/studio');
    await expect(admin.page.locator('[data-content-library]')).toBeVisible();
    await expect(admin.page.locator('[data-title]')).toBeHidden();
    checks.push('Restored account stays on settings; My articles and bare studio open the list, never an editor');
    const scope = admin.page.locator('[data-library-scope]');
    const library = admin.page.locator('[data-library-list]');
    const collectionFilter = admin.page.locator('[data-article-collection-filter]');
    const publishedRow = title => library.locator('.studio-library-row').filter({
      has: admin.page.getByRole('link', { name: `Read ${title}`, exact: true }),
    });
    const expectReadOnly = async (title, path) => {
      const row = publishedRow(title);
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('link', { name: `Read ${title}`, exact: true })).toHaveAttribute('href', path);
      await expect(row.getByRole('link', { name: `View ${title}`, exact: true })).toHaveAttribute('href', path);
      await expect(row.locator('a[href^="/write"], .studio-row-menu, button')).toHaveCount(0);
    };
    await expect(scope).toBeVisible();
    await expect(scope).toHaveValue('site');
    await expect(admin.page.locator('[data-library-title]')).toHaveText('All site articles');
    for (const article of hostArticles) {
      await expectReadOnly(article.title, article.path);
      await collectionFilter.selectOption(article.collectionIds[0]);
      await expectReadOnly(article.title, article.path);
      for (const other of hostArticles.filter(row => !row.collectionIds.includes(article.collectionIds[0]))) {
        await expect(publishedRow(other.title)).toHaveCount(0);
      }
      await collectionFilter.selectOption('');
    }
    await scope.selectOption('mine');
    await expect(admin.page.locator('[data-library-title]')).toHaveText('My articles');
    await expect(library.locator('.studio-library-row')).toHaveCount(0);
    await scope.selectOption('site');
    for (const article of hostArticles) await expectReadOnly(article.title, article.path);
    checks.push('Administrator defaults to All site articles; own scope stays separate and configured host pages have canonical, read-only links and correct collection filters');
    await admin.page.getByRole('link', { name: 'Manage collections', exact: true }).click();
    await expect(admin.page.getByRole('heading', { name: 'Collections', exact: true })).toBeVisible();
    await admin.page.locator('[data-new-collection]').click();
    const form = admin.page.locator('[data-collection-form]');
    await form.locator('[name="title"]').fill('Disposable adoption collection');
    await form.locator('[name="subtitle"]').fill('Isolated browser fixture.');
    await form.locator('[name="description"]').fill('A disposable collection for cross-site workflow verification.');
    await form.locator('[name="id"]').fill(fixture);
    await form.locator('[name="type"]').selectOption('theme');
    await form.locator('[data-save-collection]').click();
    await expect(admin.page.locator(`[data-collection-row="${fixture}"]`)).toBeVisible();
    if (artifactDirectory) {
      await mkdir(artifactDirectory, { recursive: true });
      await admin.page.screenshot({ path: resolve(artifactDirectory, 'collections-desktop.png'), fullPage: true });
    }
    checks.push('Administrator creates a collection through the same dashboard UI');
    await admin.page.locator('.studio-nav').getByRole('link', { name: 'Manage users', exact: true }).click();
    await expect(admin.page.getByRole('heading', { name: 'Manage users', exact: true })).toBeVisible();
    await expect(admin.page.locator('#users-invite-role option')).toHaveText(['Author', 'Publisher', 'Administrator']);
    await admin.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await admin.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Manage users mobile overflow');
    if (artifactDirectory) await admin.page.screenshot({ path: resolve(artifactDirectory, 'users-mobile.png'), fullPage: true });
    checks.push('User invitations are discoverable and mobile users page fits');
    const author = await actor('author');
    await expect(author.page.getByRole('link', { name: 'Manage users', exact: true })).toHaveCount(0);
    await expect(author.page.locator('[data-library-scope]')).toBeHidden();
    for (const article of hostArticles) await expect(author.page.locator('[data-library-list]')).not.toContainText(article.title);
    await author.page.locator('[data-new-article]').first().click();
    await expect(author.page.locator('[data-studio]')).toHaveAttribute('data-studio-ready', 'true');
    await expect(author.page.locator('[data-editor-workspace]')).not.toHaveAttribute('inert', '');
    await expect(author.page.locator('[data-title]')).toBeVisible();
    await author.page.locator('[data-title]').fill('Reusable browser journey');
    await author.page.locator('[data-slug]').fill(fixture);
    await author.page.locator('[data-excerpt]').fill('An isolated article used to verify the author experience.');
    await author.page.getByRole('radio', { name: 'Disposable adoption collection', exact: true }).check();
    await author.page.locator('.tiptap[contenteditable="true"]').fill('A reader asks a careful question. This disposable article verifies the shared authoring interface.');
    await expect(author.page.locator('[data-title]')).toHaveValue('Reusable browser journey');
    await expect(author.page.locator('[data-open-publish]')).toBeHidden();
    for (const layout of ['classic-reading', 'visual-journey', 'study-reflection']) {
      await author.page.locator(`[data-layout-option][value="${layout}"]`).check();
      await author.page.locator('[data-preview]').click();
      await expect(author.page.locator('[data-preview-dialog]')).toBeVisible();
      const preview = author.page.frameLocator('[data-preview-frame]');
      await expect(preview.locator('article[data-article-layout]')).toHaveAttribute('data-article-layout', layout);
      await expect(preview.locator('.insight-prose')).toContainText('A reader asks a careful question.');
      await author.page.locator('[data-device="mobile"]').click();
      const frame = author.page.frames().find(f => f.parentFrame() === author.page.mainFrame());
      assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), layout + ' mobile overflow');
      await author.page.locator('[data-close-preview]').click();
    }
    await author.page.reload();
    await expect(author.page.locator('[data-layout-option][value="study-reflection"]')).toBeChecked();
    await author.page.locator('[data-submit-review]').click();
    await expect(author.page.locator('[data-withdraw-review]')).toBeVisible();
    checks.push('Author persists three layouts, mobile preview and explicit submission; cannot publish');
    await admin.page.setViewportSize({ width: 1440, height: 1000 });
    await admin.page.goto(origin + '/review');
    await expect(admin.page.locator('[data-content-library]')).toContainText('Reusable browser journey');
    assert.equal((await fetch(origin + '/stories/' + fixture)).status, 404, 'Submitted draft must remain private');
    await admin.page.locator('[data-library-list]').getByRole('link', { name: 'Edit Reusable browser journey', exact: true }).click();
    await expect(admin.page.locator('[data-studio]')).toHaveAttribute('data-studio-ready', 'true');
    await expect(admin.page.locator('[data-title]')).toBeDisabled();
    await admin.page.locator('[data-preview]').click();
    await expect(admin.page.locator('[data-preview-dialog]')).toBeVisible();
    await admin.page.locator('[data-close-preview]').click();
    await admin.page.locator('[data-open-publish]').click();
    await expect(admin.page.locator('[data-publish-readiness]')).toContainText('Ready');
    await admin.page.locator('[data-publish]').click();
    await expect(admin.page.locator('[data-publication-receipt]')).toBeVisible();
    const publicPage = await fetch(origin + '/stories/' + fixture);
    assert.equal(publicPage.status, 200);
    const html = await publicPage.text();
    assert.ok(html.includes('Reusable browser journey') && html.includes('A reader asks a careful question.'));
    assert.ok(html.includes('data-article-layout="study-reflection"'));
    checks.push('Administrator reviews without editing and publishes the submitted revision; anonymous page contains exact title, prose and layout');
    // Change only this emulator author's working revision. The live snapshot
    // must continue to supply the administrator's public title and collection.
    const articleDraftId = new URL(author.page.url()).searchParams.get('draft');
    assert.ok(articleDraftId, 'The disposable author editor must identify its draft');
    const privateTitle = 'Private working title ' + fixture;
    const privateBody = 'Unsubmitted private refinement ' + fixture;
    const refined = createContentDocument({ type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'text', text: privateBody },
    ] }] }, 'study-reflection');
    const draftRef = db.collection('contentDrafts').doc(articleDraftId);
    const publishedDraft = (await draftRef.get()).data();
    assert.equal(publishedDraft.ownerUid, author.uid);
    await draftRef.update({
      ...canonicalContentFields(refined), title: privateTitle, excerpt: privateBody,
      tags: 'Private working classification', publicationStatus: 'published-with-changes', reviewStatus: 'draft',
      revision: publishedDraft.revision + 1, updatedAt: new Date(Date.now() + 1000).toISOString(),
    });
    await admin.page.goto(origin + '/my-articles');
    await expect(scope).toHaveValue('site');
    await expectReadOnly('Reusable browser journey', '/stories/' + fixture);
    await expect(library).not.toContainText(privateTitle);
    await expect(library).not.toContainText(privateBody);
    await collectionFilter.selectOption(fixture);
    await expectReadOnly('Reusable browser journey', '/stories/' + fixture);
    await collectionFilter.selectOption('__unassigned__');
    await expect(publishedRow('Reusable browser journey')).toHaveCount(0);
    await collectionFilter.selectOption('');
    await scope.selectOption('mine');
    await expect(library.locator('.studio-library-row')).toHaveCount(0);
    await scope.selectOption('site');
    await author.page.goto(origin + '/my-articles');
    await expect(author.page.locator('[data-library-scope]')).toBeHidden();
    await expect(author.page.locator('[data-library-list]')).toContainText(privateTitle);
    await author.page.locator('[data-article-collection-filter]').selectOption('__unassigned__');
    await expect(author.page.locator('[data-library-list]')).toContainText(privateTitle);
    assert.equal(await (await fetch(origin + '/stories/' + fixture)).text(), html, 'Private working changes leave the live snapshot unchanged');
    checks.push('Administrator sees another author’s published metadata, never private refinements; live collection assignment stays stable while the author retains their own unassigned working revision');
    // Emulate frozen HTML from an earlier host release, without rewriting any
    // stored publication. Exercise the real host asset route and module graph.
    const commentsEntry = html.match(/src="(\/_astro\/Comments\.[^"]+\.js)"/)?.[1];
    assert.ok(commentsEntry, 'Published page must include the comments entry');
    const retiredEntry = commentsEntry.replace(/\.[A-Za-z0-9_-]{8,32}\.js$/, '.retired1.js');
    assert.notEqual(retiredEntry, commentsEntry);
    const compatibility = await fetch(origin + retiredEntry);
    assert.equal(compatibility.status, 200, 'Historical comments bundle remains reachable through host mount');
    assert.match(compatibility.headers.get('content-type'), /text\/javascript/);
    assert.equal(compatibility.headers.get('cache-control'), 'no-cache');
    const legacyHtml = html.replace(commentsEntry, retiredEntry)
      .replaceAll('__BLOG_RUNTIME_CONFIG__', '__LEGACY_SITE_CONFIG__')
      .replace(/<p[^>]*data-comments-auth-state[^>]*>[^<]*<\/p>/, '')
      .replace(/(data-comments-signed-out) hidden/, '$1');
    const historicalUrl = origin + '/stories/' + fixture;
    const serveLegacy = route => route.fulfill({ status: 200, contentType: 'text/html', body: legacyHtml });
    // Fulfilled legacy HTML has no network address classification. Permit only
    // this isolated test origin to reach the explicitly configured emulators.
    await admin.page.context().grantPermissions(['local-network-access'], { origin });
    const commentFailures = [];
    admin.page.on('requestfailed', request => commentFailures.push({ url: request.url().split('?')[0], error: request.failure()?.errorText }));
    admin.page.on('console', message => { if (['error', 'warning'].includes(message.type())) commentFailures.push(message.text()); });
    await admin.page.route(historicalUrl, serveLegacy);
    await admin.page.goto(historicalUrl);
    try { await expect(admin.page.locator('[data-comments-composer]')).toBeVisible(); }
    catch (error) { throw new Error('Historical comments: ' + await admin.page.locator('[data-comments]').innerText() + '\n' + JSON.stringify(commentFailures), { cause: error }); }
    await expect(admin.page.locator('[data-comments-signed-out]')).toBeHidden();
    await expect(admin.page.locator('[data-comments-count]')).toHaveText('0 comments');
    const anonymousContext = await browser.newContext(); contexts.push(anonymousContext);
    await anonymousContext.grantPermissions(['local-network-access'], { origin });
    await anonymousContext.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const anonymousPage = await anonymousContext.newPage();
    anonymousPage.on('pageerror', error => errors.push(error.message));
    await anonymousPage.route(historicalUrl, serveLegacy);
    await anonymousPage.goto(historicalUrl);
    await expect(anonymousPage.locator('[data-comments-signed-out]')).toBeVisible();
    await expect(anonymousPage.locator('[data-comments-composer]')).toBeHidden();
    await expect(anonymousPage.locator('[data-comments-count]')).toHaveText('0 comments');
    assert.equal(await (await fetch(historicalUrl)).text(), html, 'Serving retired scripts does not mutate the frozen publication');
    checks.push('Historical comments script resolves with no-cache; restored account can compose without sign-in, anonymous reader cannot, frozen HTML stays unchanged');
    // Seed the already-tested offline state only for this disposable fixture.
    // This proves library scope, not the unpublish endpoint or lifecycle itself.
    const publicationIndex = db.collection('contentPublicationIndex').doc(articleDraftId);
    const lastPublication = (await publicationIndex.get()).data();
    assert.ok(lastPublication.releaseId, 'Offline administration needs the retained release');
    const offline = db.batch();
    offline.update(draftRef, { publicationStatus: 'unpublished', updatedAt: new Date(Date.now() + 2000).toISOString() });
    offline.update(publicationIndex, { state: 'unpublished', releaseId: lastPublication.releaseId });
    offline.delete(db.collection('publishedContent').doc(fixture));
    await offline.commit();
    await admin.page.goto(origin + '/my-articles');
    await expect(admin.page.locator('[data-content-library]')).toBeVisible();
    await expect(scope).toHaveValue('site');
    await admin.page.locator('[data-filter="unpublished"]').first().click();
    const offlineRow = library.locator('.studio-library-row').filter({
      has: admin.page.getByRole('heading', { name: 'Reusable browser journey', exact: true }),
    });
    await expect(offlineRow).toHaveCount(1);
    await expect(library).not.toContainText(privateTitle);
    await expect(library).not.toContainText(privateBody);
    await expect(offlineRow.locator('a[href^="/write"]')).toHaveCount(0);
    await offlineRow.locator('.studio-row-menu summary').click();
    await expect(offlineRow.getByRole('button', { name: 'Move unpublished article to trash', exact: true })).toBeVisible();
    await offlineRow.locator('.studio-row-menu summary').click();
    await scope.selectOption('mine');
    await expect(library.locator('.studio-library-row')).toHaveCount(0);
    await expect(admin.page.locator('[data-unpublished-count]')).toHaveText('0');
    await scope.selectOption('site');
    await expect(offlineRow).toHaveCount(1);
    checks.push('Offline administrator actions use last-public metadata in All site articles; My articles excludes another author’s retained article and its count');
    assert.deepEqual(errors, []);
    return { packageSha256, checks, authentication: 'Emulator session; production Google OAuth remains a separate hosted check' };
  } finally {
    for (const context of contexts) await context.close();
    await browser?.close();
    for (const ca of clients) { await clientAuth.signOut(clientAuth.getAuth(ca)); await client.deleteApp(ca); }
    // Emulator project is disposable. Delete only this fixture's records.
    for (const uid of users) {
      const drafts = await db.collection('contentDrafts').where('ownerUid', '==', uid).get();
      for (const draft of drafts.docs) {
        for (const release of (await db.collection('contentReleases').where('draftId', '==', draft.id).get()).docs) {
          for (const key of ['sourcePayloadId', 'bodyPayloadId', 'pagePayloadId']) {
            const payloadId = release.data()[key];
            if (payloadId) await db.collection('contentReleasePayloads').doc(payloadId).delete();
          }
        }
        for (const collection of ['contentPreviewReceipts', 'contentAuditEvents', 'publishedContent', 'contentReleases', 'contentPublicationIndex', 'contentPublicationRequests']) {
          for (const item of (await db.collection(collection).where('draftId', '==', draft.id).get()).docs) await item.ref.delete();
        }
        await draft.ref.delete();
      }
      for (const collection of ['studioAccess', 'userProfiles']) await db.collection(collection).doc(uid).delete();
      await auth.deleteUser(uid);
    }
    const registry = db.collection('contentCollections').doc('registry');
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(registry);
      if (!snapshot.exists) return;
      const data = snapshot.data();
      transaction.update(registry, { collections: data.collections.filter(row => row.id !== fixture), revision: data.revision + 1 });
    });
    for (const item of (await db.collection('contentAuditEvents').where('collectionId', '==', fixture).get()).docs) await item.ref.delete();
    await db.terminate(); await deleteApp(app);
  }
}

import { getAuth } from 'firebase/auth';
import { getFirebaseClientApp } from './firebase-client';
import { type StudioBackend, type StudioDraftRecord } from './studio-firebase';
import { initializeUsersUI } from './studio-users';

const node = (tag: string, text: string) => { const result = document.createElement(tag); result.textContent = text; return result; };
export const editorialRequest = async (path: string, body?: Record<string, unknown>) => {
  const user = getAuth(getFirebaseClientApp()).currentUser;
  if (!user) throw new Error('Sign in again to continue.');
  const response = await fetch(`/api/content/editorial/${path}`, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'This action could not be completed. Reload and try again.');
  return result;
};

export function initializeEditorialUI({ backend, draftId, stored, readOnly, save, getUpdatedAt }: { backend: StudioBackend; draftId: string; stored?: StudioDraftRecord; readOnly: boolean; save: () => Promise<boolean>; getUpdatedAt: () => string }) {
  // An Administrator uses the same review route and controls as a Publisher.
  const publisher = ['administrator', 'publisher'].includes(backend.role);
  const owner = !stored || stored.ownerUid === backend.uid;
  const submitted = stored?.reviewStatus === 'submitted';
  const sidebar = document.querySelector('.studio-nav');
  const navigation = document.createDocumentFragment();
  for (const [title, href, allowed] of [['Home', '/', true], [backend.role === 'administrator' ? 'Articles' : 'My articles', '/my-articles', true], ['Review submissions', '/review', publisher], ['Manage collections', '/manage/collections', backend.role === 'administrator'], ['Manage users', '/manage/users', backend.role === 'administrator'], ['Explore collections', '/topics', true]] as const) {
    if (!allowed) continue;
    const link = document.createElement('a'); link.href = href; link.textContent = title; link.style.cssText = 'display:block;padding:12px;color:inherit;text-decoration:none';
    if (window.location.pathname === href) link.setAttribute('aria-current', 'page');
    navigation.append(link);
    document.querySelector('.studio-mobile-nav nav')?.append(link.cloneNode(true));
  }
  sidebar?.prepend(navigation);
  if (backend.role === 'author') document.querySelectorAll<HTMLElement>('[data-filter="archived"]').forEach(item => { item.hidden = true; });
  const banner = node('p', submitted ? (owner ? 'Submitted for review. This revision is locked until it is returned or you withdraw it.' : 'Submitted for your review. Read this exact revision, then publish it or return it with feedback. Only the author can change the content.') : stored?.reviewStatus === 'returned' ? `Returned for changes: ${String(stored.reviewFeedback || stored.feedback || 'See the review feedback below.')}` : 'Your saved draft is private. Submit it when it is ready for a Publisher to review.');
  banner.setAttribute('role', 'status'); banner.style.cssText = 'padding:16px;margin:0;background:#f1f4ec;border-bottom:1px solid #d6ddce;white-space:pre-wrap';
  banner.dataset.editorialStatus = '';
  if (draftId) document.querySelector('.studio-topbar')?.after(banner);
  if (draftId && Array.isArray(stored?.reviewHistory) && stored.reviewHistory.length) {
    const details = document.createElement('details'); details.style.cssText = 'padding:12px 20px;background:#fffaf0'; details.append(node('summary', 'Review history and feedback'));
    for (const entry of stored.reviewHistory) {
      if (entry && typeof entry === 'object') details.append(node('p', [entry.action, Number.isInteger(entry.revision) ? `Revision ${entry.revision}` : '', entry.occurredAt || entry.at || entry.createdAt, entry.feedback].filter(Boolean).join(' · ')));
    }
    banner.after(details);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-open-publish], [data-publish]').forEach(button => { button.hidden = !publisher || (!owner && !submitted); });
  const transition = async (action: 'submit' | 'withdraw' | 'return', button: HTMLButtonElement) => {
    let feedback = '';
    if (action === 'return') {
      const response = window.prompt('Explain what the author should improve before resubmitting.');
      if (response === null) return;
      feedback = response.trim();
      if (!feedback) { banner.textContent = 'Feedback is required when returning an article.'; return; }
    }
    button.disabled = true;
    try {
      if (!readOnly && !await save()) throw new Error('Save the article successfully before submitting.');
      await editorialRequest('review', { draftId, action, expectedUpdatedAt: getUpdatedAt(), feedback });
      if (action === 'return') window.location.assign('/review');
      else window.location.reload();
    } catch (error) { banner.textContent = error instanceof Error ? error.message : 'Review action failed.'; button.disabled = false; }
  };
  for (const [selector, action, allowed] of [['[data-submit-review]', 'submit', owner && !submitted], ['[data-withdraw-review]', 'withdraw', owner && submitted], ['[data-return-review]', 'return', publisher && !owner && submitted]] as const) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) { button.hidden = !draftId || !allowed; button.addEventListener('click', () => void transition(action, button)); }
  }
  if (window.location.pathname === '/review') {
    const title = document.querySelector('[data-library-title]'); if (title) title.textContent = 'Submitted for review';
    const summary = document.querySelector('[data-library-summary]'); if (summary) summary.textContent = 'Only explicitly submitted revisions appear here. Review or return them without changing the author’s work.';
  }
  if (publisher) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'studio-button studio-button-secondary'; button.textContent = 'Create a linked article';
    button.addEventListener('click', async () => {
      const value = window.prompt('Enter the published original’s article slug or URL on this site.'); if (!value) return;
      let slug = value.trim();
      try { if (slug.includes('://')) { const url = new URL(slug); if (url.origin !== window.location.origin) throw new Error('Choose an article on this site.'); slug = url.pathname.replace(/^\/stories\//, '').replace(/\/$/, ''); } }
      catch (error) { window.alert(String(error)); return; }
      button.disabled = true;
      try { const result = await editorialRequest('derive', { slug, newDraftId: crypto.randomUUID() }); window.location.assign(`/write?draft=${encodeURIComponent(result.draftId)}`); }
      catch (error) { window.alert(error instanceof Error ? error.message : 'The linked article could not be created.'); button.disabled = false; }
    });
    document.querySelector('.studio-sidebar')?.append(button);
  }
  if (backend.role === 'administrator') {
    const link = document.createElement('a'); link.href = '/manage/users'; link.textContent = 'Manage users';
    document.querySelector('.studio-account')?.append(link);
  }
  initializeUsersUI(backend);
}

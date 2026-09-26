import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  countryCodeValues,
  populateCountryOptions,
  primaryInterestValues,
  professionalRoleValues,
  type MemberProfileChoices,
} from '../data/member-profile';
import { getFirebaseClientApp, googleClientId, isFirebaseConfigured } from './firebase-client';
import {
  STUDIO_CONTENT_FORMAT,
  studioContentVersion,
} from './studio-tiptap-schema.mjs';

export type StudioDraftRecord = Record<string, unknown> & { updatedAt?: string; archivedAt?: string };
export type PublicationPreview = {
  mode: 'preview';
  receiptId: string;
  snapshotSha256: string;
  renderedPageSha256: string;
  html: string;
  previewHtml: string;
  article: {
    title: string;
    slug: string;
    sourceUpdatedAt: string;
    sourceRevision: number;
    contentSha256: string;
  };
};
export type StudioImageAsset = {
  assetId: string;
  url: string;
  alt: string;
  decorative: boolean;
  caption: string;
  credit?: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
};
export type StudioRole = 'administrator' | 'publisher' | 'author' | 'commenter' | 'viewer';
export type EditorialRole = Extract<StudioRole, 'administrator' | 'publisher' | 'author'>;
export type RoleRequest = {
  uid: string;
  email: string;
  currentRole: 'commenter' | 'viewer' | 'author';
  feedback?: string;
  requestedRole: EditorialRole;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
  lastCancelledAt?: string;
};

export type StudioBackend = {
  mode: 'cloud';
  uid: string;
  role: StudioRole;
  accountEmail?: string;
  listDrafts: () => Promise<Record<string, StudioDraftRecord>>;
  listPublishedArticles: () => Promise<import('./studio-library-operations.mjs').PublicArticleSummary[]>;
  saveDraft: (id: string, draft: StudioDraftRecord, expectedUpdatedAt?: string, checkpoint?: boolean) => Promise<{
    updatedAt: string;
    revision: number;
    contentSha256: string;
  }>;
  migrateDraft: (id: string, expectedUpdatedAt: string, expectedRevision: number, expectedSourceSha256: string) => Promise<{
    updatedAt: string;
    revision: number;
    contentSha256: string;
  }>;
  archiveDraft: (id: string, expectedUpdatedAt: string) => Promise<{ archivedAt: string }>;
  restoreDraft: (id: string, expectedUpdatedAt: string) => Promise<{ restoredAt: string; updatedAt: string }>;
  previewDraft: (id: string) => Promise<PublicationPreview>;
  previewDocument: (id: string) => Promise<PublicationPreview>;
  publishDraft: (id: string, expectedUpdatedAt: string, idempotencyKey: string, previewReceiptId: string) => Promise<{
    releaseId: string;
    liveUrl: string;
    slug: string;
    updatedAt: string;
    revision: number;
    contentSha256: string;
    snapshotSha256: string;
    renderedPageSha256: string;
  }>;
  unpublishDraft: (id: string, expectedUpdatedAt: string) => Promise<{ slug: string; updatedAt: string }>;
  uploadImage: (id: string, file: File, description: { alt: string; decorative: boolean; caption: string; credit?: string }, signal?: AbortSignal) => Promise<StudioImageAsset>;
  loadImage: (assetId: string) => Promise<Blob>;
  listRoleRequests: () => Promise<RoleRequest[]>;
  reviewRoleRequest: (request: RoleRequest, decision: 'approved' | 'denied') => Promise<void>;
};

const isConfigured = isFirebaseConfigured;
export const accessRequest = async (user: User, body: Record<string, unknown>) => {
  const response = await fetch('/api/content/access', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Account access could not be updated.');
  return payload;
};

const find = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

const revealAccessGate = () => {
  const gate = find<HTMLElement>('[data-access-gate]');
  if (!gate) return;
  gate.hidden = false;
  gate.removeAttribute('data-access-pending');
  gate.setAttribute('aria-busy', 'false');
};

const unlockStudio = (backend: StudioBackend) => {
  const gate = find<HTMLElement>('[data-access-gate]');
  const studio = find<HTMLElement>('[data-studio]');
  const account = find<HTMLElement>('[data-studio-account]');
  const accountEmail = find<HTMLElement>('[data-studio-account-email]');
  const accountRole = find<HTMLElement>('[data-studio-account-role]');
  if (gate) {
    gate.hidden = true;
    gate.removeAttribute('data-access-pending');
    gate.setAttribute('aria-busy', 'false');
  }
  if (studio) studio.hidden = false;
  if (account && accountEmail) {
    accountEmail.textContent = backend.accountEmail ?? 'Authorized author';
    if (accountRole) accountRole.textContent = backend.role;
    account.hidden = false;
  }
};

const showAccessState = (title: string, message: string) => {
  revealAccessGate();
  const accessTitle = find<HTMLElement>('[data-access-title]');
  const accessMessage = find<HTMLElement>('[data-access-message]');
  if (accessTitle) accessTitle.textContent = title;
  if (accessMessage) accessMessage.textContent = message;
};

const signInErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
  switch (code) {
    case 'auth/popup-blocked':
      return 'This browser blocked the Google sign-in window. Allow pop-ups for this site, or open My articles in a normal browser tab instead of an embedded or in-app browser.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google sign-in window closed before sign-in finished. Select Continue with Google to try again.';
    case 'auth/unauthorized-domain':
      return 'This address is not an authorized domain for the Firebase project. Add it under Firebase Authentication settings, then try again.';
    case 'auth/network-request-failed':
      return 'The connection to Google failed. Check the network and try again.';
    default:
      return error instanceof Error ? error.message : 'Google sign-in did not complete.';
  }
};

const authorizedSessionKey = 'blog-studio-authorized-session-v1';
const memberSessionKey = 'blog-member-session-v1';
const profileSessionKey = 'blog-profile-complete-session-v1';

const clearAuthorizedSession = () => window.localStorage.removeItem(authorizedSessionKey);
const clearMemberSession = () => {
  window.localStorage.removeItem(memberSessionKey);
  window.localStorage.removeItem(profileSessionKey);
};

const profileSessionIsCurrent = (user: User) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(profileSessionKey) ?? 'null');
    return value?.uid === user.uid && typeof value.expiresAt === 'number' && value.expiresAt > Date.now();
  } catch {
    return false;
  }
};

const rememberProfileSession = (user: User) => {
  window.localStorage.setItem(profileSessionKey, JSON.stringify({ uid: user.uid, expiresAt: Date.now() + 60 * 60 * 1000 }));
};

const rememberMemberSession = (user: User, role: StudioRole) => {
  window.localStorage.setItem(memberSessionKey, JSON.stringify({
    uid: user.uid,
    role,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }));
};

const rememberAuthorizedSession = (user: User, role: EditorialRole) => {
  rememberMemberSession(user, role);
  window.localStorage.setItem(authorizedSessionKey, JSON.stringify({
    uid: user.uid,
    role,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }));
};

const requestProfileChoices = (user: User): Promise<MemberProfileChoices> => {
  const form = find<HTMLFormElement>('[data-profile-form]');
  const email = find<HTMLElement>('[data-profile-email]');
  const professionalRole = find<HTMLSelectElement>('[data-profile-professional-role]');
  const primaryInterest = find<HTMLSelectElement>('[data-profile-primary-interest]');
  const country = find<HTMLSelectElement>('[data-profile-country]');
  const submit = find<HTMLButtonElement>('[data-profile-submit]');
  const status = find<HTMLElement>('[data-profile-status]');
  const googleButton = find<HTMLButtonElement>('[data-google-signin]');
  if (!form || !professionalRole || !primaryInterest || !country || !submit || !status) {
    return Promise.reject(new Error('The profile form is unavailable.'));
  }

  populateCountryOptions(country);
  if (email) email.textContent = user.email ?? '';
  if (googleButton) googleButton.hidden = true;
  showAccessState('Complete your profile', 'Three quick, optional choices help us understand the community.');
  form.hidden = false;

  return new Promise((resolve) => {
    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      const professionalRoleValue = professionalRole.value;
      const primaryInterestValue = primaryInterest.value;
      const countryCode = country.value;
      if (
        !professionalRoleValues.has(professionalRoleValue)
        || !primaryInterestValues.has(primaryInterestValue)
        || (countryCode !== '' && !countryCodeValues.has(countryCode))
      ) {
        status.textContent = 'Choose a listed option for each field.';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Saving…';
      status.textContent = '';
      form.removeEventListener('submit', handleSubmit);
      form.hidden = true;
      resolve({
        professionalRole: professionalRoleValue,
        primaryInterest: primaryInterestValue,
        countryCode,
        profileCompletedAt: new Date().toISOString(),
      });
    };
    form.addEventListener('submit', handleSubmit);
  });
};

const recordAuthorizedProfile = async (user: User) => {
  const db = getFirestore();
  const profileRef = doc(db, 'userProfiles', user.uid);
  const existing = await getDoc(profileRef);
  const existingData = existing.exists() ? existing.data() : undefined;
  const now = new Date().toISOString();
  const hasCompletedProfile = existingData
    && typeof existingData.profileCompletedAt === 'string'
    && professionalRoleValues.has(existingData.professionalRole)
    && primaryInterestValues.has(existingData.primaryInterest)
    && (existingData.countryCode === '' || countryCodeValues.has(existingData.countryCode));
  const choices: MemberProfileChoices = hasCompletedProfile
    ? {
        professionalRole: existingData.professionalRole,
        primaryInterest: existingData.primaryInterest,
        countryCode: existingData.countryCode,
        profileCompletedAt: existingData.profileCompletedAt,
      }
    : await requestProfileChoices(user);
  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? '',
    providerIds: user.providerData.map((provider) => provider.providerId),
    ...choices,
    firstSeenAt: existingData?.firstSeenAt ?? now,
    lastSeenAt: now,
    privacyNoticeVersion: '2026-08-16',
  });
  rememberProfileSession(user);
};

const createCloudBackend = (user: User, role: EditorialRole) => {
  const db = getFirestore();
  type DraftVersion = {
    format: 'legacy' | 'tiptap-json';
    updatedAt: string;
    revision: number;
    contentSha256?: string;
    sourceSha256?: string;
    legacyDraft?: StudioDraftRecord;
  };
  const draftVersions = new Map<string, DraftVersion>();
  const sha256 = async (value: string) => {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const contentDocument = (content: unknown, layout?: unknown) => ({
    format: STUDIO_CONTENT_FORMAT,
    ...studioContentVersion(content, layout),
    ...(layout === undefined ? {} : { layout }),
    content,
  });
  const canonicalDraftPayload = (draft: StudioDraftRecord) => ({
    title: String(draft.title ?? '').trim(),
    excerpt: String(draft.excerpt ?? '').trim(),
    slug: String(draft.slug ?? ''),
    tags: String(draft.tags ?? '').trim(),
    ...contentDocument(draft.content, draft.layout),
  });
  const publicationRevision = (id: string) => {
    const current = draftVersions.get(id);
    if (!current || current.format !== 'tiptap-json' || !current.contentSha256) {
      throw new Error('Save or convert this article before previewing it.');
    }
    return {
      expectedUpdatedAt: current.updatedAt,
      expectedRevision: current.revision,
      expectedContentSha256: current.contentSha256,
    };
  };
  const contentRequest = async <T>(
    id: string,
    action: 'save' | 'migrate' | 'publish' | 'unpublish' | 'preview' | 'archive' | 'restore',
    body: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(`/api/content/drafts/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; position?: number } & T;
    if (!response.ok) {
      const location = Number.isInteger(payload.position) && Number(payload.position) >= 0
        ? ` (near character ${Number(payload.position) + 1})`
        : '';
      throw new Error(`${payload.error ?? 'The publication request failed.'}${location}`);
    }
    return payload;
  };
  const previewDocumentRequest = async (id: string) => {
    const response = await fetch(`/api/content/drafts/${encodeURIComponent(id)}/preview-document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publicationRevision(id)),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string } & PublicationPreview;
    if (!response.ok) {
      throw new Error(payload.error ?? 'The production-style preview could not be rendered.');
    }
    return payload;
  };
  return {
    mode: 'cloud' as const,
    uid: user.uid,
    role,
    accountEmail: user.email ?? undefined,
    listPublishedArticles: async () => {
      const response = await fetch('/api/content/articles', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.articles)) throw new Error('Published site articles could not be loaded. Reload to try again.');
      return payload.articles;
    },
    listDrafts: async () => {
      const response = await fetch('/api/content/editorial/drafts', {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Articles could not be loaded.');
      const records: Record<string, StudioDraftRecord> = Array.isArray(payload.drafts)
        ? Object.fromEntries(payload.drafts.map((record: StudioDraftRecord & { id: string }) => [record.id, record]))
        : payload.drafts;
      const entries = await Promise.all(Object.entries(records).map(async ([id, record]) => {
        if (record.administrationOnly === true) return [id, record] as const;
        const snapshotDraft = { id };
        if (record.format === STUDIO_CONTENT_FORMAT) {
          const revision = Number(record.revision);
          const contentSha256 = String(record.contentSha256 ?? '');
          draftVersions.set(snapshotDraft.id, {
            format: 'tiptap-json',
            updatedAt: String(record.updatedAt ?? ''),
            revision,
            contentSha256,
          });
          return [snapshotDraft.id, {
            ...record,
            contentFormat: 'tiptap-json',
          }] as const;
        }
        const source = String(record.body ?? '');
        const sourceSha256 = await sha256(source);
        draftVersions.set(snapshotDraft.id, {
          format: 'legacy',
          updatedAt: String(record.updatedAt ?? ''),
          revision: Number.isInteger(record.revision) ? Number(record.revision) : 0,
          sourceSha256,
          legacyDraft: record,
        });
        return [snapshotDraft.id, {
          ...record,
          contentFormat: 'legacy',
          revision: Number.isInteger(record.revision) ? Number(record.revision) : 0,
          sourceSha256,
        }] as const;
      }));
      return Object.fromEntries(entries);
    },
    saveDraft: async (id: string, draft: StudioDraftRecord, expectedUpdatedAt?: string, checkpoint = false) => {
      const current = draftVersions.get(id);
      if (current?.format === 'legacy') {
        throw new Error('Convert this legacy draft to the professional editor before saving changes.');
      }
      const result = await contentRequest<{ updatedAt: string; revision: number; contentSha256: string }>(id, 'save', {
        draft: canonicalDraftPayload(draft),
        expectedUpdatedAt: current ? expectedUpdatedAt : undefined,
        expectedRevision: current?.revision ?? 0,
        expectedContentSha256: current?.contentSha256,
        checkpoint,
      });
      draftVersions.set(id, {
        format: 'tiptap-json',
        updatedAt: result.updatedAt,
        revision: result.revision,
        contentSha256: result.contentSha256,
      });
      return result;
    },
    migrateDraft: async (id: string, expectedUpdatedAt: string, expectedRevision: number, expectedSourceSha256: string) => {
      const result = await contentRequest<{ updatedAt: string; revision: number; contentSha256: string }>(id, 'migrate', {
        expectedUpdatedAt,
        expectedRevision,
        expectedSourceSha256,
      });
      draftVersions.set(id, {
        format: 'tiptap-json',
        updatedAt: result.updatedAt,
        revision: result.revision,
        contentSha256: result.contentSha256,
      });
      return result;
    },
    archiveDraft: (id: string, expectedUpdatedAt: string) => contentRequest(id, 'archive', { expectedUpdatedAt }),
    restoreDraft: (id: string, expectedUpdatedAt: string) => contentRequest(id, 'restore', { expectedUpdatedAt }),
    previewDraft: async (id: string) => contentRequest(id, 'preview', publicationRevision(id)),
    previewDocument: async (id: string) => previewDocumentRequest(id),
    publishDraft: async (id: string, expectedUpdatedAt: string, idempotencyKey: string, previewReceiptId: string) => {
      const revision = publicationRevision(id);
      const result = await contentRequest<{
        releaseId: string;
        liveUrl: string;
        slug: string;
        updatedAt: string;
        revision: number;
        contentSha256: string;
        snapshotSha256: string;
        renderedPageSha256: string;
      }>(id, 'publish', { ...revision, expectedUpdatedAt, idempotencyKey, previewReceiptId });
      draftVersions.set(id, {
        format: 'tiptap-json',
        updatedAt: result.updatedAt,
        revision: result.revision,
        contentSha256: result.contentSha256,
      });
      return result;
    },
    unpublishDraft: (id: string, expectedUpdatedAt: string) =>
      contentRequest(id, 'unpublish', { expectedUpdatedAt }),
    uploadImage: async (id, file, description, signal) => {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', description.alt);
      form.set('decorative', String(description.decorative));
      form.set('caption', description.caption);
      if (description.credit) form.set('credit', description.credit);
      const response = await fetch(`/api/content/drafts/${encodeURIComponent(id)}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body: form,
        signal,
      });
      const payload = await response.json().catch(() => ({})) as { error?: string } & StudioImageAsset;
      if (!response.ok) throw new Error(payload.error ?? 'The image upload failed. Your article was not changed.');
      return payload;
    },
    loadImage: async (assetId) => {
      const response = await fetch(`/content-assets/${encodeURIComponent(assetId)}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('This private draft image could not be loaded.');
      return response.blob();
    },
    listRoleRequests: async () => {
      if (role !== 'administrator') return [];
      const snapshot = await getDocs(query(collection(db, 'roleRequests'), where('status', '==', 'pending')));
      return snapshot.docs.map((request) => request.data() as RoleRequest);
    },
    reviewRoleRequest: async (request: RoleRequest, decision: 'approved' | 'denied') => {
      if (role !== 'administrator') throw new Error('Only administrators can review access requests.');
      await accessRequest(user, { action: 'review-request', uid: request.uid, decision, feedback: decision === 'denied' ? window.prompt('Feedback for the applicant') ?? '' : '' });
    },
  } satisfies StudioBackend;
};

export const showRoleRequestPanel = async (user: User, role: 'commenter' | 'viewer' | 'author') => {
  const db = getFirestore();
  const panel = find<HTMLElement>('[data-role-request-panel]');
  const email = find<HTMLElement>('[data-role-request-email]');
  const select = find<HTMLSelectElement>('[data-role-request-select]');
  const submit = find<HTMLButtonElement>('[data-role-request-submit]');
  const cancel = find<HTMLButtonElement>('[data-role-request-cancel]');
  const status = find<HTMLElement>('[data-role-request-status]');
  if (!panel || !select || !submit || !cancel || !status || !user.email) return;

  panel.hidden = false;
  if (role === 'author') { select.querySelector('option[value="author"]')?.remove(); select.value = 'publisher'; }
  if (email) email.textContent = user.email;
  const requestRef = doc(db, 'roleRequests', user.uid);
  let lastCancelledAt = '';
  let requestApproved = false;

  const showReadyState = (message: string) => {
    select.disabled = false;
    submit.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Send request';
    cancel.hidden = true;
    cancel.disabled = false;
    status.textContent = message;
  };

  const showPendingState = (requestedRole: EditorialRole) => {
    select.value = requestedRole;
    select.disabled = true;
    submit.hidden = true;
    submit.disabled = true;
    cancel.hidden = false;
    cancel.disabled = false;
    status.textContent = `${requestedRole} access requested. An administrator must approve it.`;
  };

  submit.addEventListener('click', async () => {
    if (requestApproved) {
      window.location.reload();
      return;
    }
    submit.disabled = true;
    status.textContent = 'Sending request…';
    try {
      const requestedRole = select.value as EditorialRole;
      await setDoc(requestRef, {
        uid: user.uid,
        email: user.email,
        currentRole: role,
        requestedRole,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedAt: '',
        reviewedBy: '',
        lastCancelledAt,
      });
      showPendingState(requestedRole);
    } catch (error) {
      submit.disabled = false;
      status.textContent = error instanceof Error ? error.message : 'The request could not be sent.';
    }
  });

  cancel.addEventListener('click', async () => {
    cancel.disabled = true;
    status.textContent = 'Cancelling request…';
    try {
      lastCancelledAt = new Date().toISOString();
      await updateDoc(requestRef, {
        status: 'cancelled',
        lastCancelledAt,
      });
      showReadyState('Request cancelled. Choose a role whenever you are ready.');
    } catch (error) {
      cancel.disabled = false;
      status.textContent = error instanceof Error ? error.message : 'The request could not be cancelled.';
    }
  });

  const existing = await getDoc(requestRef);
  if (existing.exists()) {
    const request = existing.data() as RoleRequest;
    lastCancelledAt = request.lastCancelledAt ?? '';
    if (request.status === 'pending') {
      showPendingState(request.requestedRole);
      return;
    }
    if (request.status === 'approved' && request.requestedRole !== role) {
      requestApproved = true;
      status.textContent = 'Your request was approved. Reload your articles to continue.';
      select.disabled = true;
      cancel.hidden = true;
      submit.textContent = 'Reload your articles';
      return;
    }
    if (request.status === 'approved') { showReadyState(`Your ${role} access is active. You can apply for Publisher access.`); return; }
    showReadyState(
      request.status === 'cancelled'
        ? 'Request cancelled. Choose a role whenever you are ready.'
        : `Your previous request was returned.${request.feedback ? ` Feedback: ${request.feedback}` : ''} You may apply again.`,
    );
    return;
  }
  showReadyState('Only an existing administrator can approve this request.');
};

export const initializeStudioBackend = async (): Promise<StudioBackend> => {
  const googleButton = find<HTMLButtonElement>('[data-google-signin]');
  const retryButton = find<HTMLButtonElement>('[data-access-retry]');

  if (!isConfigured) {
    showAccessState(
      'Google sign-in needs configuration',
      'Connect this site to its Firebase project to enable authorized access and cross-device drafts.',
    );
    return new Promise<StudioBackend>(() => undefined);
  }

  const app = getFirebaseClientApp();
  const auth = getAuth(app);
  retryButton?.addEventListener('click', async () => {
    clearAuthorizedSession();
    clearMemberSession();
    await signOut(auth);
    window.location.reload();
  });
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error('[studio] authentication persistence failed', error);
    showAccessState('Sign-in unavailable', 'Your account session could not be restored. Reload the page to try again.');
    if (retryButton) retryButton.hidden = false;
    return new Promise<StudioBackend>(() => undefined);
  }
  const db = getFirestore(app);

  if (googleButton) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    googleButton.addEventListener('click', async () => {
      googleButton.disabled = true;
      showAccessState('Signing you in…', 'Choose your Google account to continue.');
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('[studio] Google sign-in failed', error);
        googleButton.disabled = false;
        showAccessState('Could not sign in', signInErrorMessage(error));
      }
    });
  }

  return new Promise<StudioBackend>((resolve) => {
    let authGeneration = 0;
    let unlockedUid: string | null = null;
    let sessionEnded = false;
    const lockStudio = () => {
      sessionEnded = true;
      clearAuthorizedSession();
      clearMemberSession();
      const studio = find<HTMLElement>('[data-studio]');
      if (studio) {
        studio.hidden = true;
        studio.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close());
      }
      const gate = find<HTMLElement>('[data-access-gate]');
      if (gate) revealAccessGate();
    };
    onAuthStateChanged(auth, async (user) => {
      const generation = ++authGeneration;
      if (unlockedUid) {
        if (user?.uid !== unlockedUid) {
          lockStudio();
          showAccessState('Account changed', 'Reloading this page to protect your work.');
          // Recreate the editor and its bound backend for the new identity.
          // An existing editor must never be reused across accounts.
          window.location.reload();
        }
        return;
      }
      if (!user) {
        clearAuthorizedSession();
        clearMemberSession();
        showAccessState('Sign in to write', 'New accounts start as Commentators. Editorial tools require Administrator approval.');
        if (googleButton) {
          googleButton.hidden = false;
          googleButton.disabled = false;
        }
        if (retryButton) retryButton.hidden = true;
        return;
      }

      if (googleButton) googleButton.hidden = true;
      if (retryButton) retryButton.hidden = true;
      const isCurrentUser = () => generation === authGeneration && auth.currentUser?.uid === user.uid;

      if (!user.email || !user.emailVerified) {
        showAccessState('Verified email required', 'This Google account does not provide a verified email address.');
        if (retryButton) retryButton.hidden = false;
        return;
      }

      try {
        const accessRef = doc(db, 'studioAccess', user.uid);
        let access = await getDoc(accessRef);
        if (!isCurrentUser()) return;
        if (!access.exists()) {
          await setDoc(accessRef, {
            active: true,
            role: 'commenter',
            email: user.email,
            claimedAt: new Date().toISOString(),
          });
          access = await getDoc(accessRef);
          if (!isCurrentUser()) return;
        }
        // Existing editorial accounts do not need to re-claim an invitation on
        // every route. The access document below remains the authority for each
        // page load, so this reduces latency without trusting browser storage.
        const existingRole = access.exists() ? access.data().role : undefined;
        if (user.providerData.some(provider => provider.providerId === 'google.com') && (!access.exists() || existingRole === 'commenter')) {
          await accessRequest(user, { action: 'claim-invite' });
          if (!isCurrentUser()) return;
          access = await getDoc(accessRef);
          if (!isCurrentUser()) return;
        }
        const role = access.exists() ? access.data().role : undefined;
        const allowed = access.exists()
          && access.data().active === true
          && (role === 'administrator' || role === 'publisher' || role === 'author');
        rememberMemberSession(user, role as StudioRole);
        // Profile completion is not an access-control decision. Keep the first
        // completion flow, then remember it briefly to avoid delaying every
        // editorial route with another read/write.
        if (!profileSessionIsCurrent(user)) await recordAuthorizedProfile(user);
        if (!isCurrentUser()) return;
        if (!allowed && (role === 'commenter' || role === 'viewer')) {
          clearAuthorizedSession();
          showAccessState(
            role === 'commenter' ? 'Commentator access active' : 'View-only access active',
            role === 'commenter'
              ? 'You can participate in comments on published articles. Request an editorial role to enter My articles.'
              : 'This account can read permitted content but cannot create or edit content.',
          );
          if (googleButton) googleButton.hidden = true;
          if (retryButton) retryButton.hidden = false;
          await showRoleRequestPanel(user, role);
          return;
        }
        if (!allowed) {
          clearAuthorizedSession();
          showAccessState('Access unavailable', 'This account has an unsupported or inactive role. Contact an administrator.');
          if (googleButton) googleButton.hidden = true;
          if (retryButton) retryButton.hidden = false;
          return;
        }

        const backend = new Proxy(createCloudBackend(user, role as EditorialRole), {
          get(target, key, receiver) {
            const value = Reflect.get(target, key, receiver);
            if (typeof value !== 'function') return value;
            return (...args: unknown[]) => {
              if (sessionEnded || auth.currentUser?.uid !== user.uid) {
                return Promise.reject(new Error('Your account changed. Reload before continuing.'));
              }
              return value.apply(target, args);
            };
          },
        });
        rememberAuthorizedSession(user, role);
        unlockedUid = user.uid;
        unlockStudio(backend);
        document.querySelectorAll<HTMLButtonElement>('[data-studio-signout]').forEach((control) => {
          control.addEventListener('click', async () => {
            clearAuthorizedSession();
            clearMemberSession();
            await signOut(auth);
            window.location.reload();
          });
        });
        resolve(backend);
      } catch (error) {
        if (!isCurrentUser()) return;
        console.error('[studio] access check failed', error);
        showAccessState('Access check failed', 'The allowlist could not be checked. Verify Firestore and its security rules, then try again.');
        if (retryButton) retryButton.hidden = false;
      }
    }, (error) => {
      authGeneration += 1;
      if (unlockedUid) lockStudio();
      console.error('[studio] authentication state failed', error);
      showAccessState('Sign-in unavailable', 'Your account state could not be checked. Reload the page to try again.');
      if (googleButton) googleButton.hidden = true;
      if (retryButton) retryButton.hidden = false;
    });
  });
};

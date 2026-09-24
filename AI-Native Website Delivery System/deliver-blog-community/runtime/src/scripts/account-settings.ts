import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import {
  countryCodeValues,
  populateCountryOptions,
  primaryInterestValues,
  professionalRoleValues,
  type MemberProfileChoices,
} from '../data/member-profile';
import { getFirebaseClientApp, isFirebaseConfigured } from './firebase-client';

type MemberRole = 'administrator' | 'publisher' | 'author' | 'commenter' | 'viewer';
type MemberProfile = MemberProfileChoices & {
  uid: string;
  email: string;
  displayName: string;
  providerIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  privacyNoticeVersion: string;
};

const roles = new Set<MemberRole>(['administrator', 'publisher', 'author', 'commenter', 'viewer']);
const memberSessionKey = 'blog-member-session-v1';
const editorialSessionKey = 'blog-studio-authorized-session-v1';

const find = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const roleLabel = (role: MemberRole) => role === 'viewer' ? 'View only' : role[0].toUpperCase() + role.slice(1);

const rememberMemberSession = (user: User, role: MemberRole) => {
  const session = JSON.stringify({ uid: user.uid, role, expiresAt: Date.now() + 60 * 60 * 1000 });
  window.localStorage.setItem(memberSessionKey, session);
  if (['administrator', 'publisher', 'author'].includes(role)) {
    window.localStorage.setItem(editorialSessionKey, session);
  } else {
    window.localStorage.removeItem(editorialSessionKey);
  }
  window.dispatchEvent(new StorageEvent('storage', { key: memberSessionKey }));
};

const clearMemberSessions = () => {
  window.localStorage.removeItem(memberSessionKey);
  window.localStorage.removeItem(editorialSessionKey);
  window.dispatchEvent(new StorageEvent('storage', { key: memberSessionKey }));
};

const signInErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
  if (code === 'auth/popup-blocked') return 'Allow pop-ups for this site, then try again.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'The sign-in window closed before finishing.';
  if (code === 'auth/network-request-failed') return 'The connection to Google failed. Check the network and try again.';
  return error instanceof Error ? error.message : 'Google sign-in did not complete.';
};

export const initializeAccountSettings = async () => {
  const loading = find<HTMLElement>('[data-account-loading]');
  const signedOut = find<HTMLElement>('[data-account-signed-out]');
  const content = find<HTMLElement>('[data-account-content]');
  const signInButton = find<HTMLButtonElement>('[data-account-signin]');
  const signOutButton = find<HTMLButtonElement>('[data-account-signout]');
  const status = find<HTMLElement>('[data-account-status]');
  const name = find<HTMLInputElement>('[data-account-name]');
  const email = find<HTMLInputElement>('[data-account-email]');
  const role = find<HTMLElement>('[data-account-role]');
  const studioLink = find<HTMLAnchorElement>('[data-account-studio-link]');
  const profileForm = find<HTMLFormElement>('[data-account-profile-form]');
  const professionalRole = find<HTMLSelectElement>('[data-account-professional-role]');
  const primaryInterest = find<HTMLSelectElement>('[data-account-primary-interest]');
  const country = find<HTMLSelectElement>('[data-account-country]');
  const profileSubmit = find<HTMLButtonElement>('[data-account-profile-submit]');
  const profileStatus = find<HTMLElement>('[data-account-profile-status]');

  if (!isFirebaseConfigured) {
    if (loading) loading.hidden = true;
    if (signedOut) signedOut.hidden = false;
    if (status) status.textContent = 'Account settings require the configured this site sign-in service.';
    if (signInButton) signInButton.hidden = true;
    return;
  }

  if (country) populateCountryOptions(country);

  const app = getFirebaseClientApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  signInButton?.addEventListener('click', async () => {
    signInButton.disabled = true;
    if (status) status.textContent = 'Choose your Google account to continue.';
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      signInButton.disabled = false;
      if (status) status.textContent = signInErrorMessage(error);
    }
  });

  signOutButton?.addEventListener('click', async () => {
    clearMemberSessions();
    await signOut(auth);
    window.location.reload();
  });

  let currentUser: User | null = null;
  let currentProfile: MemberProfile | null = null;

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser || !currentProfile || !professionalRole || !primaryInterest || !country) return;
    if (
      !professionalRoleValues.has(professionalRole.value as never)
      || !primaryInterestValues.has(primaryInterest.value as never)
      || (country.value !== '' && !countryCodeValues.has(country.value))
    ) {
      if (profileStatus) profileStatus.textContent = 'Choose a listed option for each field.';
      return;
    }
    if (profileSubmit) profileSubmit.disabled = true;
    if (profileStatus) profileStatus.textContent = 'Saving…';
    const updated: MemberProfile = {
      ...currentProfile,
      professionalRole: professionalRole.value,
      primaryInterest: primaryInterest.value,
      countryCode: country.value,
      profileCompletedAt: currentProfile.profileCompletedAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'userProfiles', currentUser.uid), updated);
      currentProfile = updated;
      if (profileStatus) profileStatus.textContent = 'Personal information saved.';
    } catch (error) {
      if (profileStatus) profileStatus.textContent = error instanceof Error ? error.message : 'Your information could not be saved.';
    } finally {
      if (profileSubmit) profileSubmit.disabled = false;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (loading) loading.hidden = true;
      if (content) content.hidden = true;
      if (signedOut) signedOut.hidden = false;
      if (signInButton) signInButton.disabled = false;
      return;
    }
    if (!user.email || !user.emailVerified) {
      if (loading) loading.hidden = true;
      if (signedOut) signedOut.hidden = false;
      if (status) status.textContent = 'Use a Google account with a verified email address.';
      return;
    }

    try {
      const accessRef = doc(db, 'studioAccess', user.uid);
      let access = await getDoc(accessRef);
      if (!access.exists()) {
        const invite = await getDoc(doc(db, 'studioInvites', user.email));
        const invitedRole = invite.exists() ? invite.data().role : undefined;
        const initialRole = invite.exists() && invite.data().active === true && roles.has(invitedRole)
          ? invitedRole as MemberRole
          : 'commenter';
        await setDoc(accessRef, { active: true, role: initialRole, email: user.email, claimedAt: new Date().toISOString() });
        access = await getDoc(accessRef);
      }
      const accessRole = access.data()?.role;
      const memberRole: MemberRole = roles.has(accessRole) ? accessRole : 'commenter';
      rememberMemberSession(user, memberRole);

      const profileRef = doc(db, 'userProfiles', user.uid);
      const profileSnapshot = await getDoc(profileRef);
      const now = new Date().toISOString();
      const existing = profileSnapshot.exists() ? profileSnapshot.data() : {};
      currentProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName ?? '',
        providerIds: user.providerData.map((entry) => entry.providerId),
        professionalRole: professionalRoleValues.has(existing.professionalRole) ? existing.professionalRole : 'prefer-not-to-say',
        primaryInterest: primaryInterestValues.has(existing.primaryInterest) ? existing.primaryInterest : 'prefer-not-to-say',
        countryCode: countryCodeValues.has(existing.countryCode) ? existing.countryCode : '',
        profileCompletedAt: typeof existing.profileCompletedAt === 'string' ? existing.profileCompletedAt : now,
        firstSeenAt: typeof existing.firstSeenAt === 'string' ? existing.firstSeenAt : now,
        lastSeenAt: now,
        privacyNoticeVersion: '2026-08-16',
      };
      currentUser = user;
      if (!profileSnapshot.exists()) await setDoc(profileRef, currentProfile);

      if (name) name.value = currentProfile.displayName || 'Not provided by Google';
      if (email) email.value = currentProfile.email;
      if (role) role.textContent = roleLabel(memberRole);
      if (professionalRole) professionalRole.value = currentProfile.professionalRole;
      if (primaryInterest) primaryInterest.value = currentProfile.primaryInterest;
      if (country) country.value = currentProfile.countryCode;
      if (studioLink) studioLink.hidden = !['administrator', 'publisher', 'author'].includes(memberRole);
      if (loading) loading.hidden = true;
      if (signedOut) signedOut.hidden = true;
      if (content) content.hidden = false;
    } catch (error) {
      if (loading) loading.hidden = true;
      if (signedOut) signedOut.hidden = false;
      if (status) status.textContent = error instanceof Error ? error.message : 'Your account could not be loaded.';
    }
  });
};

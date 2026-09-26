// Explicit sign-in owns initialization and navigation. Firebase need not emit a
// new auth-state event when retrying the same account after a service failure.
export function createSignInNavigation({ signIn, initialize, navigate, onBusy, onError }) {
  let pending = false;
  let restoration = Promise.resolve();
  return {
    async signIn() {
      if (pending) return;
      pending = true;
      onBusy(true);
      try {
        // Open the popup within the click's user activation, even if an older
        // restoration is still finishing. Initialize only after both settle.
        const [{ user }] = await Promise.all([signIn(), restoration]);
        if (await initialize(user)) navigate('/');
      } catch (error) {
        onError(error);
      } finally {
        pending = false;
        onBusy(false);
      }
    },
    restore(user) {
      // The explicit flow initializes the popup result once, in either callback
      // order. Ordinary session restoration stays on the requested account page.
      if (pending) return Promise.resolve();
      restoration = restoration.then(() => initialize(user)).catch(onError);
      return restoration;
    },
  };
}

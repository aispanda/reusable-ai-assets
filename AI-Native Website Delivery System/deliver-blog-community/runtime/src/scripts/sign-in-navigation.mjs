// Navigation belongs to an explicit sign-in attempt, never session restoration.
export function createSignInNavigation(navigate) {
  let pending = false;
  let signedInUid;
  let readyUid;
  const finish = () => {
    if (pending && signedInUid && signedInUid === readyUid) {
      pending = false;
      navigate('/');
    }
  };
  return {
    begin() { pending = true; signedInUid = undefined; readyUid = undefined; },
    authenticated(uid) { signedInUid = uid; finish(); },
    ready(uid) { readyUid = uid; finish(); },
    cancel() { pending = false; signedInUid = undefined; readyUid = undefined; },
  };
}

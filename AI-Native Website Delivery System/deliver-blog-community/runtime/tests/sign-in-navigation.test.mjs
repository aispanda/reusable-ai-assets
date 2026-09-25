import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignInNavigation } from '../src/scripts/sign-in-navigation.mjs';

function fixture(overrides = {}) {
  const destinations = [], busy = [], errors = [], initialized = [];
  const user = { uid: 'member' };
  const flow = createSignInNavigation({
    signIn: async () => ({ user }),
    initialize: async account => { initialized.push(account); return true; },
    navigate: path => destinations.push(path),
    onBusy: value => busy.push(value),
    onError: error => errors.push(error),
    ...overrides,
  });
  return { flow, destinations, busy, errors, initialized, user };
}

test('explicit sign-in goes home only after successful account initialization', async () => {
  const started = Promise.withResolvers(), ready = Promise.withResolvers();
  const f = fixture({ initialize: async () => { started.resolve(); return ready.promise; } });
  const attempt = f.flow.signIn();
  await started.promise;
  assert.deepEqual(f.destinations, []);
  assert.deepEqual(f.busy, [true]);
  await f.flow.signIn(); // A second click must not launch another attempt.
  ready.resolve(true);
  await attempt;
  assert.deepEqual(f.destinations, ['/']);
  assert.deepEqual(f.busy, [true, false]);
});

test('restored sessions stay on the requested account page', async () => {
  const f = fixture();
  await f.flow.restore(f.user);
  assert.deepEqual(f.initialized, [f.user]);
  assert.deepEqual(f.destinations, []);
  assert.deepEqual(f.busy, []);
});

test('same-account retry reinitializes after failure without a new auth-state event', async () => {
  let attempts = 0;
  const f = fixture({ initialize: async () => ++attempts > 1 });
  await f.flow.signIn();
  assert.deepEqual(f.destinations, []);
  assert.equal(f.busy.at(-1), false);
  await f.flow.signIn();
  assert.equal(attempts, 2);
  assert.deepEqual(f.destinations, ['/']);
  assert.deepEqual(f.busy, [true, false, true, false]);
});

test('cancelled popup and failed initialization enable retry without navigation', async () => {
  for (const stage of ['signIn', 'initialize']) {
    const failure = new Error('Unavailable');
    const f = fixture({ [stage]: async () => { throw failure; } });
    await f.flow.signIn();
    assert.deepEqual(f.destinations, []);
    assert.deepEqual(f.errors, [failure]);
    assert.deepEqual(f.busy, [true, false]);
  }
});

test('auth observer events during popup do not duplicate or override popup initialization', async () => {
  const popup = Promise.withResolvers();
  const f = fixture({ signIn: () => popup.promise });
  const attempt = f.flow.signIn();
  await f.flow.restore({ uid: 'old-account' });
  await f.flow.restore(f.user);
  assert.deepEqual(f.initialized, []);
  popup.resolve({ user: f.user });
  await attempt;
  assert.deepEqual(f.initialized, [f.user]);
  assert.deepEqual(f.destinations, ['/']);
});

test('in-flight restoration finishes before a new explicit account initializes', async () => {
  const started = Promise.withResolvers(), restored = Promise.withResolvers();
  const initialized = [];
  const f = fixture({ initialize: async account => {
    initialized.push(account.uid);
    if (account.uid === 'old-account') { started.resolve(); await restored.promise; }
    return true;
  } });
  const restoration = f.flow.restore({ uid: 'old-account' });
  await started.promise;
  const attempt = f.flow.signIn();
  assert.deepEqual(f.destinations, []);
  restored.resolve();
  await Promise.all([restoration, attempt]);
  assert.deepEqual(initialized, ['old-account', 'member']);
  assert.deepEqual(f.destinations, ['/']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignInNavigation } from '../src/scripts/sign-in-navigation.mjs';

for (const order of [['authenticated', 'ready'], ['ready', 'authenticated']]) {
  test(`explicit sign-in goes home once after both ${order.join(' and ')}`, () => {
    const destinations = [];
    const flow = createSignInNavigation(path => destinations.push(path));
    flow.begin();
    flow[order[0]]('user');
    assert.deepEqual(destinations, []);
    flow[order[1]]('user');
    flow.ready('user');
    assert.deepEqual(destinations, ['/']);
  });
}
test('restored sessions stay on the requested account page', () => {
  const flow = createSignInNavigation(() => assert.fail('Unexpected redirect'));
  flow.ready('user');
});
test('failed, cancelled or inactive sign-in does not navigate', () => {
  const flow = createSignInNavigation(() => assert.fail('Unexpected redirect'));
  flow.begin(); flow.ready('user'); flow.cancel(); flow.authenticated('user');
});
test('stale account callbacks cannot complete another user sign-in', () => {
  const destinations = [];
  const flow = createSignInNavigation(path => destinations.push(path));
  flow.begin(); flow.ready('old'); flow.authenticated('new');
  assert.deepEqual(destinations, []);
  flow.ready('new');
  assert.deepEqual(destinations, ['/']);
});

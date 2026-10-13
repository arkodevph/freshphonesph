import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { safeSupportReturn, signInDestination, supportSignInHref } from '../lib/support-entry';
import { createPortalSupport, getPortalSupport, getSupportCaseDetail, replySupportCase } from '../lib/api';

const customer = { account_type: 'customer' as const, permissions: ['SUPPORT_READ', 'SUPPORT_CREATE'] };
const staff = { account_type: 'employee' as const, permissions: ['SUPPORT_MANAGE'] };
test('support entry preserves known customer destinations through sign-in and expiry', () => {
  for (const hash of ['', '#new-request', '#request-history', '#case-12', '#case-a577490d-1eaa-4bca-97ed-016b925cd948']) {
    const destination = `/portal/support${hash}`;
    const login = new URL(supportSignInHref('/portal/support', hash), 'https://example.test');
    assert.equal(login.pathname, '/login');
    assert.equal(login.searchParams.get('next'), destination);
    assert.equal(signInDestination(customer, login.searchParams.get('next')), destination);
    assert.equal(signInDestination(null, destination), destination);
  }
  assert.equal(supportSignInHref('/portal/support', '#unknown'), '/login?next=%2Fportal%2Fsupport');
  assert.equal(supportSignInHref('/portal/payments'), '/login');
});
test('login targets reject external URLs, traversal, encoded alternatives and unapproved pages', () => {
  for (const target of [null, '', 'https://example.test', '//example.test', '/\\example.test', 'javascript:alert(1)',
    '/portal/support?next=https://example.test', '/portal/support/../settings', '/portal/support%23new-request',
    '%2Fportal%2Fsupport', '/PORTAL/SUPPORT', '/system/team', '/portal/support#<script>', '/portal/support#case-../1']) {
    assert.equal(safeSupportReturn(target), null, String(target));
    assert.equal(signInDestination(customer, target), '/portal');
    assert.equal(signInDestination(staff, target), '/system');
  }
});
test('support-intent staff routing honors manage permission and normal login keeps its destination', () => {
  assert.equal(signInDestination(staff, '/portal/support#new-request'), '/system/support');
  assert.equal(signInDestination({ account_type: 'employee', permissions: ['SUPPORT_READ'] }, '/portal/support'), '/system');
  assert.equal(signInDestination({ account_type: 'employee', permissions: [] }, '/portal/support'), '/system');
  assert.equal(signInDestination(customer, null), '/portal');
  assert.equal(signInDestination(staff, null), '/system');
});
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
test('customer support continues using authenticated existing case routes without client-ID selection', async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => { calls.push({ path: new URL(String(input)).pathname, init }); return Response.json({}); };
  await getPortalSupport();
  await createPortalSupport({ category: 'Account', description: 'Please check my account details.' });
  await getSupportCaseDetail('case-id');
  await replySupportCase('case-id', 'Here are the requested details.');
  assert.deepEqual(calls.map(call => call.path), ['/api/portal/support', '/api/portal/support', '/api/portal/support/case-id', '/api/portal/support/case-id/replies']);
  assert.ok(calls.every(call => call.init?.credentials === 'include' && call.init.cache === 'no-store'));
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { category: 'Account', description: 'Please check my account details.' });
  assert.deepEqual(JSON.parse(String(calls[3].init?.body)), { body: 'Here are the requested details.' });
});

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { getEmployee, getEmployeeHrAccessHistory, updateEmployee } from '../lib/api';
import { ApiError } from '../lib/ts-api';

const original = globalThis.fetch;
after(() => { globalThis.fetch = original; });
const id = 'ae50ed85-97ee-4038-a01d-8dca3e9fa6ab';
const account = { id, name: 'Synthetic HR', email: 'synthetic@example.test', role: 'HR_PAYROLL',
  active: true, hrConfidentialAccess: true, version: 2, clientId: null, createdAt: '2026-10-08T00:00:00Z' };
test('the account adapter retains the grant and sends explicit false revocations with their reason and captured version', async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => { calls.push({ url: String(input), options }); return Response.json(account); };
  assert.equal((await getEmployee(id)).hr_confidential_access, true);
  await updateEmployee(id, { version: 2, hr_confidential_access: false, hr_access_reason: 'Duties changed.' });
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), { version: 2, hrConfidentialAccess: false, hrAccessReason: 'Duties changed.' });
  assert.equal(calls[1].options?.credentials, 'include');
  await updateEmployee(id, { version: 2, status: 'inactive' });
  assert.deepEqual(JSON.parse(String(calls[2].options?.body)), { version: 2, active: false });
});
test('access-history paging uses the Owner endpoint and propagates revoked access and conflicts', async () => {
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, `/api/accounts/${id}/hr-access-history`);
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(options?.cache, 'no-store');
    return Response.json({ items: [], total: 25, page: 2, pageSize: 20 });
  };
  assert.equal((await getEmployeeHrAccessHistory(id, 2)).total, 25);
  for (const status of [403, 409]) {
    globalThis.fetch = async () => Response.json({ message: 'Access changed.' }, { status });
    await assert.rejects(updateEmployee(id, { version: 1, hr_confidential_access: true, hr_access_reason: 'Approved duties.' }),
      (caught: unknown) => caught instanceof ApiError && caught.status === status);
  }
});

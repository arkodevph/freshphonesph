import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retentionPolicySchema, retentionQuerySchema, retentionRequestSchema, effectivePermissions } from '@freshphones/contracts';
import { fingerprint, redactSnapshot } from '../src/retention/manifest';
test('retention validation rejects invented approvals, unsafe periods and unbounded queries', () => {
  const policy = { scope: 'CUSTOMER', days: 1, basis: 'Documented business policy', backupInstructions: 'Documented backup handling', externalCopyInstructions: 'Documented provider handling' };
  assert.equal(retentionPolicySchema.safeParse(policy).success, true);
  for (const body of [{ ...policy, days: 0 }, { ...policy, days: 1.5 }, { ...policy, days: 36501 }, { ...policy, status: 'ACTIVE' }, { ...policy, approvedById: 'fake' }])
    assert.equal(retentionPolicySchema.safeParse(body).success, false);
  assert.equal(retentionQuerySchema.safeParse({ page: '1junk' }).success, false);
  assert.equal(retentionRequestSchema.safeParse({ scope: 'CUSTOMER', subjectId: 'fake', previewHash: 'fake', reason: 'reason' }).success, false);
  assert.ok(effectivePermissions({ role: 'OWNER' }).includes('RETENTION_MANAGE'));
  assert.equal(effectivePermissions({ role: 'HR_PAYROLL', hrConfidentialAccess: true }).includes('RETENTION_MANAGE'), false);
});
test('approval fingerprint ignores row order but notices content changes; audit redaction preserves financial facts', () => {
  const first = { rows: [{ id: '1', name: 'private' }, { id: '2', name: 'other' }], date: new Date('2020-01-01') };
  assert.equal(fingerprint(first), fingerprint({ date: first.date, rows: [...first.rows].reverse() }));
  assert.notEqual(fingerprint(first), fingerprint({ ...first, rows: [{ id: '1', name: 'updated' }, first.rows[1]] }));
  assert.deepEqual(redactSnapshot({ client: { id: '1', name: 'private', phone: '0912' }, amount: '1234.56', status: 'VERIFIED', notes: 'private' }),
    { client: { id: '1', name: '[erased]', phone: '[erased]' }, amount: '1234.56', status: 'VERIFIED', notes: '[erased]' });
});

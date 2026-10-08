import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountSchema, accountUpdateSchema, effectivePermissions, roles } from '@freshphones/contracts';
import { allowed } from '../src/auth/access';
import { safeUser } from '../src/auth/auth.service';

test('confidential access requires an Owner or an explicit grant for an eligible role, even with forged permission claims', () => {
  for (const role of roles) for (const hrConfidentialAccess of [false, true]) {
    const expected = role === 'OWNER' || (hrConfidentialAccess && (role === 'HR_PAYROLL' || role === 'COO'));
    const user = { role, hrConfidentialAccess, permissions: ['HR_CONFIDENTIAL', 'KPI_REVIEW'] };
    assert.equal(allowed(user, 'HR_CONFIDENTIAL'), expected, `${role}/${hrConfidentialAccess}`);
    assert.equal(allowed(user, 'KPI_REVIEW'), expected, `${role}/${hrConfidentialAccess}`);
    assert.equal(effectivePermissions(user).includes('HR_CONFIDENTIAL'), expected);
  }
  for (const role of ['HR_PAYROLL', 'COO'] as const) {
    assert.equal(allowed({ role }, 'HR_CONFIDENTIAL'), false);
    assert.equal(allowed({ role }, 'RECRUITMENT_MANAGE'), true);
    assert.equal(allowed({ role }, 'TASK_ASSIGN'), true);
  }
});
test('session identities use current grants and never infer confidential access from an HR title', () => {
  const input = { id: 'synthetic-id', name: 'Synthetic HR', email: 'synthetic@example.test', role: 'HR_PAYROLL' as const, clientId: null };
  assert.equal(safeUser(input).permissions.includes('KPI_REVIEW'), false);
  const granted = safeUser({ ...input, hrConfidentialAccess: true });
  assert.equal(granted.hrConfidentialAccess, true);
  assert.equal(granted.permissions.includes('HR_CONFIDENTIAL'), true);
});
test('confidential decisions require a captured version and a bounded reason and cannot be injected during account creation', () => {
  for (const hrConfidentialAccess of [false, true]) {
    assert.equal(accountUpdateSchema.safeParse({ version: 1, hrConfidentialAccess, hrAccessReason: '  Approved duties.  ' }).success, true);
    for (const hrAccessReason of [undefined, '', '  ', 'ab', 'x'.repeat(1001)])
      assert.equal(accountUpdateSchema.safeParse({ version: 1, hrConfidentialAccess, hrAccessReason }).success, false);
  }
  assert.equal(accountUpdateSchema.safeParse({ hrConfidentialAccess: true, hrAccessReason: 'Approved.' }).success, false);
  assert.equal(accountUpdateSchema.safeParse({ version: 1, active: true, hrAccessReason: 'Orphan reason.' }).success, false);
  assert.equal(accountUpdateSchema.safeParse({ version: 1, hrConfidentialAccess: true, hrAccessReason: 'Approved.', actorId: 'forged' }).success, false);
  assert.equal(accountSchema.safeParse({ name: 'Synthetic HR', email: 'synthetic@example.test', password: 'Synthetic-password-123!', role: 'HR_PAYROLL', hrConfidentialAccess: true }).success, false);
});

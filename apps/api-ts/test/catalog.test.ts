import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogItemSchema, catalogQuerySchema, publicCatalogQuerySchema, catalogImageSchema, catalogUpdateSchema, catalogPlanSchema, catalogPlanBreakdown, rolePermissions, roles } from '@freshphones/contracts';
import { amountInCents, generateSchedule } from '../src/records/schedule';

const listing = { code: ' test-phone ', name: ' Phone ', condition: 'PRE_OWNED', dailyAmount: '59.25',
  availability: 'CONTACT_US', description: '', published: false, sortOrder: 0, imageAsset: null, installmentPlan: null };
test('catalog contracts normalize codes and reject ambiguous prices, invalid availability and injected file references', () => {
  assert.equal(catalogItemSchema.parse(listing).code, 'TEST-PHONE');
  assert.equal(catalogItemSchema.parse(listing).name, 'Phone');
  assert.equal(catalogItemSchema.safeParse({ ...listing, dailyAmount: null }).success, true);
  for (const patch of [{ dailyAmount: '0' }, { dailyAmount: '-2' }, { dailyAmount: '1e2' }, { dailyAmount: '4.001' },
    { dailyAmount: 59 }, { dailyAmount: '10000000000' }, { dailyAmount: '' }, { availability: 'IN_STOCK' },
    { sortOrder: -1 }, { sortOrder: 10000 }, { sortOrder: 1.5 }, { published: 'true' },
    { imageAsset: '../../private-file' }, { imageFileId: 'private-id' }, { name: 'x'.repeat(101) }])
    assert.equal(catalogItemSchema.safeParse({ ...listing, ...patch }).success, false, JSON.stringify(patch));
  assert.equal(catalogUpdateSchema.safeParse({ version: 0, record: listing }).success, false);
  assert.equal(catalogImageSchema.safeParse({ version: '1junk' }).success, false);
});
test('public queries cannot select hidden listings; search and page sizes are bounded', () => {
  for (const query of [{ page: '1junk' }, { page: 0 }, { page: 1.5 }, { page: 100001 }, { q: 'x'.repeat(101) }, { imageFileId: 'x' }]) {
    assert.equal(catalogQuerySchema.safeParse(query).success, false);
    assert.equal(publicCatalogQuerySchema.safeParse(query).success, false);
  }
  assert.equal(catalogQuerySchema.safeParse({ visibility: 'HIDDEN' }).success, true);
  for (const visibility of ['HIDDEN', 'PUBLISHED']) assert.equal(publicCatalogQuerySchema.safeParse({ visibility }).success, false);
});
test('catalog management is granted only to the four user-approved roles', () => {
  for (const role of roles) assert.equal(rolePermissions[role].includes('CATALOG_MANAGE'),
    ['OWNER', 'COO', 'GENERAL_MANAGER', 'RECORDS'].includes(role), role);
});
test('payment terms must be complete, explicit and allow a positive centavo amount for every installment', () => {
  const plan = { totalAmount: '100', installmentCount: 3, cadence: 'WEEKLY' };
  assert.equal(catalogItemSchema.safeParse({ ...listing, installmentPlan: plan }).success, true);
  assert.equal(catalogItemSchema.safeParse({ ...listing, installmentPlan: undefined }).success, false);
  for (const patch of [{ totalAmount: '0' }, { totalAmount: '0.02' }, { totalAmount: '-1' }, { totalAmount: '1e2' },
    { totalAmount: '1.001' }, { totalAmount: '10000000000' }, { totalAmount: 100 }, { totalAmount: '' },
    { installmentCount: 0 }, { installmentCount: 601 }, { installmentCount: 2.5 }, { installmentCount: '3' },
    { cadence: 'DAILY' }, { cadence: '15_AND_30' }, { cadence: undefined }, { fee: '2' }, { clientId: 'private' }])
    assert.equal(catalogPlanSchema.safeParse({ ...plan, ...patch }).success, false, JSON.stringify(patch));
});
test('public breakdowns match issued schedule rounding and timing without changing a record', () => {
  for (const cadence of ['WEEKLY', 'SEMIMONTHLY', 'MONTHLY'] as const) {
    for (const [totalAmount, installmentCount] of [['100.00', 3], ['1.01', 2], ['1.03', 2], ['0.08', 5], ['0.06', 6],
      ['0.01', 1], ['6.00', 600], ['9999999999.99', 600]] as const) {
      const preview = catalogPlanBreakdown({ totalAmount, installmentCount, cadence });
      const start = new Date('2028-02-27T00:00:00.000Z');
      const issued = generateSchedule({ contractPrice: totalAmount, installmentCount, cadence, startDate: start });
      assert.deepEqual(preview.installments.map(row => row.amount), issued.map(row => row.expectedAmount));
      assert.deepEqual(preview.installments.map(row => row.dayOffset), issued.map(row => (row.dueDate.getTime() - start.getTime()) / 86400000));
      assert.equal(preview.installments.reduce((sum, row) => sum + amountInCents(row.amount), 0n), amountInCents(totalAmount));
      assert.ok(preview.installments.every(row => amountInCents(row.amount) > 0n));
    }
  }
  const thirds = catalogPlanBreakdown({ totalAmount: '100', installmentCount: 3, cadence: 'WEEKLY' });
  assert.equal(thirds.regularAmount, '33.33'); assert.equal(thirds.finalAmount, '33.34');
});

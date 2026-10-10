import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogItem } from '@freshphones/contracts';
import { catalogSampleDate, catalogSampleDateLabel } from '../lib/catalog-plan';
import { catalogDraft, emptyCatalogInput } from '../lib/catalog';
import { updateCatalogItem, getPublicCatalog } from '../lib/api';

test('sample dates use fixed intervals across leap days, month ends and timezone changes', () => {
  assert.equal(catalogSampleDate('2028-02-27', 7), '2028-03-05');
  assert.equal(catalogSampleDate('2026-01-31', 30), '2026-03-02');
  assert.equal(catalogSampleDate('2026-03-01', 15), '2026-03-16');
  assert.equal(catalogSampleDate('2026-12-31', 7), '2027-01-07');
  assert.equal(catalogSampleDate('2100-12-31', 18000), '2150-04-13');
  for (const start of ['2026-02-29', '2026-04-31', '1899-12-31', '2101-01-01', '2026-13-01', '', '2026-1-1'])
    assert.equal(catalogSampleDate(start, 7), null, start);
  assert.equal(catalogSampleDate('2026-01-01', Infinity), null);
  assert.equal(catalogSampleDate('2026-01-01', -1), null);
  for (const part of ['29', 'Feb', '2028']) assert.ok(catalogSampleDateLabel('2028-02-29').includes(part));
});
test('editing a plan retains its captured terms and does not mutate the saved listing', () => {
  const item: CatalogItem = { ...emptyCatalogInput, id: 'catalog-test', version: 7, hasImage: false, updatedAt: '2026-10-08T00:00:00Z',
    installmentPlan: { totalAmount: '100.00', installmentCount: 3, cadence: 'WEEKLY' } };
  const draft = catalogDraft(item);
  draft.installmentPlan!.totalAmount = '200.00';
  assert.equal(item.installmentPlan!.totalAmount, '100.00');
  assert.equal(emptyCatalogInput.installmentPlan, null);
});
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
test('catalog plans travel with the captured listing version; public reads omit credentials and caching', async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => { requests.push({ url: String(input), init }); return Response.json({ items: [], total: 0 }); };
  const draft = { ...emptyCatalogInput, installmentPlan: { totalAmount: '100', installmentCount: 3, cadence: 'WEEKLY' as const } };
  await updateCatalogItem('saved-listing', 7, draft);
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), { version: 7, record: draft });
  await getPublicCatalog({ page: 1, q: 'Phone', availability: '' });
  assert.equal(requests[1].init?.credentials, 'omit');
  assert.equal(requests[1].init?.cache, 'no-store');
});

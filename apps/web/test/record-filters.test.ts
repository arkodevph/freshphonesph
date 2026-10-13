import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecordFilters, recordFilterQuery } from '../lib/record-filters';

const id = '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a';
test('combined filters preserve assignment and batch context, trim searches and omit empty facets', () => {
  assert.deepEqual(recordFilterQuery('client', { ...emptyRecordFilters, q: '  Maria  ', model: ' iPhone ',
    handlerId: id, agentId: id, status: 'ON_HOLD', dateFrom: '2028-02-29', dateTo: '2028-03-01' }, 2, id),
  { error: null, params: { page: '2', q: 'Maria', model: 'iPhone', status: 'ON_HOLD', dateFrom: '2028-02-29',
    dateTo: '2028-03-01', handlerId: id, agentId: id, batchId: id } });
  assert.deepEqual(recordFilterQuery('batch', emptyRecordFilters, 1, id), { error: null, params: { page: '1', q: '' } });
});
test('invalid ranges and impossible calendar dates never produce an API query', () => {
  for (const kind of ['batch', 'client'] as const) {
    for (const dates of [{ dateFrom: '2028-03-01', dateTo: '2028-02-29' }, { dateFrom: '2027-02-29' },
      { dateTo: '2028-02-30' }]) {
      const result = recordFilterQuery(kind, { ...emptyRecordFilters, ...dates }, 1);
      assert.equal(result.params, null); assert.ok(result.error);
    }
    assert.equal(recordFilterQuery(kind, { ...emptyRecordFilters, dateFrom: '2028-02-29', dateTo: '2028-02-29' }, 1).error, null);
  }
});
test('filter queries reject wrong record statuses, invalid assignments and out-of-range pages', () => {
  for (const [kind, status] of [['batch', 'ON_HOLD'], ['client', 'CANCELLED']] as const)
    assert.equal(recordFilterQuery(kind, { ...emptyRecordFilters, status }, 1).params, null);
  assert.equal(recordFilterQuery('client', { ...emptyRecordFilters, handlerId: 'foreign' }, 1).params, null);
  assert.equal(recordFilterQuery('batch', emptyRecordFilters, 0).params, null);
  assert.equal(recordFilterQuery('client', emptyRecordFilters, 100001).params, null);
});

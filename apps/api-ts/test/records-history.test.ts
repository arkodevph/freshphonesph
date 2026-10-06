import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyChanges } from '../src/records/history';

test('record history projects approved fields and compares dates/decimal values consistently', () => {
  assert.deepEqual(historyChanges('batch', 'batch.updated', {
    model: 'Old phone', contractPrice: '100', startDate: '2026-09-01T00:00:00.000Z',
    passwordHash: 'sensitive-before', clients: [{ name: 'Private member' }],
  }, { model: 'New phone', contractPrice: '100.00', startDate: '2026-09-01',
    passwordHash: 'sensitive-after', clients: [{ name: 'Another private member' }] }),
  [{ field: 'model', label: 'Unit / model', before: 'Old phone', after: 'New phone' }]);
});
test('older client snapshots do not invent a batch change when only contact details changed', () => {
  assert.deepEqual(historyChanges('client', 'client.updated', { batchId: 'batch-1', phone: 'Old number' },
    { batchId: 'batch-1', batch: { code: 'B-1' }, phone: 'New number', account: { passwordHash: 'private' } }),
  [{ field: 'phone', label: 'Contact number', before: 'Old number', after: 'New number' }]);
});
test('release and schedule history reveals approved summaries instead of raw data', () => {
  assert.deepEqual(historyChanges('client', 'release.updated', { releaseStatus: 'NOT_READY' },
    { status: 'READY', note: 'Collect Monday', collectionDate: '2026-10-12' }), [
    { field: 'releaseStatus', label: 'Release status', before: 'NOT_READY', after: 'READY' },
    { field: 'note', label: 'Release note', before: null, after: 'Collect Monday' },
    { field: 'collectionDate', label: 'Collection date', before: null, after: '2026-10-12' },
  ]);
  assert.deepEqual(historyChanges('client', 'schedule.generated', null, { items: [{ private: 'proof-link' }, {}] }),
    [{ field: 'schedule', label: 'Installment schedule', before: null, after: '2 installments issued' }]);
});
test('assignment history compares identifiers while displaying only approved snapshot names', () => {
  assert.deepEqual(historyChanges('batch', 'batch.assigned', { handlerId: 'one', agentId: null, handler: { name: 'Previous', email: 'private' } },
    { handlerId: 'two', agentId: 'agent', handler: { name: 'Next', passwordHash: 'secret' }, agent: { name: 'Representative', phone: 'private' } }), [
    { field: 'handlerId', label: 'Handler', before: 'Previous', after: 'Next' },
    { field: 'agentId', label: 'Agent', before: null, after: 'Representative' },
  ]);
  assert.deepEqual(historyChanges('batch', 'batch.updated', { handlerId: 'same' }, { handlerId: 'same', handler: { name: 'New display name' } }), []);
});

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustPayment, listPayments } from '../lib/api';
import { ApiError } from '../lib/ts-api';

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
const id = '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a';
const payment = { id, clientId: id, batchId: id, amount: '125.50', effectiveAmount: '0.00', adjustmentRevision: 3,
  adjustments: [{ id, sequence: 3, amount: '-80.25', beforeAmount: '80.25', afterAmount: '0.00', createdAt: '2026-10-07T00:00:00Z' }],
  paymentDate: '2026-10-01', method: 'Cash', status: 'VERIFIED', version: 2, client: { id, name: 'Synthetic client', batch: { id, code: 'SYNTHETIC' } },
  recordedBy: { id, name: 'Synthetic recorder' }, verifier: { id, name: 'Synthetic Finance' } };

test('adjustment writes preserve the captured revision, version and request ID and map a full reversal to zero credit', async () => {
  const requests: { url: URL; options?: RequestInit }[] = [];
  globalThis.fetch = async (path, options) => { requests.push({ url: new URL(String(path)), options }); return Response.json(payment); };
  const body = { correctedAmount: '0.00', reason: 'Synthetic reversal approved after review.', expectedRevision: 2, paymentVersion: 2, requestId: id };
  const result = await adjustPayment(id, body);
  assert.equal(requests.length, 1); assert.equal(requests[0].url.pathname, `/api/payments/${id}/adjustments`);
  assert.equal(requests[0].options?.method, 'POST'); assert.equal(requests[0].options?.credentials, 'include');
  assert.deepEqual(JSON.parse(String(requests[0].options?.body)), body);
  assert.equal(result.amount, '0.00'); assert.equal(result.original_amount, '125.50'); assert.equal(result.adjustment_revision, 3);
  assert.equal(result.adjustments?.[0].afterAmount, '0.00');
});
test('a stale adjustment surfaces the conflict without fetching a replacement revision or retrying a changed request', async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ message: 'Refresh and review current credit.' }, { status: 409 }); };
  await assert.rejects(adjustPayment(id, { correctedAmount: '8.00', reason: 'Synthetic correction reviewed.', expectedRevision: 0, paymentVersion: 2, requestId: id }),
    (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.equal(requests, 1);
});
test('payment lists preserve legacy originals and expose adjusted credit and history for the customer and Finance', async () => {
  const { effectiveAmount, adjustmentRevision, adjustments, ...legacy } = payment;
  globalThis.fetch = async () => Response.json({ items: [payment, legacy], total: 2, page: 1, pageSize: 20 });
  const result = await listPayments();
  assert.equal(result.results[0].amount, '0.00'); assert.equal(result.results[1].amount, '125.50');
  assert.equal(result.results[1].adjustment_revision, 0); assert.deepEqual(result.results[1].adjustments, []);
});

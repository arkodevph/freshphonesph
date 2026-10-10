import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReportSnapshot, downloadOperationsExport, downloadPaymentsExport, downloadReportExport, getCollectionReport, getReconciliationReport, getReconciliationExceptions, getReportBatches, getReportSnapshots, submitReportAnalysis } from '../lib/api';
import { ApiError } from '../lib/ts-api';
const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
after(() => { globalThis.fetch = originalFetch; globalThis.document = originalDocument; URL.createObjectURL = create; URL.revokeObjectURL = revoke; });

test('payment CSV/XLSX and operation exports send exact filters with cookie authentication and safe fixed filenames', async () => {
  const requests: { url: URL; options?: RequestInit }[] = []; const files: string[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ url: new URL(String(input)), options }); return new Response('synthetic export'); };
  globalThis.document = { body: { appendChild() {} }, createElement() { return { href: '', download: '', click() { files.push(this.download); }, remove() {} }; } } as unknown as Document;
  URL.createObjectURL = () => 'blob:synthetic'; URL.revokeObjectURL = () => {};
  const params = { dateFrom: '2028-02-29', dateTo: '2028-03-01', status: 'pending', q: '  search  ' };
  await downloadPaymentsExport(params, 'csv'); await downloadPaymentsExport(params, 'xlsx'); await downloadOperationsExport('tasks', 'xlsx', { dateFrom: params.dateFrom });
  assert.deepEqual(files, ['payments.csv', 'payments.xlsx', 'tasks.xlsx']);
  for (const [index, format] of ['csv', 'xlsx'].entries()) {
    assert.equal(requests[index].url.pathname, '/api/reports/export');
    assert.deepEqual(Object.fromEntries(requests[index].url.searchParams), { ...params, status: 'PENDING', kind: 'payments', format });
  }
  assert.ok(requests.every((row) => row.options?.credentials === 'include' && row.options.cache === 'no-store'));
});

test('reconciliation reads and exceptions share scoped cookie requests while exports/saves omit page and private rows', async () => {
  const requests: { url: URL; options?: RequestInit }[] = []; const files: string[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ url: new URL(String(input)), options }); return Response.json({}); };
  globalThis.document = { body: { appendChild() {} }, createElement() { return { href: '', download: '', click() { files.push(this.download); }, remove() {} }; } } as unknown as Document;
  URL.createObjectURL = () => 'blob:synthetic'; URL.revokeObjectURL = () => {};
  const scope = { dateFrom: '2048-02-01', dateTo: '2048-02-29', batchId: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a' };
  await getReconciliationReport({ ...scope, page: '2' }); await getReconciliationExceptions({ ...scope, page: '3' });
  for (const format of ['csv', 'xlsx'] as const) await downloadReportExport('reconciliation', format, scope);
  await createReportSnapshot({ kind: 'RECONCILIATION', periodStart: scope.dateFrom, periodEnd: scope.dateTo, batchId: scope.batchId });
  await getReportSnapshots('RECONCILIATION');
  assert.equal(requests[0].url.pathname, '/api/reports/reconciliation'); assert.equal(requests[1].url.pathname, '/api/reports/reconciliation/exceptions');
  assert.equal(requests[0].url.searchParams.get('page'), '2'); assert.equal(requests[1].url.searchParams.get('page'), '3');
  assert.deepEqual(files, ['reconciliation.csv', 'reconciliation.xlsx']);
  for (const index of [2, 3]) assert.equal(requests[index].url.searchParams.has('page'), false);
  assert.deepEqual(JSON.parse(String(requests[4].options?.body)), { kind: 'RECONCILIATION', periodStart: scope.dateFrom, periodEnd: scope.dateTo, batchId: scope.batchId });
  assert.equal(requests[5].url.searchParams.get('kind'), 'RECONCILIATION');
  assert.ok(requests.every((item) => item.options?.credentials === 'include'));
});
test('a denied download reaches the page without creating a file or retrying it', async () => {
  let calls = 0; let files = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ message: 'Report access removed' }, { status: 403 }); };
  URL.createObjectURL = () => { files++; return 'blob:denied'; };
  await assert.rejects(downloadPaymentsExport({}, 'xlsx'), (reason: unknown) => reason instanceof ApiError && reason.status === 403);
  assert.equal(calls, 1); assert.equal(files, 0);
});
test('report batch choices and history are scoped and saving sends only the explicitly captured input', async () => {
  const requests: { url: URL; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ url: new URL(String(input)), options }); return Response.json({}); };
  await getReportBatches({ q: 'Batch', page: '2' }); await getReportSnapshots('SUPPORT', 3);
  const input = { kind: 'PAYMENTS' as const, periodStart: '2028-02-29', periodEnd: '2028-03-01', status: 'PENDING' as const };
  await createReportSnapshot(input);
  assert.equal(requests[0].url.pathname, '/api/reports/batches'); assert.equal(requests[0].url.searchParams.get('page'), '2');
  assert.equal(requests[1].url.searchParams.get('kind'), 'SUPPORT'); assert.equal(requests[1].url.searchParams.get('page'), '3');
  assert.equal(requests[2].options?.method, 'POST'); assert.deepEqual(JSON.parse(String(requests[2].options?.body)), input);
});

test('human analysis submits to one saved report with the original text and authenticated session', async () => {
  const requests: { url: URL; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ url: new URL(String(input)), options }); return Response.json({}); };
  await createReportSnapshot({ kind: 'SUPPORT', periodStart: '2045-01-01', periodEnd: '2045-01-31', analysis: 'A human interpretation of the selected support period.' });
  await submitReportAnalysis('7e091b36-b584-4b09-a8ca-f2a8eb30cb9a', 'A later human interpretation for an older saved period.');
  assert.deepEqual(requests.map((item) => item.url.pathname), ['/api/reports/snapshots', '/api/reports/snapshots/7e091b36-b584-4b09-a8ca-f2a8eb30cb9a/analysis']);
  assert.equal(JSON.parse(String(requests[0].options?.body)).analysis, 'A human interpretation of the selected support period.');
  assert.deepEqual(JSON.parse(String(requests[1].options?.body)), { body: 'A later human interpretation for an older saved period.' });
  assert.ok(requests.every((item) => item.options?.credentials === 'include' && item.options.cache === 'no-store'));
});

test('collection page reads paginate while downloads and saves capture the whole applied scope', async () => {
  const requests: { url: URL; options?: RequestInit }[] = []; const files: string[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ url: new URL(String(input)), options }); return Response.json({}); };
  globalThis.document = { body: { appendChild() {} }, createElement() { return { href: '', download: '', click() { files.push(this.download); }, remove() {} }; } } as unknown as Document;
  URL.createObjectURL = () => 'blob:synthetic'; URL.revokeObjectURL = () => {};
  const scope = { dateFrom: '2028-02-29', dateTo: '2028-03-01', batchId: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a' };
  await getCollectionReport({ ...scope, page: '2' });
  for (const format of ['csv', 'xlsx'] as const) await downloadReportExport('collections', format, scope);
  await createReportSnapshot({ kind: 'COLLECTIONS', periodStart: scope.dateFrom, periodEnd: scope.dateTo, batchId: scope.batchId });
  await getReportSnapshots('COLLECTIONS', 2);
  assert.equal(requests[0].url.pathname, '/api/reports/collections'); assert.equal(requests[0].url.searchParams.get('page'), '2');
  assert.deepEqual(files, ['collections.csv', 'collections.xlsx']);
  for (const index of [1, 2]) assert.deepEqual(Object.fromEntries(requests[index].url.searchParams), { ...scope, kind: 'collections', format: index === 1 ? 'csv' : 'xlsx' });
  assert.equal(JSON.parse(String(requests[3].options?.body)).page, undefined);
  assert.equal(requests[4].url.searchParams.get('kind'), 'COLLECTIONS');
});

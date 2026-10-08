import { test } from 'node:test';
import { collectionReportQuerySchema, reconciliationReportQuerySchema, reportExportQuerySchema, reportSnapshotSchema } from '@freshphones/contracts';
import assert from 'node:assert/strict';
import { defaultReportFilters, reportFilterQuery, snapshotInput, type ReportFilters } from '../lib/report-filters';
const batchId = '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a';
const filters: ReportFilters = { dateFrom: '2028-02-29', dateTo: '2028-03-01', batchId, status: 'PENDING' };

test('reports share date filters and retain payment-only facets without leaking them to operations reports', () => {
  assert.deepEqual(reportFilterQuery('payments', filters).params, filters);
  for (const kind of ['tasks', 'support'] as const) assert.deepEqual(reportFilterQuery(kind, filters).params, { dateFrom: filters.dateFrom, dateTo: filters.dateTo });
  assert.deepEqual(reportFilterQuery('payments', { dateFrom: '', dateTo: '', batchId: '', status: '' }).params, {});
  assert.deepEqual(reportFilterQuery('payments', { ...filters, dateTo: '' }).params, { dateFrom: filters.dateFrom, batchId, status: 'PENDING' });
});

test('reconciliation preserves date/batch scope and rejects status/search/page facets in exports and saves', () => {
  assert.deepEqual(reportFilterQuery('reconciliation', filters).params, { dateFrom: filters.dateFrom, dateTo: filters.dateTo, batchId });
  assert.deepEqual(snapshotInput('reconciliation', filters).input, { kind: 'RECONCILIATION', periodStart: filters.dateFrom, periodEnd: filters.dateTo, batchId });
  assert.equal(snapshotInput('reconciliation', { ...filters, dateTo: '' }).input, null);
  assert.equal(reportFilterQuery('reconciliation', { ...filters, batchId: 'bad' }).params, null);
  for (const facet of [{ status: 'PENDING' }, { q: '' }, { page: 0 }, { page: '2junk' }]) assert.equal(reconciliationReportQuerySchema.safeParse(facet).success, false);
  for (const facet of [{ status: 'PENDING' }, { q: '' }, { page: 2 }]) assert.equal(reportExportQuerySchema.safeParse({ kind: 'reconciliation', format: 'csv', ...facet }).success, false);
  assert.equal(reportSnapshotSchema.safeParse({ kind: 'RECONCILIATION', periodStart: filters.dateFrom, periodEnd: filters.dateTo, status: 'PENDING' }).success, false);
});
test('bad dates, reversed periods and invalid payment filters never produce report or snapshot requests', () => {
  for (const values of [{ dateFrom: '2027-02-29' }, { dateTo: '2028-02-30' }, { dateFrom: '2028-03-02' }, { batchId: 'invalid' }, { status: 'DONE' }]) {
    assert.equal(reportFilterQuery('payments', { ...filters, ...values }).params, null);
    assert.equal(snapshotInput('payments', { ...filters, ...values }).input, null);
  }
  for (const kind of ['payments', 'tasks', 'support'] as const) {
    assert.equal(snapshotInput(kind, { ...filters, dateFrom: '' }).input, null);
    assert.equal(snapshotInput(kind, { ...filters, dateTo: '' }).input, null);
  }
});
test('saving captures the same applied period, batch and status while operations saves remain date-only', () => {
  assert.deepEqual(snapshotInput('payments', filters).input, { kind: 'PAYMENTS', periodStart: filters.dateFrom, periodEnd: filters.dateTo, batchId, status: 'PENDING' });
  assert.deepEqual(snapshotInput('tasks', filters).input, { kind: 'TASKS', periodStart: filters.dateFrom, periodEnd: filters.dateTo });
  assert.deepEqual(snapshotInput('support', filters).input, { kind: 'SUPPORT', periodStart: filters.dateFrom, periodEnd: filters.dateTo });
});
test('default periods use the Manila calendar at month and year boundaries', () => {
  assert.deepEqual(defaultReportFilters(new Date('2026-12-31T16:00:00Z')), { dateFrom: '2027-01-01', dateTo: '2027-01-01', batchId: '', status: '' });
  assert.equal(defaultReportFilters(new Date('2028-02-29T15:59:59Z')).dateTo, '2028-02-29');
});

test('collections retain date and batch scope while excluding payment status and page from captured or exported input', () => {
  assert.deepEqual(reportFilterQuery('collections', filters).params, { dateFrom: filters.dateFrom, dateTo: filters.dateTo, batchId });
  assert.deepEqual(snapshotInput('collections', filters).input, { kind: 'COLLECTIONS', periodStart: filters.dateFrom, periodEnd: filters.dateTo, batchId });
  assert.equal(reportFilterQuery('collections', { ...filters, batchId: 'bad' }).params, null);
  assert.equal(snapshotInput('collections', { ...filters, dateTo: '' }).input, null);
  for (const input of [{ page: 0 }, { page: '1junk' }, { page: 100001 }, { status: 'PENDING' }, { q: 'private' }, { dateFrom: '2027-02-29' }])
    assert.equal(collectionReportQuerySchema.safeParse(input).success, false);
  assert.equal(collectionReportQuerySchema.parse({}).page, 1);
  assert.equal(reportExportQuerySchema.safeParse({ kind: 'collections', format: 'csv', batchId }).success, true);
  for (const facet of [{ status: 'PENDING' }, { q: 'private' }, { page: 2 }])
    assert.equal(reportExportQuerySchema.safeParse({ kind: 'collections', format: 'csv', ...facet }).success, false);
  assert.equal(reportSnapshotSchema.safeParse({ kind: 'COLLECTIONS', periodStart: filters.dateFrom, periodEnd: filters.dateTo, status: 'PENDING' }).success, false);
});

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { RetentionPreview, RetentionRequest } from '@freshphones/contracts';
import { decideRetentionDeletion, executeRetentionDeletion, requestRetentionDeletion, retentionCandidates, retryRetentionFiles } from '../lib/retention';
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
test('retention requests send the reviewed fingerprint and executions send version and typed confirmation', async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => { calls.push({ url: new URL(String(input)), init }); return Response.json({}); };
  const subjectId = '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a';
  await requestRetentionDeletion({ scope: 'APPLICANT', subjectId, previewHash: 'b'.repeat(64), label: 'Do not submit this personal label' } as RetentionPreview, 'Expiry review case');
  const request = { id: subjectId, subjectId, version: 3 } as RetentionRequest;
  await decideRetentionDeletion(request, true, 'Approved expiry case'); await executeRetentionDeletion(request, subjectId); await retryRetentionFiles(subjectId);
  assert.ok(calls.every(call => call.init?.credentials === 'include' && call.init.cache === 'no-store'));
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { scope: 'APPLICANT', subjectId, previewHash: 'b'.repeat(64), reason: 'Expiry review case' });
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { version: 3, approved: true, reason: 'Approved expiry case' });
  assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { version: 3, confirmation: subjectId });
  assert.deepEqual(JSON.parse(String(calls[3].init?.body)), {});
});
test('retention search escapes query text and paginates the whole category', async () => {
  let url = new URL('http://localhost');
  globalThis.fetch = async input => { url = new URL(String(input)); return Response.json({ items: [] }); };
  await retentionCandidates('PRIVATE_FILE', 'receipt & proof', 2);
  assert.equal(url.pathname, '/api/retention/candidates'); assert.equal(url.searchParams.get('q'), 'receipt & proof'); assert.equal(url.searchParams.get('page'), '2');
});

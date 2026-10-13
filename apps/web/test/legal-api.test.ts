import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { legalDocuments } from '@freshphones/contracts';
import { getLegalStatus, acknowledgeLegalDocument } from '../lib/legal';
import { applyToJob } from '../lib/api';

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test('legal status and acceptance use the authenticated API and exact document version', async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), init });
    return Response.json({ pending: [], history: [] });
  };
  await getLegalStatus();
  await acknowledgeLegalDocument({ ...legalDocuments.PORTAL_TERMS, status: 'PUBLISHED', version: 'approved-v1', publishedAt: '2026-10-09T00:00:00Z', reviewItems: [] });
  assert.deepEqual(calls.map((call) => call.url.pathname), ['/api/legal/status', '/api/legal/acknowledgments']);
  assert.ok(calls.every((call) => call.init?.credentials === 'include' && call.init.cache === 'no-store'));
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { key: 'PORTAL_TERMS', version: 'approved-v1', action: 'ACCEPTED' });
});

test('application adapter sends applicant notice evidence only when an approved version was acknowledged', async () => {
  const bodies: FormData[] = [];
  globalThis.fetch = async (_input, init) => {
    bodies.push(init?.body as FormData);
    return Response.json({ detail: 'ok' });
  };
  const body = { job: '7e091b36-b584-4b09-a8ca-f2a8eb30cb9a', full_name: 'Test person', email: 'person@example.test' };
  await applyToJob(body);
  await applyToJob({ ...body, privacyNoticeVersion: 'approved-v1', privacyNoticeAcknowledged: true });
  assert.equal(bodies[0].has('privacyNoticeVersion'), false);
  assert.equal(bodies[1].get('privacyNoticeVersion'), 'approved-v1');
  assert.equal(bodies[1].get('privacyNoticeAcknowledged'), 'true');
});

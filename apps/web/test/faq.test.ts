import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faqs, filterFaqs } from '../lib/faq';

const ids = (entries: ReturnType<typeof filterFaqs>) => entries.map(entry => entry.id);
test('FAQ search finds words in answers and topic names, with forgiving case, spacing and punctuation', () => {
  assert.deepEqual(ids(filterFaqs('  GCASH   bank-transfer  ')), ['payment-options']);
  assert.deepEqual(ids(filterFaqs('délivery')), ['receive-device']);
  assert.deepEqual(ids(filterFaqs('getting started')), ['paluwagan', 'legitimacy']);
  assert.deepEqual(ids(filterFaqs('wont scammed')), ['legitimacy']);
  assert.deepEqual(ids(filterFaqs('preowned')), ['device-condition']);
});
test('FAQ topic and query intersect, and every search word must match the same entry', () => {
  assert.deepEqual(ids(filterFaqs('iPhone', 'devices')), ['sell-device']);
  assert.deepEqual(ids(filterFaqs('GCash', 'devices')), []);
  assert.deepEqual(ids(filterFaqs('GCash', 'payments')), ['payment-options']);
  assert.deepEqual(ids(filterFaqs('doorstep GCash')), []);
  assert.deepEqual(ids(filterFaqs('', 'devices')), ['device-condition', 'sell-device']);
});
test('clearing filters restores the complete ordered FAQ and unknown searches yield no results', () => {
  assert.deepEqual(filterFaqs(' \n\t ', 'all'), faqs);
  for (const query of ['unlisted-topic', '.*', '<script>alert(1)</script>', 'こんにちは'])
    assert.deepEqual(filterFaqs(query), [], query);
  const before = JSON.stringify(faqs);
  filterFaqs('payments', 'payments');
  assert.equal(JSON.stringify(faqs), before);
});

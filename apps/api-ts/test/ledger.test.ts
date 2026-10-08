import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../src/generated/prisma/client';
import { effectiveAmount } from '../src/finance/ledger';

test('credit arithmetic preserves cents at the database money limit and never changes original amounts', () => {
  const original = new Prisma.Decimal('9999999999.99');
  const payment = { amount: original, adjustments: [{ amount: new Prisma.Decimal('-9999999999.98') }] };
  assert.equal(effectiveAmount(payment).toFixed(2), '0.01');
  assert.equal(payment.amount.toFixed(2), '9999999999.99');
});
test('reversal and restoration credits use signed decimal entries rather than binary floating point', () => {
  const payment = { amount: new Prisma.Decimal('0.30'), adjustments: ['-0.10', '-0.20', '0.01'].map((amount) => ({ amount: new Prisma.Decimal(amount) })) };
  assert.equal(effectiveAmount(payment).toFixed(2), '0.01');
  assert.equal(effectiveAmount({ ...payment, adjustments: payment.adjustments.slice(0, 2) }).toFixed(2), '0.00');
});

import type { GcashReading } from "@freshphones/contracts";

const cents = (value: string) => {
  return BigInt(value.replace(".", ""));
};

const decimal = (value: bigint) => {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
};

/** Recheck the complete interpretation. Original parser warnings stay visible. */
export function reconcileReading(
  original: GcashReading,
  rows: GcashReading["rows"],
  period: { start: string; end: string },
): GcashReading {
  const debit = rows.reduce((total, row) => {
    return total + cents(row.debit ?? "0.00");
  }, 0n);

  const credit = rows.reduce((total, row) => {
    return total + cents(row.credit ?? "0.00");
  }, 0n);

  let previous =
    original.openingBalance === null ? null : cents(original.openingBalance);

  const running: boolean[] = [];

  for (const row of rows) {
    if (previous !== null && row.balance !== null) {
      running.push(
        previous - cents(row.debit ?? "0.00") + cents(row.credit ?? "0.00") ===
          cents(row.balance),
      );
    }

    previous = row.balance === null ? null : cents(row.balance);
  }

  const checks = {
    debitTotalMatches:
      original.totalDebit === null
        ? null
        : cents(original.totalDebit) === debit,
    creditTotalMatches:
      original.totalCredit === null
        ? null
        : cents(original.totalCredit) === credit,
    runningBalancesMatch:
      rows.length && running.length === rows.length
        ? running.every(Boolean)
        : null,
    closingBalanceMatches:
      previous === null || original.closingBalance === null
        ? null
        : previous === cents(original.closingBalance),
  };

  const warnings = [...original.warnings];

  if (
    Object.values(checks).some((value) => {
      return value === false;
    })
  ) {
    warnings.push(
      "The corrected interpretation does not reconcile with the printed statement. Compare the original PDF.",
    );
  }

  if (
    rows.some((row) => {
      return row.date < period.start || row.date > period.end;
    })
  ) {
    warnings.push(
      "Some interpreted dates fall outside the covered period. Compare the original PDF.",
    );
  }

  return {
    ...original,
    rows,
    transactionCount: rows.length,
    calculatedDebit: decimal(debit),
    calculatedCredit: decimal(credit),
    checks,
    warnings: [...new Set(warnings)].slice(0, 50),
    status:
      warnings.length ||
      Object.values(checks).some((value) => {
        return value !== true;
      })
        ? "PARTIAL"
        : "PARSED",
  };
}

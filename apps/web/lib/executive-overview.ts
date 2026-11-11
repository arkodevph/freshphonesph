import type { ExecutiveChartData } from "@freshphones/contracts";

/** Include zero and signed corrections; empty periods never become invented trends. */
export function collectionLines(data: ExecutiveChartData) {
  const values = data.months.flatMap((month) => {
    return [Number(month.verifiedAmount), Number(month.pendingAmount)];
  });

  const low = Math.min(0, ...values);

  const high = Math.max(0, ...values);

  const rawStep = (high - low) / 4;

  const magnitude = rawStep ? 10 ** Math.floor(Math.log10(rawStep)) : 1;

  const normalized = rawStep / magnitude;

  const factor =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  const step = factor * magnitude;

  const minimum = Math.floor(low / step) * step;

  const maximum = Math.ceil(high / step) * step;

  const span = maximum - minimum || 1;

  const barWidth = Math.min(
    24,
    ((476 / Math.max(1, data.months.length)) * 0.64 - 4) / 2,
  );

  const y = (value: number) => {
    return 154 - ((value - minimum) / span) * 132;
  };

  const path = (field: "verifiedAmount" | "pendingAmount") => {
    return data.months
      .map((month, index) => {
        const x = 12 + (index / Math.max(1, data.months.length - 1)) * 476;

        return `${index ? "L" : "M"}${x.toFixed(2)},${y(Number(month[field])).toFixed(2)}`;
      })
      .join(" ");
  };

  return {
    verified: path("verifiedAmount"),
    pending: path("pendingAmount"),
    zero: y(0),
    barWidth,
    ticks: Array.from(
      { length: Math.round((maximum - minimum) / step) + 1 },
      (_, index) => {
        const amount = maximum - index * step;

        return { amount, y: y(amount) };
      },
    ),
    bars: data.months.map((month, index) => {
      const bar = (amount: string) => {
        return {
          y: Math.min(y(0), y(Number(amount))),
          height: Math.abs(y(Number(amount)) - y(0)),
        };
      };

      return {
        x: 12 + ((index + 0.5) / Math.max(1, data.months.length)) * 476,
        verified: bar(month.verifiedAmount),
        pending: bar(month.pendingAmount),
      };
    }),
    empty: values.every((value) => {
      return value === 0;
    }),
  };
}

export function shortMonth(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export function reportingDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

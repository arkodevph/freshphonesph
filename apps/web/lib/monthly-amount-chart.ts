/** A common, signed currency scale for comparing monthly amounts. */
export function monthlyAmountScale(values: readonly number[]) {
  const finite = values.filter(Number.isFinite);

  const extent = Math.max(1, ...finite.map(Math.abs));

  const step = 10 ** Math.floor(Math.log10(extent)) / 2;

  const min = Math.floor(Math.min(0, ...finite) / step) * step;

  const max = Math.ceil(Math.max(0, ...finite) / step) * step;

  const range = max - min || 1;

  const position = (value: number) => {
    return ((value - min) / range) * 100;
  };

  return {
    min,
    max,
    zero: position(0),
    ticks:
      max === min
        ? [0]
        : min < 0 && max > 0
          ? [min, 0, max]
          : [min, (min + max) / 2, max],
    bar(value: number) {
      const safe = Number.isFinite(value) ? value : 0;

      return {
        left: position(Math.min(0, safe)),
        width: (Math.abs(safe) / range) * 100,
      };
    },
  };
}

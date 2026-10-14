export const pesoFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPeso(value: string | number): string {
  return pesoFormat.format(Number(value));
}

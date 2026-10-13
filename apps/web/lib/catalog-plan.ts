// Date-only UTC arithmetic keeps previews independent of the browser's timezone.
export function catalogSampleDate(start: string, dayOffset: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 18000) return null;
  const date = new Date(`${start}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) return null;
  if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return null;
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}
export function catalogSampleDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00.000Z`));
}

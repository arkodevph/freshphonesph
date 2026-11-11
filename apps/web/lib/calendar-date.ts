/** Calendar arithmetic uses UTC internally; values remain local date strings. */
export function calendarValue(date: Date) {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(0);

  date.setUTCFullYear(year, month - 1, day);

  return year >= 1 && year <= 9999 && calendarValue(date) === value
    ? date
    : null;
}

export function moveCalendarDate(value: string, days: number) {
  const date = calendarDate(value);

  if (!date) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
    ? calendarValue(date)
    : value;
}

export function moveCalendarMonth(value: string, months: number) {
  const date = calendarDate(value);

  if (!date) {
    return value;
  }

  const day = date.getUTCDate();

  date.setUTCDate(1);

  date.setUTCMonth(date.getUTCMonth() + months);

  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    return value;
  }

  const last = new Date(date);

  last.setUTCMonth(last.getUTCMonth() + 1, 0);

  date.setUTCDate(Math.min(day, last.getUTCDate()));

  return calendarValue(date);
}

export function calendarDays(month: string) {
  const first = calendarDate(`${month.slice(0, 7)}-01`)!;

  const offset = first.getUTCDay();

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);

    day.setUTCDate(1 - offset + index);

    return day.getUTCFullYear() >= 1 && day.getUTCFullYear() <= 9999
      ? calendarValue(day)
      : "";
  });
}

export function localToday() {
  const date = new Date();

  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

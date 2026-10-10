import type { PortalScheduleItem, PortalSummary } from "./api";

export type MembershipMilestone = {
  key: "joined" | "batch-start" | "batch-end";
  label: string;
  date: string | null;
};

export type MembershipCalendarEvent = {
  id: string;
  date: string;
  label: string;
  kind: "membership" | "installment";
  href?: string;
};

export function calendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null;
}

export function membershipMilestones(summary: Pick<PortalSummary, "joined_at" | "batch_start_date" | "batch_end_date">): MembershipMilestone[] {
  return [
    { key: "joined", label: "Joined", date: calendarDate(summary.joined_at) },
    { key: "batch-start", label: "Batch start", date: calendarDate(summary.batch_start_date) },
    { key: "batch-end", label: "Planned batch end", date: calendarDate(summary.batch_end_date) },
  ];
}

export function membershipCalendarEvents(milestones: MembershipMilestone[], schedule: PortalScheduleItem[]): MembershipCalendarEvent[] {
  const events: MembershipCalendarEvent[] = milestones.flatMap(item => item.date ? [{ id: item.key, date: item.date, label: item.label, kind: "membership" as const }] : []);
  for (const item of schedule) {
    const day = calendarDate(item.due_date);
    if (day) events.push({ id: `installment-${item.sequence_no}`, date: day, label: `Installment ${item.sequence_no} due`, kind: "installment", href: `/portal/schedule#installment-${item.sequence_no}` });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function calendarMonthDays(month: string): string[] {
  const first = calendarDate(`${month}-01`);
  if (!first) return [];
  const date = new Date(`${first}T00:00:00Z`);
  date.setUTCDate(1 - date.getUTCDay());
  return Array.from({ length: 42 }, () => {
    const day = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 1);
    return day;
  });
}

export function moveCalendarDate(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function moveCalendarMonth(day: string, direction: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  const dayOfMonth = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  date.setUTCDate(Math.min(dayOfMonth, end.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

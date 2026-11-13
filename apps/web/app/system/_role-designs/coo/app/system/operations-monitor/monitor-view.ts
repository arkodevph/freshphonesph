import type { MonitorItem, MonitorKind } from "@freshphones/contracts";
export const monitorTabs: { key: MonitorKind; label: string }[] = [
  { key: "all", label: "All items" },
  { key: "missing_receipt", label: "Missing receipts" },
  { key: "incomplete", label: "Incomplete" },
  { key: "overdue", label: "Overdue" },
  { key: "returned", label: "Returned" },
  { key: "follow_up", label: "Follow-ups" },
];

export function waitingAge(value: string, now = Date.now()) {
  const hours = Math.max(0, Math.floor((now - Date.parse(value)) / 3600000));

  return hours < 1
    ? "Less than 1 hour"
    : hours < 24
      ? `${hours}h`
      : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function monitorReasons(item: MonitorItem) {
  return (
    [
      item.missingReceipt ? "Receipt missing" : "",
      item.returned ? "Returned for correction" : "",
      item.overdue ? "Overdue" : "",
      item.followUp?.status === "OPEN" ? "Follow-up open" : "",
    ]
      .filter(Boolean)
      .join(" · ") ||
    (item.stage === "COMPLETE" ? "Review complete" : "Awaiting review")
  );
}

export function localDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export const timestamp = (value: string) => {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const monitorLabels = {
  all: "All items",
  missing_receipt: "Missing receipts",
  incomplete: "Incomplete",
  overdue: "Overdue",
  returned: "Returned",
  follow_up: "Follow-ups",
} as const;

export const monitorDate = timestamp;

export function monitorAge(value: string, now: string) {
  return waitingAge(value, Date.parse(now));
}

export function manilaInput(value: string | null | undefined) {
  return value
    ? new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 16)
    : "";
}

export function manilaDueAt(value: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) {
    throw new Error("Use a valid Philippine date and time.");
  }

  const date = new Date(value + ":00+08:00");

  if (
    !Number.isFinite(date.getTime()) ||
    manilaInput(date.toISOString()) !== value
  ) {
    throw new Error("Use a valid Philippine date and time.");
  }

  return date.toISOString();
}

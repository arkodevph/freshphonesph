export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: string) => {
    return (
      parts.find((item) => {
        return item.type === type;
      })?.value ?? ""
    );
  };

  return `${part("year")}-${part("month")}-${part("day")}`;
}

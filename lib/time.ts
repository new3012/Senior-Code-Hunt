export const TIME_ZONE = "Asia/Bangkok";

export function bangkokDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function releasedDay(startDate: string, total: number, now = new Date()) {
  const today = Date.parse(`${bangkokDate(now)}T00:00:00Z`);
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return Math.max(0, Math.min(total, Math.floor((today - start) / 86400000) + 1));
}

export function millisecondsToBangkokMidnight(now = new Date()) {
  const local = new Date(now.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  const next = new Date(local);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - local.getTime();
}

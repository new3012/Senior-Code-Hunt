export const TIME_ZONE = "Asia/Bangkok";

export function bangkokDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function releasedDay(startDate: string, total: number, now = new Date()) {
  const today = Date.parse(`${bangkokDate(now)}T00:00:00Z`);
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return Math.max(0, Math.min(total, Math.floor((today - start) / 86400000) + 1));
}

export function releasedByOffsets(startDate:string, offsets:number[], now=new Date()){
  const today=Date.parse(`${bangkokDate(now)}T00:00:00Z`);
  const start=Date.parse(`${startDate}T00:00:00Z`);
  const elapsed=Math.max(0,Math.floor((today-start)/86400000));
  return offsets.filter(offset=>offset<=elapsed).length;
}

export function elapsedBangkokDays(startDate:string,now=new Date()){
  const today=Date.parse(`${bangkokDate(now)}T00:00:00Z`);
  const start=Date.parse(`${startDate}T00:00:00Z`);
  return Math.max(0,Math.floor((today-start)/86400000));
}

export function sundayBonusStatus(startDate:string,now=new Date()){
  const start=Date.parse(`${startDate}T00:00:00Z`);
  const bonusDate=new Date(start+5*86400000).toISOString().slice(0,10);
  const unlockAt=Date.parse(`${bonusDate}T18:00:00+07:00`);
  return {unlocked:now.getTime()>=unlockAt,unlockAt,remainingMs:Math.max(0,unlockAt-now.getTime())};
}

export function millisecondsToBangkokMidnight(now = new Date()) {
  const local = new Date(now.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  const next = new Date(local);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - local.getTime();
}

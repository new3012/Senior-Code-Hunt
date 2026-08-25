import type { RowDataPacket } from "mysql2";
import { ensureDb, pool, settings } from "./db";
import { millisecondsToBangkokMidnight, releasedDay } from "./time";

export async function getPlayerState(id: string) {
  await ensureDb();
  const [players] = await pool.execute<RowDataPacket[]>("SELECT id,nickname,recovery_code recoveryCode FROM hunt_players WHERE id=?",[id]);
  if (!players[0]) return null;
  await pool.execute("UPDATE hunt_players SET last_seen_at=NOW() WHERE id=?",[id]);
  const [missions] = await pool.query<RowDataPacket[]>(`SELECT m.*,c.passed_at passedAt FROM hunt_missions m LEFT JOIN hunt_completions c ON c.mission_id=m.id AND c.player_id=? ORDER BY m.day_number`,[id]);
  const { startDate } = await settings();
  const released = releasedDay(startDate, missions.length);
  const completed = missions.filter(m=>m.passedAt).length;
  const current = missions.find(m=>m.day_number<=released && !m.passedAt);
  const latest = missions.filter(m=>m.passedAt).sort((a,b)=>new Date(b.passedAt).getTime()-new Date(a.passedAt).getTime())[0];
  const [pendingRows] = current ? await pool.execute<RowDataPacket[]>("SELECT id FROM hunt_submissions WHERE player_id=? AND mission_id=? AND status='pending'",[id,current.id]) : [[]];
  const clean = (m: RowDataPacket) => ({ id:m.id,day:m.day_number,kind:m.kind,tag:m.tag,title:m.title,task:m.task,snippet:m.snippet,help:m.help_text,clue:m.passedAt?m.clue:null,passedAt:m.passedAt,choices:typeof m.choices_json==="string"?JSON.parse(m.choices_json):m.choices_json??[] });
  return { player:players[0], startDate, released, completed, total:missions.length, current:current?clean(current):null, pendingPhoto:Boolean(pendingRows[0]), latestUnlock:latest?{day:latest.day_number,tag:latest.tag,title:latest.title,clue:latest.clue,passedAt:latest.passedAt}:null, missions:missions.map(clean), nextMidnightMs:millisecondsToBangkokMidnight() };
}

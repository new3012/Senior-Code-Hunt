import type { RowDataPacket } from "mysql2";
import { ensureDb, pool, settings } from "./db";
import { elapsedBangkokDays, millisecondsToBangkokMidnight, releasedByOffsets, sundayBonusStatus } from "./time";

export async function getPlayerState(id: string) {
  await ensureDb();
  const [players] = await pool.execute<RowDataPacket[]>("SELECT id,nickname,recovery_code recoveryCode FROM hunt_players WHERE id=?",[id]);
  if (!players[0]) return null;
  await pool.execute("UPDATE hunt_players SET last_seen_at=NOW() WHERE id=?",[id]);
  const [missions] = await pool.query<RowDataPacket[]>(`SELECT m.*,c.passed_at passedAt FROM hunt_missions m LEFT JOIN hunt_completions c ON c.mission_id=m.id AND c.player_id=? ORDER BY m.day_number`,[id]);
  const { startDate } = await settings();
  const released = releasedByOffsets(startDate,missions.map(m=>Number(m.unlock_offset)));
  const elapsed=elapsedBangkokDays(startDate);
  const completed = missions.filter(m=>m.passedAt).length;
  const current = missions.find(m=>Number(m.unlock_offset)<=elapsed && !m.passedAt);
  const latest = missions.filter(m=>m.passedAt).sort((a,b)=>new Date(b.passedAt).getTime()-new Date(a.passedAt).getTime())[0];
  const [pendingRows] = current ? await pool.execute<RowDataPacket[]>("SELECT id FROM hunt_submissions WHERE player_id=? AND mission_id=? AND status='pending'",[id,current.id]) : [[]];
  const [bonusRows]=await pool.execute<RowDataPacket[]>("SELECT sequence_done sequenceDone,code_done codeDone FROM hunt_bonus_progress WHERE player_id=?",[id]);
  const [finalRows]=await pool.execute<RowDataPacket[]>("SELECT passed_at passedAt FROM hunt_final_completions WHERE player_id=?",[id]);
  const bonusTime=sundayBonusStatus(startDate);
  const clean = (m: RowDataPacket) => ({ id:m.id,day:m.day_number,kind:m.kind,tag:m.tag,title:m.title,task:m.task,snippet:m.snippet,help:m.help_text,clue:m.passedAt?m.clue:null,passedAt:m.passedAt,released:Number(m.unlock_offset)<=elapsed,choices:typeof m.choices_json==="string"?JSON.parse(m.choices_json):m.choices_json??[] });
  return { player:players[0], startDate, released, completed, total:missions.length, current:current?clean(current):null, pendingPhoto:Boolean(pendingRows[0]), latestUnlock:latest?{day:latest.day_number,tag:latest.tag,title:latest.title,clue:latest.clue,passedAt:latest.passedAt}:null, missions:missions.map(clean), nextMidnightMs:millisecondsToBangkokMidnight(),bonus:{...bonusTime,sequenceDone:Boolean(bonusRows[0]?.sequenceDone),codeDone:Boolean(bonusRows[0]?.codeDone)},finalAvailable:completed===missions.length&&!finalRows[0],finalCompleted:Boolean(finalRows[0]) };
}

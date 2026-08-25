import type { RowDataPacket } from "mysql2";
import { unlink } from "node:fs/promises"; import path from "node:path";
import { NextResponse } from "next/server"; import { ensureDb,pool,settings } from "@/lib/db"; import { isAdmin } from "@/lib/session";
export const dynamic="force-dynamic";
export async function GET(){if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});await ensureDb();
  const [expired]=await pool.query<RowDataPacket[]>("SELECT id,evidence_path FROM hunt_completions WHERE evidence_path IS NOT NULL AND passed_at < NOW()-INTERVAL 7 DAY");
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt"; for(const row of expired){await unlink(path.join(dir,row.evidence_path)).catch(()=>{});await pool.execute("UPDATE hunt_completions SET evidence_path=NULL WHERE id=?",[row.id]);}
  const [players]=await pool.query<RowDataPacket[]>(`SELECT p.id,p.nickname,p.recovery_code recoveryCode,p.created_at createdAt,p.last_seen_at lastSeenAt,COUNT(c.id) completed FROM hunt_players p LEFT JOIN hunt_completions c ON c.player_id=p.id GROUP BY p.id ORDER BY p.created_at`);
  const [missions]=await pool.query<RowDataPacket[]>("SELECT id,day_number day,kind,tag,title,task,snippet,answer,help_text help,clue,photo_prompt photoPrompt,choices_json choices FROM hunt_missions ORDER BY day_number");
  const [completions]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.player_id playerId,p.nickname,m.day_number day,m.title,c.method,c.ai_result aiResult,c.evidence_path evidencePath,c.passed_at passedAt FROM hunt_completions c JOIN hunt_players p ON p.id=c.player_id JOIN hunt_missions m ON m.id=c.mission_id ORDER BY c.passed_at DESC`);
  const [submissions]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.player_id playerId,s.mission_id missionId,p.nickname,m.day_number day,m.title,s.evidence_path evidencePath,s.submitted_at submittedAt FROM hunt_submissions s JOIN hunt_players p ON p.id=s.player_id JOIN hunt_missions m ON m.id=s.mission_id WHERE s.status='pending' ORDER BY s.submitted_at`);
  return NextResponse.json({players,missions,completions,submissions,startDate:(await settings()).startDate});}

export async function PATCH(request:Request){if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});await ensureDb();const body=await request.json();
  if(body.startDate){await pool.execute("UPDATE hunt_settings SET start_date=? WHERE id=1",[body.startDate]);return NextResponse.json({ok:true});}
  const allowed=["title","task","snippet","answer","help_text","clue","photo_prompt","choices_json"] as const; const key=allowed.includes(body.field)?body.field:null;
  if(!key)return NextResponse.json({error:"invalid field"},{status:400}); const value=key==="choices_json"?JSON.stringify(body.value):body.value;
  await pool.execute(`UPDATE hunt_missions SET ${key}=? WHERE id=?`,[value,Number(body.id)]);return NextResponse.json({ok:true});}

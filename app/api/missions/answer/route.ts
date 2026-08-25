import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { ensureDb, pool, settings } from "@/lib/db";
import { playerId } from "@/lib/session";
import { releasedByOffsets } from "@/lib/time";

const normalize=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLocaleUpperCase("th-TH").replace(/\s+/g,"");
export async function POST(request:Request){
  const id=await playerId(); if(!id)return NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401});
  await ensureDb(); const {missionId,answer}=await request.json();
  const [missions]=await pool.execute<RowDataPacket[]>("SELECT * FROM hunt_missions ORDER BY day_number");
  const mission=missions.find(m=>Number(m.id)===Number(missionId));
  const [done]=await pool.execute<RowDataPacket[]>("SELECT mission_id FROM hunt_completions WHERE player_id=?",[id]);
  const next=missions.find(m=>!done.some(d=>d.mission_id===m.id));
  const released=releasedByOffsets((await settings()).startDate,missions.map(m=>Number(m.unlock_offset)));
  if(!mission||mission.kind==="photo"||next?.id!==mission.id||mission.day_number>released)return NextResponse.json({error:"ยังไม่ถึงภารกิจนี้"},{status:409});
  if(normalize(answer)!==normalize(mission.answer))return NextResponse.json({ok:false,error:"คำตอบยังไม่ถูก ลองดูคำใบ้ช่วยอีกครั้ง"},{status:400});
  await pool.execute("INSERT IGNORE INTO hunt_completions(player_id,mission_id,method) VALUES(?,?,'answer')",[id,mission.id]);
  return NextResponse.json({ok:true,clue:mission.clue});
}

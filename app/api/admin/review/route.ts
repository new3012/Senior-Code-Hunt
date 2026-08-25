import type { RowDataPacket } from "mysql2";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ensureDb,pool } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export async function POST(request:Request){
  if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});
  await ensureDb(); const {submissionId,action}=await request.json();
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT * FROM hunt_submissions WHERE id=? AND status='pending'",[Number(submissionId)]); const item=rows[0];
  if(!item)return NextResponse.json({error:"ไม่พบรูปที่รอตรวจ"},{status:404});
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt";
  if(action==="approve"){
    await pool.execute("INSERT IGNORE INTO hunt_completions(player_id,mission_id,method,evidence_path) VALUES(?,?,'manual_photo',?)",[item.player_id,item.mission_id,item.evidence_path]);
    await pool.execute("DELETE FROM hunt_submissions WHERE id=?",[item.id]);
  }else if(action==="reject"){
    await unlink(path.join(dir,path.basename(item.evidence_path))).catch(()=>{});
    await pool.execute("DELETE FROM hunt_submissions WHERE id=?",[item.id]);
  }else return NextResponse.json({error:"invalid action"},{status:400});
  return NextResponse.json({ok:true});
}

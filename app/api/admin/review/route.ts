import type { RowDataPacket } from "mysql2";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ensureDb,pool } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export async function POST(request:Request){
  if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});
  await ensureDb(); const {submissionId,action,reason}=await request.json();
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT * FROM hunt_submissions WHERE id=? AND status='pending'",[Number(submissionId)]); const item=rows[0];
  if(!item)return NextResponse.json({error:"ไม่พบรูปที่รอตรวจ"},{status:404});
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt";
  if(action==="approve"){
    await pool.execute("INSERT IGNORE INTO hunt_completions(player_id,mission_id,method,evidence_path) VALUES(?,?,'manual_photo',?)",[item.player_id,item.mission_id,item.evidence_path]);
    await pool.execute("INSERT INTO hunt_review_history(player_id,mission_id,action) VALUES(?,?,\'approved\')",[item.player_id,item.mission_id]);
    await pool.execute("DELETE FROM hunt_submissions WHERE id=?",[item.id]);
  }else if(action==="reject"){
    const cleanReason=String(reason??"").trim();
    if(cleanReason.length<3)return NextResponse.json({error:"กรุณาระบุเหตุผลที่ไม่ผ่าน"},{status:400});
    if(cleanReason.length>500)return NextResponse.json({error:"เหตุผลยาวเกินไป"},{status:400});
    await unlink(path.join(dir,path.basename(item.evidence_path))).catch(()=>{});
    await pool.execute("UPDATE hunt_submissions SET status='rejected',rejection_reason=?,reviewed_at=NOW() WHERE id=?",[cleanReason,item.id]);
    await pool.execute("INSERT INTO hunt_review_history(player_id,mission_id,action,reason) VALUES(?,?,\'rejected\',?)",[item.player_id,item.mission_id,cleanReason]);
  }else return NextResponse.json({error:"invalid action"},{status:400});
  return NextResponse.json({ok:true});
}

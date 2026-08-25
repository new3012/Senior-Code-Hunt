import type { RowDataPacket } from "mysql2";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { ensureDb, pool, settings } from "@/lib/db";
import { playerId } from "@/lib/session";
import { releasedDay } from "@/lib/time";

export const runtime="nodejs";
export async function POST(request:Request){
  const player=await playerId(); if(!player)return NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401});
  const form=await request.formData(), missionId=Number(form.get("missionId")), file=form.get("photo");
  if(!(file instanceof File)||file.size>6*1024*1024||!file.type.startsWith("image/"))return NextResponse.json({error:"กรุณาใช้ไฟล์รูปไม่เกิน 6 MB"},{status:400});
  await ensureDb(); const [missions]=await pool.query<RowDataPacket[]>("SELECT * FROM hunt_missions ORDER BY day_number");
  const [done]=await pool.execute<RowDataPacket[]>("SELECT mission_id FROM hunt_completions WHERE player_id=?",[player]);
  const mission=missions.find(m=>m.id===missionId), next=missions.find(m=>!done.some(d=>d.mission_id===m.id));
  if(!mission||mission.kind!=="photo"||next?.id!==mission.id||mission.day_number>releasedDay((await settings()).startDate,missions.length))return NextResponse.json({error:"ยังไม่ถึงภารกิจนี้"},{status:409});
  const [existing]=await pool.execute<RowDataPacket[]>("SELECT id,evidence_path,status FROM hunt_submissions WHERE player_id=? AND mission_id=?",[player,mission.id]);
  if(existing[0]?.status==="pending")return NextResponse.json({error:"รูปนี้กำลังรอนิวตรวจอยู่"},{status:409});
  const processed=await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({width:1280,height:1280,fit:"inside",withoutEnlargement:true}).jpeg({quality:82}).toBuffer();
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt"; await mkdir(dir,{recursive:true});
  if(existing[0]?.evidence_path)await unlink(path.join(dir,path.basename(existing[0].evidence_path))).catch(()=>{});
  const filename=`${player}-${mission.id}-${Date.now()}.jpg`; await writeFile(path.join(dir,filename),processed,{mode:0o600});
  await pool.execute(`INSERT INTO hunt_submissions(player_id,mission_id,evidence_path,status,submitted_at,reviewed_at) VALUES(?,?,?,'pending',NOW(),NULL) ON DUPLICATE KEY UPDATE evidence_path=VALUES(evidence_path),status='pending',submitted_at=NOW(),reviewed_at=NULL`,[player,mission.id,filename]);
  return NextResponse.json({ok:true,pending:true});
}

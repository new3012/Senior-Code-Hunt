import type { RowDataPacket } from "mysql2";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";
import { ensureDb, pool, settings } from "@/lib/db";
import { playerId } from "@/lib/session";
import { releasedDay } from "@/lib/time";

export const runtime="nodejs";
export async function POST(request:Request){
  const player=await playerId(); if(!player)return NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"ผู้ดูแลยังไม่ได้ตั้งค่า AI"},{status:503});
  const form=await request.formData(), missionId=Number(form.get("missionId")), file=form.get("photo");
  if(!(file instanceof File)||file.size>6*1024*1024||!file.type.startsWith("image/"))return NextResponse.json({error:"กรุณาใช้ไฟล์รูปไม่เกิน 6 MB"},{status:400});
  await ensureDb(); const [missions]=await pool.query<RowDataPacket[]>("SELECT * FROM hunt_missions ORDER BY day_number");
  const [done]=await pool.execute<RowDataPacket[]>("SELECT mission_id FROM hunt_completions WHERE player_id=?",[player]);
  const mission=missions.find(m=>m.id===missionId), next=missions.find(m=>!done.some(d=>d.mission_id===m.id));
  if(!mission||mission.kind!=="photo"||next?.id!==mission.id||mission.day_number>releasedDay((await settings()).startDate,missions.length))return NextResponse.json({error:"ยังไม่ถึงภารกิจนี้"},{status:409});
  const processed=await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({width:1280,height:1280,fit:"inside",withoutEnlargement:true}).jpeg({quality:82}).toBuffer();
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await openai.responses.create({model:process.env.OPENAI_VISION_MODEL??"gpt-4o-mini",input:[{role:"user",content:[{type:"input_text",text:`Check only whether this photo follows the task. Never identify the person, infer identity, or compare faces. Task: ${mission.photo_prompt}`},{type:"input_image",image_url:`data:image/jpeg;base64,${processed.toString("base64")}`,detail:"low"}]}],text:{format:{type:"json_schema",name:"photo_check",strict:true,schema:{type:"object",properties:{passed:{type:"boolean"},confidence:{type:"integer",minimum:0,maximum:100},reason:{type:"string"}},required:["passed","confidence","reason"],additionalProperties:false}}}});
  const result=JSON.parse(response.output_text) as {passed:boolean;confidence:number;reason:string};
  if(!result.passed)return NextResponse.json({ok:false,error:result.reason,confidence:result.confidence},{status:400});
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt"; await mkdir(dir,{recursive:true});
  const filename=`${player}-${mission.id}-${Date.now()}.jpg`; await writeFile(path.join(dir,filename),processed,{mode:0o600});
  await pool.execute("INSERT IGNORE INTO hunt_completions(player_id,mission_id,method,evidence_path,ai_result) VALUES(?,?,'ai_photo',?,?)",[player,mission.id,filename,JSON.stringify(result)]);
  return NextResponse.json({ok:true,clue:mission.clue,confidence:result.confidence});
}

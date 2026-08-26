import type { RowDataPacket } from "mysql2";
import { unlink } from "node:fs/promises"; import path from "node:path";
import { NextResponse } from "next/server"; import { ensureDb,pool,settings } from "@/lib/db"; import { isAdmin } from "@/lib/session"; import { elapsedBangkokDays,sundayBonusStatus } from "@/lib/time";
export const dynamic="force-dynamic";
export async function GET(){if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});await ensureDb();
  const [expired]=await pool.query<RowDataPacket[]>("SELECT id,evidence_path FROM hunt_completions WHERE evidence_path IS NOT NULL AND passed_at < NOW()-INTERVAL 7 DAY");
  const dir=process.env.PRIVATE_UPLOAD_DIR??"/home/discordbot/private/senior-code-hunt"; for(const row of expired){await unlink(path.join(dir,row.evidence_path)).catch(()=>{});await pool.execute("UPDATE hunt_completions SET evidence_path=NULL WHERE id=?",[row.id]);}
  const [players]=await pool.query<RowDataPacket[]>(`SELECT p.id,p.nickname,p.recovery_code recoveryCode,p.created_at createdAt,p.last_seen_at lastSeenAt,COUNT(c.id) completed FROM hunt_players p LEFT JOIN hunt_completions c ON c.player_id=p.id GROUP BY p.id ORDER BY p.created_at`);
  const [missions]=await pool.query<RowDataPacket[]>("SELECT id,day_number day,unlock_offset unlockOffset,kind,tag,title,task,snippet,answer,help_text help,clue,photo_prompt photoPrompt,choices_json choices FROM hunt_missions ORDER BY day_number");
  const [completions]=await pool.query<RowDataPacket[]>(`SELECT c.id,c.player_id playerId,p.nickname,m.day_number day,m.title,c.method,c.ai_result aiResult,c.evidence_path evidencePath,c.passed_at passedAt FROM hunt_completions c JOIN hunt_players p ON p.id=c.player_id JOIN hunt_missions m ON m.id=c.mission_id ORDER BY c.passed_at DESC`);
  const [submissions]=await pool.query<RowDataPacket[]>(`SELECT s.id,s.player_id playerId,s.mission_id missionId,p.nickname,m.day_number day,m.title,s.evidence_path evidencePath,s.submitted_at submittedAt FROM hunt_submissions s JOIN hunt_players p ON p.id=s.player_id JOIN hunt_missions m ON m.id=s.mission_id WHERE s.status='pending' ORDER BY s.submitted_at`);
  const [reviews]=await pool.query<RowDataPacket[]>(`SELECT h.id,p.nickname,m.day_number day,m.title,h.action,h.reason,h.reviewed_at reviewedAt FROM hunt_review_history h JOIN hunt_players p ON p.id=h.player_id JOIN hunt_missions m ON m.id=h.mission_id ORDER BY h.reviewed_at DESC LIMIT 100`);
  const appSettings=await settings();
  const elapsed=elapsedBangkokDays(appSettings.startDate);
  const editableMissions=missions.map(m=>({...m,editable:Number(m.unlockOffset)>=elapsed}));
  const specialEditable=!sundayBonusStatus(appSettings.startDate,appSettings.bonusUnlockTime).unlocked;
  return NextResponse.json({players,missions:editableMissions,completions,submissions,reviews,startDate:appSettings.startDate,bonusClue:appSettings.bonusClue,bonusTitle:appSettings.bonusTitle,bonusUnlockTime:appSettings.bonusUnlockTime,bonusSequenceRounds:Number(appSettings.bonusSequenceRounds||8),bonusCodeAttempts:Number(appSettings.bonusCodeAttempts||5),specialEditable,finalTitle:appSettings.finalTitle,finalTask:appSettings.finalTask,finalAnswer:appSettings.finalAnswer,finalHelp:appSettings.finalHelp,finalChoices:typeof appSettings.finalChoices==="string"?JSON.parse(appSettings.finalChoices):appSettings.finalChoices??[]});}

export async function PATCH(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});
 await ensureDb();
 const body=await request.json();
 const appSettings=await settings();

 if(body.startDate){
  await pool.execute("UPDATE hunt_settings SET start_date=? WHERE id=1",[body.startDate]);
  return NextResponse.json({ok:true});
 }

 if(body.specialSettings){
  if(sundayBonusStatus(appSettings.startDate,appSettings.bonusUnlockTime).unlocked)return NextResponse.json({error:"ภารกิจพิเศษเปิดแล้ว จึงแก้ไขไม่ได้"},{status:409});
  const s=body.specialSettings;
  const title=String(s.title??"").trim(),clue=String(s.clue??"").trim(),unlockTime=String(s.unlockTime??"").trim();
  const sequenceRounds=Number(s.sequenceRounds),codeAttempts=Number(s.codeAttempts);
  if(!title||title.length>160)return NextResponse.json({error:"ชื่อภารกิจพิเศษต้องมี 1-160 ตัวอักษร"},{status:400});
  if(!clue||clue.length>1000)return NextResponse.json({error:"คำใบ้พิเศษต้องมี 1-1000 ตัวอักษร"},{status:400});
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(unlockTime))return NextResponse.json({error:"เวลาเปิดไม่ถูกต้อง"},{status:400});
  if(!Number.isInteger(sequenceRounds)||sequenceRounds<3||sequenceRounds>12)return NextResponse.json({error:"จำนวนด่านต้องอยู่ระหว่าง 3-12"},{status:400});
  if(!Number.isInteger(codeAttempts)||codeAttempts<1||codeAttempts>20)return NextResponse.json({error:"จำนวนครั้งแกะรหัสต้องอยู่ระหว่าง 1-20"},{status:400});
  await pool.execute("UPDATE hunt_settings SET bonus_title=?,bonus_unlock_time=?,bonus_sequence_rounds=?,bonus_code_attempts=?,bonus_clue=? WHERE id=1",[title,unlockTime,sequenceRounds,codeAttempts,clue]);
  return NextResponse.json({ok:true});
 }

 if(body.finalSettings){
  const s=body.finalSettings;
  const title=String(s.title??"").trim(),task=String(s.task??"").trim(),answer=String(s.answer??"").trim(),help=String(s.help??"").trim();
  const choices=Array.isArray(s.choices)?s.choices.map((v:unknown)=>String(v).trim()).filter(Boolean):[];
  if(!title||title.length>160)return NextResponse.json({error:"ชื่อปัญหาเชาว์ต้องมี 1-160 ตัวอักษร"},{status:400});
  if(!task||task.length>2000)return NextResponse.json({error:"โจทย์ปัญหาเชาว์ต้องมี 1-2000 ตัวอักษร"},{status:400});
  if(!answer||answer.length>160)return NextResponse.json({error:"คำตอบต้องมี 1-160 ตัวอักษร"},{status:400});
  if(!help||help.length>1000)return NextResponse.json({error:"คำใบ้ช่วยต้องมี 1-1000 ตัวอักษร"},{status:400});
  if(choices.length<2||choices.length>12)return NextResponse.json({error:"Final ต้องมี 2-12 ตัวเลือก"},{status:400});
  if(!choices.includes(answer))return NextResponse.json({error:"คำตอบต้องตรงกับหนึ่งในตัวเลือก"},{status:400});
  await pool.execute("UPDATE hunt_settings SET final_title=?,final_task=?,final_answer=?,final_help=?,final_choices_json=? WHERE id=1",[title,task,answer,help,JSON.stringify(choices)]);
  return NextResponse.json({ok:true});
 }

 if(body.missionId&&body.fields&&typeof body.fields==="object"){
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT id,unlock_offset FROM hunt_missions WHERE id=?",[Number(body.missionId)]);
  if(!rows[0])return NextResponse.json({error:"ไม่พบภารกิจ"},{status:404});
  const elapsed=elapsedBangkokDays(appSettings.startDate);
  if(Number(rows[0].unlock_offset)<elapsed)return NextResponse.json({error:"ภารกิจของวันก่อนหน้าแก้ไขไม่ได้"},{status:409});
  const allowed=["title","task","snippet","answer","help_text","clue"] as const;
  for(const key of allowed){
   if(Object.prototype.hasOwnProperty.call(body.fields,key)){
    const value=body.fields[key];
    await pool.execute(`UPDATE hunt_missions SET ${key}=? WHERE id=?`,[value===""?null:value,Number(body.missionId)]);
   }
  }
  if(Object.prototype.hasOwnProperty.call(body.fields,"choices_json")){
    const choices=Array.isArray(body.fields.choices_json)?body.fields.choices_json.map((v:unknown)=>String(v).trim()).filter(Boolean):[];
    if(choices.length<2||choices.length>12)return NextResponse.json({error:"ภารกิจแบบตัวเลือกต้องมี 2-12 ตัวเลือก"},{status:400});
    if(choices.some((v:string)=>v.length>160))return NextResponse.json({error:"แต่ละตัวเลือกยาวได้สูงสุด 160 ตัวอักษร"},{status:400});
    await pool.execute("UPDATE hunt_missions SET choices_json=? WHERE id=?",[JSON.stringify(choices),Number(body.missionId)]);
  }
  return NextResponse.json({ok:true});
 }

 return NextResponse.json({error:"invalid request"},{status:400});
}

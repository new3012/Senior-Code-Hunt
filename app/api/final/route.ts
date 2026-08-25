import type {RowDataPacket} from "mysql2";
import {NextResponse} from "next/server";
import {ensureDb,pool} from "@/lib/db";
import {playerId} from "@/lib/session";

const normalize=(v:unknown)=>String(v??"").normalize("NFKC").trim().replace(/\s+/g,"");
export async function POST(request:Request){
  const id=await playerId();
  if(!id)return NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401});
  await ensureDb();
  const [counts]=await pool.execute<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM hunt_missions) total,(SELECT COUNT(*) FROM hunt_completions WHERE player_id=?) completed",[id]);
  if(Number(counts[0].completed)!==Number(counts[0].total))return NextResponse.json({error:"ต้องผ่าน DAY 9 ก่อน"},{status:409});
  const {answer}=await request.json();
  if(normalize(answer)!=="เงา")return NextResponse.json({error:"ยังไม่ถูก ลองคิดถึงสิ่งที่ตามเราไปเมื่อมีแสง"},{status:400});
  await pool.execute("INSERT IGNORE INTO hunt_final_completions(player_id) VALUES(?)",[id]);
  return NextResponse.json({ok:true});
}

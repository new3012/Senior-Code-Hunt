import {NextResponse} from "next/server";
import {ensureDb,pool,settings} from "@/lib/db";
import {playerId} from "@/lib/session";
import {sundayBonusStatus} from "@/lib/time";

export async function POST(request:Request){
  const id=await playerId();
  if(!id)return NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401});
  await ensureDb();
  if(!sundayBonusStatus((await settings()).startDate).unlocked)return NextResponse.json({error:"ภารกิจลับยังไม่เปิด"},{status:409});
  const {stage}=await request.json();
  await pool.execute("INSERT IGNORE INTO hunt_bonus_progress(player_id) VALUES(?)",[id]);
  if(stage==="sequence")await pool.execute("UPDATE hunt_bonus_progress SET sequence_done=TRUE WHERE player_id=?",[id]);
  else if(stage==="code"){
    const [rows]=await pool.execute<import("mysql2").RowDataPacket[]>("SELECT sequence_done FROM hunt_bonus_progress WHERE player_id=?",[id]);
    if(!rows[0]?.sequence_done)return NextResponse.json({error:"ต้องผ่านเกมจำลำดับไฟก่อน"},{status:409});
    await pool.execute("UPDATE hunt_bonus_progress SET code_done=TRUE WHERE player_id=?",[id]);
  }else return NextResponse.json({error:"ไม่พบด่าน"},{status:400});
  return NextResponse.json({ok:true});
}

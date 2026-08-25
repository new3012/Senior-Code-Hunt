import {randomInt} from "node:crypto";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import type {RowDataPacket} from "mysql2";
import {ensureDb,pool,settings} from "@/lib/db";
import {cookieOptions,makeToken,playerId,readToken} from "@/lib/session";
import {sundayBonusStatus} from "@/lib/time";

const BONUS_COOKIE="hunt_bonus_code";
function makeSecret(){const poolDigits=[0,1,2,3,4,5,6,7,8,9],out:string[]=[];while(out.length<4){const i=randomInt(poolDigits.length);out.push(String(poolDigits.splice(i,1)[0]))}return out.join("")}
function feedback(guess:string,secret:string){return guess.split("").map((d,i)=>secret[i]===d?"exact":secret.includes(d)?"near":"miss")}
async function requireBonusPlayer(){
 const id=await playerId();
 if(!id)return {error:NextResponse.json({error:"กรุณาเริ่มภารกิจก่อน"},{status:401})};
 await ensureDb();
 const appSettings=await settings();
 if(!sundayBonusStatus(appSettings.startDate,appSettings.bonusUnlockTime).unlocked)return {error:NextResponse.json({error:"ภารกิจลับยังไม่เปิด"},{status:409})};
 return {id};
}
export async function POST(request:Request){
 const access=await requireBonusPlayer();if("error" in access)return access.error;const id=access.id;
 const body=await request.json();
 await pool.execute("INSERT IGNORE INTO hunt_bonus_progress(player_id) VALUES(?)",[id]);
 if(body.stage==="sequence"){
  await pool.execute("UPDATE hunt_bonus_progress SET sequence_done=TRUE WHERE player_id=?",[id]);
  return NextResponse.json({ok:true});
 }
 if(body.action==="start-code"){
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT sequence_done,code_done FROM hunt_bonus_progress WHERE player_id=?",[id]);
  if(!rows[0]?.sequence_done)return NextResponse.json({error:"ต้องผ่านเกมจำลำดับไฟก่อน"},{status:409});
  if(rows[0]?.code_done)return NextResponse.json({ok:true,complete:true});
  const jar=await cookies();
  const current=readToken(jar.get(BONUS_COOKIE)?.value);
  if(current?.playerId!==id||typeof current?.secret!=="string")jar.set(BONUS_COOKIE,makeToken({playerId:id,secret:makeSecret(),attempts:0}),{...cookieOptions,maxAge:60*60*6});
  return NextResponse.json({ok:true});
 }
 if(body.action==="guess-code"){
  if(!/^\d{4}$/.test(body.guess)||new Set(String(body.guess)).size!==4)return NextResponse.json({error:"กรอกรหัส 4 หลักที่ไม่ซ้ำกัน"},{status:400});
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT sequence_done,code_done FROM hunt_bonus_progress WHERE player_id=?",[id]);
  if(!rows[0]?.sequence_done)return NextResponse.json({error:"ต้องผ่านเกมจำลำดับไฟก่อน"},{status:409});
  if(rows[0]?.code_done)return NextResponse.json({ok:true,complete:true,feedback:["exact","exact","exact","exact"],remaining:0});
  const jar=await cookies();
  let token=readToken(jar.get(BONUS_COOKIE)?.value);
  if(token?.playerId!==id||typeof token?.secret!=="string"){
   token={playerId:id,secret:makeSecret(),attempts:0};
  }
  const secret=String(token.secret),result=feedback(String(body.guess),secret),attempts=Number(token.attempts??0)+1;
  const maxAttempts=Math.max(1,Math.min(20,Number((await settings()).bonusCodeAttempts||5)));
  if(result.every(v=>v==="exact")){
   await pool.execute("UPDATE hunt_bonus_progress SET code_done=TRUE WHERE player_id=?",[id]);
   jar.delete(BONUS_COOKIE);
   return NextResponse.json({ok:true,complete:true,feedback:result,remaining:0});
  }
  if(attempts>=maxAttempts){jar.set(BONUS_COOKIE,makeToken({playerId:id,secret:makeSecret(),attempts:0}),{...cookieOptions,maxAge:60*60*6});return NextResponse.json({ok:true,complete:false,feedback:result,remaining:maxAttempts,reset:true})}
  jar.set(BONUS_COOKIE,makeToken({playerId:id,secret,attempts}),{...cookieOptions,maxAge:60*60*6});
  return NextResponse.json({ok:true,complete:false,feedback:result,remaining:maxAttempts-attempts,reset:false});
 }
 return NextResponse.json({error:"ไม่พบด่าน"},{status:400});
}

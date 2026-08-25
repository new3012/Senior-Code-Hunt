import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieOptions, makeToken } from "@/lib/session";

const attempts=new Map<string,{count:number;until:number}>();
export async function POST(request:Request){
  if(!process.env.SESSION_SECRET)return NextResponse.json({error:"พี่รหัสยังไม่ได้ตั้งค่า SESSION_SECRET"},{status:503});
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown", now=Date.now(), item=attempts.get(ip);
  if(item&&item.count>=5&&item.until>now)return NextResponse.json({error:"ลองใหม่อีกครั้งใน 15 นาที"},{status:429});
  const {password}=await request.json(); const hash=process.env.ADMIN_PASSWORD_HASH;
  if(!hash||!(await bcrypt.compare(String(password??""),hash))){attempts.set(ip,{count:(item?.count??0)+1,until:now+15*60_000});return NextResponse.json({error:"รหัสผ่านไม่ถูกต้อง"},{status:401});}
  attempts.delete(ip); (await cookies()).set("hunt_admin",makeToken({role:"admin",exp:now+12*60*60_000}),{...cookieOptions,maxAge:12*60*60});
  return NextResponse.json({ok:true});
}

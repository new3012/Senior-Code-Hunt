import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureDb, pool } from "@/lib/db";
import { cookieOptions, makeToken, recoveryCode } from "@/lib/session";

export async function POST(request: Request) {
  await ensureDb();
  const { nickname } = await request.json();
  const name = String(nickname ?? "").trim().slice(0,40);
  if (name.length < 1) return NextResponse.json({error:"กรุณาใส่ชื่อเล่น"},{status:400});
  const id=randomUUID(), recovery=recoveryCode();
  await pool.execute("INSERT INTO hunt_players(id,nickname,recovery_code) VALUES(?,?,?)",[id,name,recovery]);
  (await cookies()).set("hunt_player",makeToken({playerId:id}),cookieOptions);
  return NextResponse.json({ok:true});
}

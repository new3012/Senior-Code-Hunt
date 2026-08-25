import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureDb, pool } from "@/lib/db";
import { cookieOptions, makeToken } from "@/lib/session";

export async function POST(request: Request) {
  await ensureDb();
  const { code } = await request.json();
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT id FROM hunt_players WHERE recovery_code=?",[String(code??"").trim().toUpperCase()]);
  if(!rows[0]) return NextResponse.json({error:"ไม่พบรหัสกู้คืน"},{status:404});
  (await cookies()).set("hunt_player",makeToken({playerId:rows[0].id}),cookieOptions);
  return NextResponse.json({ok:true});
}

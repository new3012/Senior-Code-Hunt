import { NextResponse } from "next/server";
import { ensureDb,pool } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export async function DELETE(request:Request){
  if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});
  await ensureDb();
  const {playerId,reset,deletePlayer}=await request.json();
  if(typeof playerId!=="string"||!playerId)return NextResponse.json({error:"playerId required"},{status:400});

  if(reset){
    await pool.execute("DELETE FROM hunt_completions WHERE player_id=?",[playerId]);
    await pool.execute("DELETE FROM hunt_submissions WHERE player_id=?",[playerId]);
    await pool.execute("DELETE FROM hunt_bonus_progress WHERE player_id=?",[playerId]);
    await pool.execute("DELETE FROM hunt_final_completions WHERE player_id=?",[playerId]);
    return NextResponse.json({ok:true,action:"reset"});
  }

  if(deletePlayer){
    const [result]=await pool.execute("DELETE FROM hunt_players WHERE id=?",[playerId]);
    const affected="affectedRows" in result?Number(result.affectedRows):0;
    if(!affected)return NextResponse.json({error:"ไม่พบผู้เล่น"},{status:404});
    return NextResponse.json({ok:true,action:"deleted"});
  }

  return NextResponse.json({error:"invalid action"},{status:400});
}

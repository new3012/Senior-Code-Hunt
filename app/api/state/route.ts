import { NextResponse } from "next/server";
import { playerId } from "@/lib/session";
import { getPlayerState } from "@/lib/state";

export const dynamic="force-dynamic";
export async function GET(){
  const id=await playerId();
  if(!id) return NextResponse.json({registered:false});
  const state=await getPlayerState(id);
  return NextResponse.json(state?{registered:true,...state}:{registered:false});
}

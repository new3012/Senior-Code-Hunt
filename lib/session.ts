import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const secret = () => process.env.SESSION_SECRET ?? "change-this-in-production";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export function makeToken(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function readToken(token?: string) {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>; } catch { return null; }
}
export async function playerId() { return readToken((await cookies()).get("hunt_player")?.value)?.playerId as string | undefined; }
export async function isAdmin() { const p = readToken((await cookies()).get("hunt_admin")?.value); return p?.role === "admin" && Number(p.exp) > Date.now(); }
export const recoveryCode = () => randomBytes(6).toString("base64url").toUpperCase().replace(/[-_]/g,"A").slice(0,8);
export const cookieOptions = { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax" as const, path:"/", maxAge:60*60*24*365 };

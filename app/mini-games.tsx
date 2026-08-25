"use client";
import {useEffect,useMemo,useRef,useState} from "react";

type Props={testMode?:boolean;initialSequenceDone?:boolean;initialCodeDone?:boolean;onSaved?:()=>void};
const COLORS=["เขียว","ฟ้า","ส้ม","ชมพู"];

export default function MiniGames({testMode=false,initialSequenceDone=false,initialCodeDone=false,onSaved}:Props){
 const [sequenceDone,setSequenceDone]=useState(initialSequenceDone),[codeDone,setCodeDone]=useState(initialCodeDone),[round,setRound]=useState(1),[sequence,setSequence]=useState<number[]>([]),[active,setActive]=useState<number|null>(null),[inputAt,setInputAt]=useState(0),[playing,setPlaying]=useState(false),[message,setMessage]=useState("กดเริ่มเพื่อดูไฟ"),[guess,setGuess]=useState(""),[attempts,setAttempts]=useState<Array<{guess:string;exact:number;near:number}>>([]),[secret,setSecret]=useState("");
 const timers=useRef<number[]>([]);
 const createSecret=()=>{const digits=[0,1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-.5);return digits.slice(0,4).join("")};
 useEffect(()=>{setSecret(createSecret());const activeTimers=timers.current;return()=>activeTimers.forEach(clearTimeout)},[]);
 const save=async(stage:"sequence"|"code")=>{if(!testMode)await fetch("/api/bonus",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({stage})});onSaved?.()};
 const showSequence=(next:number[])=>{setPlaying(true);setInputAt(0);setMessage("จำลำดับให้ดี...");next.forEach((color,i)=>{timers.current.push(window.setTimeout(()=>setActive(color),500+i*650));timers.current.push(window.setTimeout(()=>setActive(null),900+i*650))});timers.current.push(window.setTimeout(()=>{setPlaying(false);setMessage("กดสีตามลำดับ")},next.length*650+500))};
 const startRound=()=>{
  // Randomness is intentionally generated only after the player presses the button.
  // eslint-disable-next-line react-hooks/purity
  const next=[...sequence,Math.floor(Math.random()*4)];setSequence(next);showSequence(next)
 };
 const tap=(color:number)=>{if(playing||!sequence.length)return;if(sequence[inputAt]!==color){setInputAt(0);setMessage("ผิด ลองรอบนี้ใหม่");showSequence(sequence);return}const nextAt=inputAt+1;if(nextAt===sequence.length){if(round>=8){setSequenceDone(true);setMessage("ผ่านเกมจำลำดับไฟแล้ว");save("sequence")}else{setRound(v=>v+1);setInputAt(0);setMessage("ผ่านรอบนี้แล้ว กดเริ่มรอบต่อไป")}return}setInputAt(nextAt)};
 const checkCode=()=>{if(!/^\d{4}$/.test(guess)||new Set(guess).size!==4){setMessage("กรอกรหัส 4 หลักที่ไม่ซ้ำกัน");return}let exact=0,near=0;guess.split("").forEach((d,i)=>{if(secret[i]===d)exact++;else if(secret.includes(d))near++});const next=[...attempts,{guess,exact,near}];setAttempts(next);setGuess("");if(exact===4){setCodeDone(true);setMessage("SUNDAY MISSION COMPLETE");save("code")}else if(next.length>=10){setAttempts([]);setSecret(createSecret());setMessage("ครบ 10 ครั้งแล้ว ระบบสุ่มรหัสใหม่")}};
 const resetTest=()=>{timers.current.forEach(clearTimeout);setSequenceDone(false);setCodeDone(false);setRound(1);setSequence([]);setInputAt(0);setPlaying(false);setAttempts([]);setSecret(createSecret());setMessage("รีเซ็ตโหมดทดสอบแล้ว")};
 const status=useMemo(()=>codeDone?"COMPLETE":sequenceDone?"STAGE 2 / 2":"STAGE 1 / 2",[codeDone,sequenceDone]);
 return <div className="mini-game"><div className="mini-head"><div><span>SECRET_SUNDAY.EXE</span><b>{testMode?"ADMIN TEST":status}</b></div>{testMode&&<button onClick={resetTest}>รีเซ็ตการทดสอบ</button>}</div>{codeDone?<div className="mini-complete"><strong>✓</strong><h3>SUNDAY MISSION COMPLETE</h3><p>{testMode?"ทดสอบครบทั้งสองเกมแล้ว ข้อมูลจริงไม่ได้รับผลกระทบ":"ผ่านภารกิจลับวันอาทิตย์แล้ว"}</p></div>:!sequenceDone?<div><p className="mini-step">เกมที่ 1 · จำลำดับไฟ · รอบ {round}/8</p><p>{message}</p><div className="simon-grid">{COLORS.map((label,i)=><button key={label} aria-label={label} className={`simon-${i} ${active===i?"active":""}`} onClick={()=>tap(i)} disabled={playing}/>)}</div><button className="mini-primary" onClick={startRound} disabled={playing||sequence.length>0&&inputAt>0}>{sequence.length?"แสดงลำดับอีกครั้ง":"เริ่มเกม"}</button></div>:<div><p className="mini-step">เกมที่ 2 · แกะรหัส 4 หลัก</p><p>เลขไม่ซ้ำกัน ระบบจะบอกว่าถูกตำแหน่งหรือมีเลขถูกแต่ตำแหน่งผิด</p><div className="code-guess"><input inputMode="numeric" maxLength={4} value={guess} onChange={e=>setGuess(e.target.value.replace(/\D/g,""))} placeholder="0000"/><button onClick={checkCode}>ตรวจรหัส</button></div><div className="guess-list">{attempts.map((a,i)=><div key={i}><b>{a.guess}</b><span>ตำแหน่งถูก {a.exact} · เลขถูกตำแหน่งผิด {a.near}</span></div>)}</div><small>เหลือ {10-attempts.length} ครั้ง</small><p>{message}</p></div>}</div>;
}

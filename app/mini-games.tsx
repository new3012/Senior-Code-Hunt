"use client";
import {useEffect,useMemo,useRef,useState} from "react";

type Props={testMode?:boolean;initialSequenceDone?:boolean;initialCodeDone?:boolean;specialClue?:string|null;sequenceRounds?:number;codeAttempts?:number;onSaved?:()=>void};
type Feedback="exact"|"near"|"miss";
type Attempt={guess:string;feedback:Feedback[]};
const COLORS=["เขียว","ฟ้า","ส้ม","ชมพู"];

export default function MiniGames({testMode=false,initialSequenceDone=false,initialCodeDone=false,specialClue=null,sequenceRounds=8,codeAttempts=5,onSaved}:Props){
 const [sequenceDone,setSequenceDone]=useState(initialSequenceDone),[codeDone,setCodeDone]=useState(initialCodeDone),[round,setRound]=useState(1),[sequence,setSequence]=useState<number[]>([]),[active,setActive]=useState<number|null>(null),[inputAt,setInputAt]=useState(0),[playing,setPlaying]=useState(false),[roundPassed,setRoundPassed]=useState(false),[message,setMessage]=useState("กดเริ่มเพื่อดูไฟ"),[guess,setGuess]=useState(""),[attempts,setAttempts]=useState<Attempt[]>([]),[testSecret,setTestSecret]=useState("");
 const timers=useRef<number[]>([]);
 const digitRefs=useRef<Array<HTMLInputElement|null>>([]);
 const createSecret=()=>Array.from({length:4},()=>String(Math.floor(Math.random()*10))).join("");
 const setGuessDigit=(index:number,value:string)=>{
  const digit=value.replace(/\D/g,"").slice(-1);
  const chars=guess.padEnd(4," ").split("");
  chars[index]=digit||" ";
  const next=chars.join("").trimEnd();
  setGuess(next);
  if(digit&&index<3)window.setTimeout(()=>digitRefs.current[index+1]?.focus(),0);
 };
 const handleDigitKey=(index:number,e:React.KeyboardEvent<HTMLInputElement>)=>{
  if(e.key==="Enter"){void checkCode();return}
  if(e.key==="Backspace"&&!guess[index]&&index>0){
   e.preventDefault();
   const chars=guess.padEnd(4," ").split("");
   chars[index-1]=" ";
   setGuess(chars.join("").trimEnd());
   digitRefs.current[index-1]?.focus();
  }
  if(e.key==="ArrowLeft"&&index>0){e.preventDefault();digitRefs.current[index-1]?.focus()}
  if(e.key==="ArrowRight"&&index<3){e.preventDefault();digitRefs.current[index+1]?.focus()}
 };
 const pasteGuess=(e:React.ClipboardEvent<HTMLInputElement>)=>{
  const digits=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,4);
  if(!digits)return;
  e.preventDefault();
  setGuess(digits);
  window.setTimeout(()=>digitRefs.current[Math.min(3,digits.length-1)]?.focus(),0);
 };
 const clearTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
 useEffect(()=>{if(testMode)setTestSecret(createSecret());const activeTimers=timers.current;return()=>activeTimers.forEach(clearTimeout)},[testMode]);
 const saveSequence=async()=>{if(!testMode)await fetch("/api/bonus",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({stage:"sequence"})});onSaved?.()};
 const startServerCode=async()=>{if(testMode)return;await fetch("/api/bonus",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"start-code"})})};
 useEffect(()=>{if(sequenceDone&&!codeDone&&!testMode)void startServerCode()},[sequenceDone,codeDone,testMode]);
 const showSequence=(next:number[])=>{clearTimers();setPlaying(true);setRoundPassed(false);setInputAt(0);setMessage("จำลำดับให้ดี...");next.forEach((color,i)=>{timers.current.push(window.setTimeout(()=>setActive(color),500+i*650));timers.current.push(window.setTimeout(()=>setActive(null),900+i*650))});timers.current.push(window.setTimeout(()=>{setPlaying(false);setMessage("กดสีตามลำดับ")},next.length*650+500))};
 const startRound=()=>{const next=[...sequence,Math.floor(Math.random()*4)];setSequence(next);showSequence(next)};
 const nextRound=()=>{if(!roundPassed||playing)return;setRound(v=>v+1);startRound()};
 const tap=(color:number)=>{
  if(playing||!sequence.length||roundPassed)return;
  if(sequence[inputAt]!==color){
   setInputAt(0);setPlaying(true);setMessage("ผิด");
   clearTimers();
   timers.current.push(window.setTimeout(()=>showSequence(sequence),3000));
   return;
  }
  const nextAt=inputAt+1;
  if(nextAt===sequence.length){
   if(round>=sequenceRounds){setSequenceDone(true);setMessage("ผ่านเกมจำลำดับไฟแล้ว");void saveSequence();void startServerCode()}
   else{setInputAt(0);setRoundPassed(true);setMessage("ผ่านด่านนี้แล้ว")}
   return;
  }
  setInputAt(nextAt)
 };
 const localFeedback=(value:string,secret:string):Feedback[]=>{
  const result:Feedback[]=Array(4).fill("miss");
  const remaining=new Map<string,number>();
  for(let i=0;i<4;i++){if(value[i]===secret[i])result[i]="exact";else remaining.set(secret[i],(remaining.get(secret[i])??0)+1)}
  for(let i=0;i<4;i++){if(result[i]==="exact")continue;const count=remaining.get(value[i])??0;if(count>0){result[i]="near";remaining.set(value[i],count-1)}}
  return result;
 };
 const checkCode=async()=>{
  if(!/^\d{4}$/.test(guess)){setMessage("กรอกรหัสตัวเลข 4 หลัก");return}
  const submitted=guess;
  setGuess("");
  if(testMode){
   const feedback=localFeedback(submitted,testSecret);
   const next=[...attempts,{guess:submitted,feedback}];
   setAttempts(next);
   if(feedback.every(v=>v==="exact")){setCodeDone(true);setMessage("SPECIAL MISSION COMPLETE");return}
   if(next.length>=codeAttempts){setAttempts([]);setTestSecret(createSecret());setMessage(`ครบ ${codeAttempts} ครั้งแล้ว ระบบสุ่มรหัสใหม่`);return}
   setMessage("ลองรหัสถัดไปได้เลย");
   return;
  }
  const r=await fetch("/api/bonus",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"guess-code",guess:submitted})});
  const data=await r.json();
  if(!r.ok){setMessage(data.error||"ตรวจรหัสไม่สำเร็จ");return}
  setAttempts(v=>data.reset?[]:[...v,{guess:submitted,feedback:data.feedback}]);
  if(data.complete){setCodeDone(true);setMessage("SPECIAL MISSION COMPLETE");onSaved?.();return}
  setMessage(data.reset?`ครบ ${codeAttempts} ครั้งแล้ว ระบบสุ่มรหัสใหม่`:"ลองรหัสถัดไปได้เลย");
 };
 const resetTest=()=>{clearTimers();setSequenceDone(false);setCodeDone(false);setRound(1);setSequence([]);setInputAt(0);setPlaying(false);setRoundPassed(false);setAttempts([]);setTestSecret(createSecret());setMessage("รีเซ็ตโหมดทดสอบแล้ว")};
 const adminPassStage=()=>{if(!testMode)return;if(!sequenceDone){setSequenceDone(true);setMessage("Admin ผ่านเกมจำลำดับไฟ");return}setCodeDone(true);setMessage("SPECIAL MISSION COMPLETE")};
 const status=useMemo(()=>codeDone?"COMPLETE":sequenceDone?"STAGE 2 / 2":"STAGE 1 / 2",[codeDone,sequenceDone]);
 return <div className="mini-game"><div className="mini-head"><div><span>SECRET_SUNDAY.EXE</span><b>{testMode?"ADMIN TEST":status}</b></div>{testMode&&<button onClick={resetTest}>รีเซ็ตการทดสอบ</button>}</div>{codeDone?<div className="mini-complete"><strong>✓</strong><h3>SPECIAL MISSION COMPLETE</h3><p>{testMode?"ทดสอบครบทั้งสองเกมแล้ว ข้อมูลจริงไม่ได้รับผลกระทบ":"ผ่านภารกิจพิเศษแล้ว"}</p>{specialClue&&<div className="special-clue-reward"><span>คำใบ้พิเศษ</span><blockquote>“{specialClue}”</blockquote></div>}</div>:!sequenceDone?<div><p className="mini-step">เกมที่ 1 · จำลำดับไฟ · ด่าน {round}/{sequenceRounds}</p><p>{message}</p><div className="simon-grid">{COLORS.map((label,i)=><button key={label} aria-label={label} className={`simon-${i} ${active===i?"active":""}`} onClick={()=>tap(i)} disabled={playing||roundPassed}/>)}</div><button className="mini-primary" onClick={roundPassed?nextRound:sequence.length?()=>showSequence(sequence):startRound} disabled={playing}>{roundPassed?"ด่านต่อไป":sequence.length?"ดูอีกครั้ง":"เริ่มเกม"}</button></div>:<div><p className="mini-step">เกมที่ 2 · แกะรหัส 4 หลัก</p><p>ฟ้า = ถูกตำแหน่ง · ส้ม = มีเลขแต่ตำแหน่งผิด · ดำ = ไม่มีเลขนี้</p><div className="code-guess code-guess-boxed"><div className="code-digit-inputs" aria-label="กรอกรหัส 4 หลัก">{[0,1,2,3].map(i=><input key={i} ref={el=>{digitRefs.current[i]=el}} inputMode="numeric" autoComplete="off" maxLength={1} value={guess[i]??""} onChange={e=>setGuessDigit(i,e.target.value)} onKeyDown={e=>handleDigitKey(i,e)} onPaste={pasteGuess} aria-label={`รหัสหลักที่ ${i+1}`} />)}</div><button onClick={()=>void checkCode()} disabled={guess.length!==4}>ตรวจรหัส</button></div><div className="guess-list">{attempts.map((a,i)=><div className="guess-row" key={i}><div className="guess-digits">{a.guess.split("").map((d,j)=><span key={j} className={`guess-digit ${a.feedback[j]}`}>{d}</span>)}</div></div>)}</div><small>เหลือ {Math.max(0,codeAttempts-attempts.length)} ครั้ง</small><p>{message}</p></div>}{testMode&&!codeDone&&<div className="admin-skip-wrap"><span>สำหรับ Admin</span><button type="button" onClick={adminPassStage}>{sequenceDone?"ผ่านเกมแกะรหัส":"ผ่านเกมจำลำดับไฟ"}</button></div>}</div>;
}

"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import MiniGames from "./mini-games";
type Mission={id:number;day:number;kind:"code"|"choice"|"photo";tag:string;title:string;task:string;snippet?:string;help?:string;clue?:string;passedAt?:string;released?:boolean;choices:string[]};
type Unlock={day:number;tag:string;title:string;clue:string;passedAt:string};
type State={registered:boolean;player?:{nickname:string;recoveryCode:string};released?:number;completed?:number;total?:number;current?:Mission|null;pendingPhoto?:boolean;rejectedPhotoReason?:string|null;latestUnlock?:Unlock|null;missions?:Mission[];nextMidnightMs?:number;bonus?:{unlocked:boolean;remainingMs:number;sequenceDone:boolean;codeDone:boolean};finalAvailable?:boolean;finalCompleted?:boolean};
export default function HuntApp(){
 const [state,setState]=useState<State|null>(null),[nickname,setNickname]=useState(""),[recover,setRecover]=useState(""),[answer,setAnswer]=useState(""),[finalAnswer,setFinalAnswer]=useState(""),[hint,setHint]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[archive,setArchive]=useState(false),[recoveryOpen,setRecoveryOpen]=useState(false),[countdown,setCountdown]=useState(0),[revealed,setRevealed]=useState<Unlock|null>(null);
 const [selectedPhoto,setSelectedPhoto]=useState<File|null>(null),[photoName,setPhotoName]=useState(""),[photoPreview,setPhotoPreview]=useState("");

 const setPhotoFile=(file:File|null,label="")=>{
  setSelectedPhoto(file);
  setPhotoName(file?label||file.name:"");
  setPhotoPreview(old=>{
   if(old)URL.revokeObjectURL(old);
   return file?URL.createObjectURL(file):"";
  });
 };

 const load=useCallback(async()=>{const r=await fetch("/api/state",{cache:"no-store"});const data:State=await r.json();setState(data);setCountdown(data.nextMidnightMs??0);if(data.latestUnlock&&localStorage.getItem("hunt_seen_clue")!==data.latestUnlock.passedAt)setRevealed(data.latestUnlock)},[]);
 useEffect(()=>{
  // A pending/completed/different mission must never reuse the previous photo.
  setPhotoFile(null);
 },[state?.current?.id,state?.pendingPhoto]);
 useEffect(()=>{load()},[load]); useEffect(()=>{const timer=setInterval(()=>setCountdown(v=>Math.max(0,v-1000)),1000);return()=>clearInterval(timer)},[]);
 const request=async(url:string,body:unknown)=>{setBusy(true);setError("");const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json();setBusy(false);if(!r.ok){setError(data.error);return false}await load();return true};
 const submitAnswer=async()=>{if(!state?.current)return;const ok=await request("/api/missions/answer",{missionId:state.current.id,answer});if(ok){setNotice("ถอดรหัสสำเร็จ! คำใบ้ถูกบันทึกแล้ว");setAnswer("");setHint(false)}};
 const submitFinal=async()=>{const ok=await request("/api/final",{answer:finalAnswer});if(ok){setFinalAnswer("");setNotice("")}};
 const preparePhoto=async(file:File)=>{
  // Keep the request below the common Nginx 1 MB default, especially for iPhone camera photos.
  try{
   const bitmap=await createImageBitmap(file);
   let maxSide=1280,quality=.78,blob:Blob|null=null;
   for(let attempt=0;attempt<4;attempt++){
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext("2d"); if(!ctx)throw new Error("canvas");
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(blob&&blob.size<850*1024)break;
    maxSide=Math.round(maxSide*.82); quality=Math.max(.58,quality-.07);
   }
   bitmap.close();
   if(!blob)throw new Error("encode");
   return new File([blob],"mission-photo.jpg",{type:"image/jpeg",lastModified:Date.now()});
  }catch{return file}
 };
 const submitPhoto=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(!state?.current||busy)return;
  const formEl=e.currentTarget;
  const form=new FormData(formEl);
  const formFile=form.get("photo");
  const file=selectedPhoto??(formFile instanceof File&&formFile.size?formFile:null);
  if(!file){setError("กรุณาเลือกรูปหรือถ่ายรูปก่อน");return}
  form.delete("cameraPhoto");
  const uploadFile=await preparePhoto(file);
  if(uploadFile.size>8*1024*1024){setError("รูปมีขนาดใหญ่เกินไป กรุณาเลือกรูปอื่นหรือลองถ่ายใหม่");return}
  form.set("photo",uploadFile);
  form.set("missionId",String(state.current.id));
  setBusy(true);setError("");setNotice("");
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    const r=await fetch("/api/missions/photo",{method:"POST",body:form,signal:controller.signal});
    clearTimeout(timer);
    let data:{error?:string}={};
    try{data=await r.json()}catch{}
    if(!r.ok){
      if(r.status===413)setError("รูปมีขนาดใหญ่เกินกว่าที่เซิร์ฟเวอร์รับได้ กรุณาลองถ่ายหรือเลือกรูปใหม่");
      else setError(data.error||`ส่งรูปไม่สำเร็จ (รหัส ${r.status}) กรุณาลองใหม่`);
      return
    }
    formEl.reset();
    setPhotoFile(null);
    setNotice("ส่งรูปให้พี่รหัสตรวจแล้ว");
    await load();
  }catch(err){
    setError(err instanceof DOMException&&err.name==="AbortError"?"อัปโหลดใช้เวลานานเกินไป กรุณาลองใหม่":"ส่งรูปไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
  }finally{
    setBusy(false);
  }
};
 if(!state)return <main className="loading">กำลังเชื่อมต่อระบบ...</main>;
 if(!state.registered)return <main className="onboard"><div className="onboard-card"><div className="brand"><span>&gt;_</span> SENIOR.HUNT</div><p className="eyebrow">PLAYER INITIALIZATION</p><h1>เริ่มภารกิจ<br/><em>ตามหาพี่รหัส</em></h1><p>ไม่ต้องสมัครสมาชิก ใส่เพียงชื่อเล่นเพื่อแยกความคืบหน้าของแต่ละคน</p><input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={40} placeholder="ชื่อเล่นของน้อง"/><button disabled={busy} onClick={()=>request("/api/player/register",{nickname})}>เริ่มภารกิจ ↗</button><button className="text-btn" onClick={()=>setRecoveryOpen(!recoveryOpen)}>เคยเล่นแล้ว? ใช้รหัสกู้คืน</button>{recoveryOpen&&<div className="recover-row"><input value={recover} onChange={e=>setRecover(e.target.value)} placeholder="รหัส 8 ตัว"/><button onClick={()=>request("/api/player/recover",{code:recover})}>กู้คืน</button></div>}{error&&<p className="error">{error}</p>}</div></main>;
 const current=state.current; const hours=Math.floor(countdown/3600000),mins=Math.floor(countdown%3600000/60000),secs=Math.floor(countdown%60000/1000);
 return <main className="site-shell"><div className="noise"/><nav className="topbar"><div className="brand"><span>&gt;_</span> SENIOR.HUNT</div><div className="player-chip">PLAYER: {state.player?.nickname}</div></nav>
 <section className="dashboard"><aside className="case-panel"><p className="eyebrow">แฟ้มคดีของ {state.player?.nickname}</p><h1>ภารกิจ<br/><em>ตามหาพี่รหัส</em></h1><p className="intro">ต้องทำภารกิจให้ครบภายในวันจันทร์ที่ 31 สิงหาคม บางวันเปิด 2 ภารกิจแต่ต้องทำตามลำดับ หากพลาดวันไหน ภารกิจเดิมจะยังรออยู่</p><div className="deadline-note">DEADLINE · MON 31 AUG · 23:59</div><div className="case-stats"><div><strong>{String(state.released).padStart(2,"0")}</strong><span>ภารกิจที่เปิด</span></div><div><strong>{String(state.completed).padStart(2,"0")}</strong><span>ผ่านแล้ว</span></div><div><strong>{state.total}</strong><span>ภารกิจทั้งหมด</span></div></div><button className="recovery-button" onClick={()=>setRecoveryOpen(!recoveryOpen)}>รหัสย้ายเครื่อง / กู้คืน</button>{recoveryOpen&&<div className="recovery-box"><b>{state.player?.recoveryCode}</b><span>เก็บรหัสนี้ไว้เป็นความลับ ใช้เปิดความคืบหน้าในเครื่องใหม่</span></div>}</aside>
 <section className="terminal-card"><div className="terminal-head"><span>DAILY_CLUE.EXE</span><div><i/><i/><i/></div></div><div className="terminal-body"><div className="code-line"><span>01</span><code>status: <b>{current?"ENCRYPTED":"SYNCED"}</b></code></div>{notice&&<p className="success">{notice}</p>}{revealed&&<div className="clue-reveal"><p className="mission-badge">DAY {String(revealed.day).padStart(2,"0")} · {revealed.tag}</p><span className="reveal-check">✓</span><h2>{revealed.title}</h2><blockquote>“{revealed.clue}”</blockquote><button onClick={()=>{localStorage.setItem("hunt_seen_clue",revealed.passedAt);setRevealed(null);setNotice("")}}>บันทึกคำใบ้และไปต่อ ↗</button></div>}
 {current?<div className="locked-content"><div className="mission-badge">ภารกิจที่ {String(current.day).padStart(2,"0")} · {current.tag}</div><h2>{current.title}</h2><p>{current.task}</p>{current.snippet&&<pre className="challenge-code">{current.snippet}</pre>}{current.kind==="choice"&&<div className="choice-grid">{current.choices.map(c=><button key={c} className={answer===c?"selected":""} onClick={()=>setAnswer(c)}>{c}</button>)}</div>}{current.kind==="code"&&<input className="answer-input" value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitAnswer()} placeholder="พิมพ์คำตอบที่นี่"/>}{current.kind!=="photo"&&<button className="unlock-button" disabled={busy} onClick={submitAnswer}>{busy?"กำลังตรวจ...":"VERIFY & DECRYPT ↗"}</button>}{current.kind==="photo"&&(state.pendingPhoto?<div className="pending-box photo-pending"><span className="pending-icon">⌛</span><div><b>รอพี่รหัสตรวจรูป</b><span>ส่งหลักฐานเรียบร้อยแล้ว เมื่อพี่รหัสอนุมัติ ระบบจะปลดล็อกคำใบ้ให้อัตโนมัติ</span></div><button type="button" onClick={()=>{setPhotoFile(null);load()}}>ตรวจสอบสถานะ</button></div>:<>{state.rejectedPhotoReason&&<div className="photo-rejected"><span>ไม่ผ่าน</span><div><b>เหตุผลจากพี่รหัส</b><p>{state.rejectedPhotoReason}</p><small>แก้ไขตามเหตุผลแล้วถ่ายหรือเลือกรูปใหม่ได้เลย</small></div></div>}<form onSubmit={submitPhoto} className="photo-form"><div className="photo-upload-card"><div className="upload-copy"><b>ส่งหลักฐานภารกิจ</b><span>เลือกได้ว่าจะถ่ายรูปใหม่ หรือเลือกรูปจากเครื่อง</span></div><div className="photo-source-grid">
 <label className="photo-source-btn camera-btn"><span>ถ่ายรูป</span><input name="cameraPhoto" type="file" accept="image/*" capture="environment" onClick={e=>{e.currentTarget.value=""}} onChange={e=>{const f=e.target.files?.[0]??null;if(f)setPhotoFile(f,"รูปที่ถ่ายล่าสุด")}}/></label>
 <label className="photo-source-btn gallery-btn"><span>เลือกไฟล์</span><input name="photo" type="file" accept="image/*" onClick={e=>{e.currentTarget.value=""}} onChange={e=>{const f=e.target.files?.[0]??null;if(f)setPhotoFile(f,f.name)}}/></label>
</div>{photoPreview&&<div className="photo-preview-card"><img src={photoPreview} alt="รูปหลักฐานที่เลือก"/><div><b>รูปที่เลือก</b><span>{photoName}</span><button type="button" onClick={()=>setPhotoFile(null)}>เลือกรูปใหม่</button></div></div>}</div><label className="consent"><input type="checkbox" required/><span>ยินยอมให้พี่รหัสดูรูปเพื่อตรวจภารกิจ โดยรูปจะถูกลบภายใน 7 วัน</span></label><button className="photo-submit" disabled={busy}>{busy?"กำลังอัปโหลด...":"ส่งรูปให้พี่รหัสตรวจ ↗"}</button></form></>)}<button className="hint-button" onClick={()=>setHint(!hint)}>{hint?"ซ่อนคำใบ้ช่วย":"ขอคำใบ้ช่วย"}</button>{hint&&<p className="hint">HINT: {current.help}</p>}{error&&<p className="error">{error}</p>}</div>:state.finalAvailable?<div className="locked-content final-mission"><div className="mission-badge">FINAL MISSION</div><h2>สิ่งที่ติดตามตัวคุณ</h2><p>อะไรเอ่ย ตามเราไปทุกที่ แต่จะหายไปเมื่อไม่มีแสง?</p><input className="answer-input" value={finalAnswer} onChange={e=>setFinalAnswer(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitFinal()} placeholder="พิมพ์คำตอบที่นี่"/><button className="unlock-button" disabled={busy} onClick={submitFinal}>VERIFY FINAL ↗</button>{error&&<p className="error">{error}</p>}</div>:state.finalCompleted?<div className="caught-up final-complete"><span>✓</span><h2>ภารกิจทั้งหมดเสร็จสมบูรณ์</h2><p>ตอนนี้คำใบ้อยู่กับคุณครบแล้ว จงนำคำใบ้ทั้งหมดมารวมกัน และตามหาว่าพี่รหัสของคุณคือใคร</p></div>:<div className="caught-up"><span>✓</span><h2>ทำภารกิจที่เปิดอยู่ครบแล้ว</h2><p>ภารกิจถัดไปเปิดใน</p><strong>{String(hours).padStart(2,"0")}:{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</strong></div>}</div></section></section>
 {state.bonus?.unlocked&&<section className="bonus-wrap"><p className="eyebrow">UNLOCKED · SUNDAY 18:00</p><h2>ภารกิจลับวันอาทิตย์</h2><MiniGames initialSequenceDone={state.bonus.sequenceDone} initialCodeDone={state.bonus.codeDone} onSaved={load}/></section>} <section className="archive-wrap"><button className="archive-toggle" onClick={()=>setArchive(!archive)}><span>ประวัติคำใบ้และแผนภารกิจ</span><b>{archive?"−":"+"}</b></button>{archive&&<div className="archive-grid">{state.missions?.map(m=><article key={m.id} className={m.passedAt?"available":m.released?"waiting":"future"}><span>ภารกิจที่ {String(m.day).padStart(2,"0")}</span><h3>{m.title}</h3><p>{m.passedAt?m.clue:m.released?"เปิดแล้ว — ต้องผ่านภารกิจก่อนหน้าให้ครบ":"ยังไม่ถึงวันปลดล็อก"}</p></article>)}</div>}</section><footer><span>ระบบติดตามพี่รหัส v2.0</span><a href="/admin">ADMIN</a></footer></main>;
}

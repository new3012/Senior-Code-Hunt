"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import MiniGames from "../mini-games";
type Item=Record<string,unknown>;
type Data={startDate:string;players:Array<{id:string;nickname:string;completed:number;lastSeenAt:string}>;missions:Item[];completions:Item[];submissions:Item[]};
export default function AdminApp(){
 const[data,setData]=useState<Data|null>(null),[password,setPassword]=useState(""),[error,setError]=useState(""),[lightbox,setLightbox]=useState<{src:string;label:string}|null>(null),[rejectTarget,setRejectTarget]=useState<{id:unknown,label:string}|null>(null),[rejectReason,setRejectReason]=useState("");
 const playerScrollRef=useRef<HTMLDivElement|null>(null);
 const load=useCallback(async()=>{const r=await fetch("/api/admin/dashboard",{cache:"no-store"});if(r.ok)setData(await r.json())},[]);useEffect(()=>{load()},[load]);
 const post=async(url:string,body:unknown,method="POST")=>{await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});load()};
 const login=async()=>{const r=await fetch("/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const x=await r.json();if(!r.ok)setError(x.error);else load()};
 const patch=(body:unknown)=>post("/api/admin/dashboard",body,"PATCH");
 const reset=(id:string)=>confirm("ล้างความคืบหน้าของผู้เล่นคนนี้?")&&post("/api/admin/player",{playerId:id,reset:true},"DELETE");
 const review=(id:unknown,action:"approve"|"reject",reason="")=>post("/api/admin/review",{submissionId:id,action,reason});
 const submitReject=async()=>{if(!rejectTarget)return;if(rejectReason.trim().length<3){setError("กรุณาระบุเหตุผลที่ไม่ผ่าน");return}await review(rejectTarget.id,"reject",rejectReason.trim());setRejectTarget(null);setRejectReason("");};
 if(!data)return <main className="admin-login"><div><p className="eyebrow">RESTRICTED AREA</p><h1>ADMIN<br/><em>CONTROL ROOM</em></h1><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="รหัสผ่านพี่รหัส"/><button onClick={login}>เข้าสู่ระบบ</button>{error&&<p className="error">{error}</p>}</div></main>;
 return <main className="admin-shell">
  <header><div><p className="eyebrow">PRIVATE DASHBOARD</p><h1>CONTROL ROOM</h1></div><label>วันเริ่มภารกิจ <input type="date" value={data.startDate} onChange={e=>patch({startDate:e.target.value})}/></label></header>
  <section><h2>รูปที่รอตรวจ ({data.submissions.length})</h2><div className="evidence-grid">{data.submissions.map(s=><article key={String(s.id)}><button type="button" className="evidence-thumb-button" onClick={()=>setLightbox({src:`/api/admin/evidence/${String(s.id)}?source=submission`,label:`${String(s.nickname)} · ภารกิจที่ ${String(s.day)}`})}><img src={`/api/admin/evidence/${String(s.id)}?source=submission`} alt="รูปที่รอตรวจ"/><span>กดเพื่อขยาย</span></button><b>{String(s.nickname)} · ภารกิจที่ {String(s.day)}</b><span>{String(s.title)}</span><time>{new Date(String(s.submittedAt)).toLocaleString("th-TH")}</time><div className="review-actions"><button onClick={()=>review(s.id,"approve")}>ผ่านและปลดล็อก</button><button className="reject-button" onClick={()=>{setRejectTarget({id:s.id,label:`${String(s.nickname)} · ภารกิจที่ ${String(s.day)}`});setRejectReason("")}}>ไม่ผ่าน</button></div></article>)}</div></section>
  <section><h2>ทดสอบภารกิจลับวันอาทิตย์</h2><p className="admin-note">โหมดนี้เปิดทดสอบได้ทุกวัน ผลการเล่นจะไม่บันทึกและไม่กระทบความคืบหน้าของน้อง</p><MiniGames testMode/></section>
  <section className="players-section">
   <div className="section-heading-row">
    <div><p className="section-kicker">PLAYER DIRECTORY</p><h2>ผู้เล่น {data.players.length} คน</h2></div>
    <div className="player-scroll-controls">
     <button type="button" onClick={()=>playerScrollRef.current?.scrollBy({left:-420,behavior:"smooth"})}>←</button>
     <button type="button" onClick={()=>playerScrollRef.current?.scrollBy({left:420,behavior:"smooth"})}>→</button>
    </div>
   </div>
   <div ref={playerScrollRef} className="admin-player-scroll">
    <div className="admin-grid">{data.players.map((p,index)=><article key={p.id}><span className="player-index">{String(index+1).padStart(2,"0")}</span><strong>{p.nickname}</strong><span>{p.completed}/9 ภารกิจ</span><small>ล่าสุด {new Date(p.lastSeenAt).toLocaleString("th-TH")}</small><button onClick={()=>reset(p.id)}>ล้างความคืบหน้า</button></article>)}</div>
   </div>
  </section>
  <section><h2>แผนภารกิจและคำใบ้</h2><div className="mission-editor">{data.missions.map(m=><details key={String(m.id)}><summary>ภารกิจที่ {String(m.day)} · {String(m.title)} · เปิดวันที่ {25+Number(m.unlockOffset)} ส.ค. <b>{String(m.kind)}</b></summary>{[["title","ชื่อภารกิจ"],["task","โจทย์"],["snippet","โค้ด"],["answer","คำตอบ"],["help_text","คำใบ้ช่วย"],["clue","คำใบ้ที่ได้"]].map(([field,label])=><label key={field}>{label}<textarea defaultValue={String(m[field]??m[field==="help_text"?"help":""]??"")} onBlur={e=>patch({id:m.id,field,value:e.target.value})}/></label>)}</details>)}</div></section>
  <section><h2>หลักฐานที่ผ่านแล้ว</h2><div className="evidence-grid">{data.completions.map(c=><article key={String(c.id)}>{Boolean(c.evidencePath)&&<button type="button" className="evidence-thumb-button" onClick={()=>setLightbox({src:`/api/admin/evidence/${String(c.id)}`,label:`${String(c.nickname)} · ภารกิจที่ ${String(c.day)}`})}><img src={`/api/admin/evidence/${String(c.id)}`} alt="หลักฐานภารกิจ"/><span>กดเพื่อขยาย</span></button>}<b>{String(c.nickname)} · ภารกิจที่ {String(c.day)}</b><span>{String(c.method)}</span><time>{new Date(String(c.passedAt)).toLocaleString("th-TH")}</time></article>)}</div></section>
 {rejectTarget&&<div className="reject-modal" role="dialog" aria-modal="true"><div className="reject-card"><div className="reject-head"><div><span>REVIEW RESULT</span><b>ระบุเหตุผลที่ไม่ผ่าน</b><small>{rejectTarget.label}</small></div><button type="button" onClick={()=>{setRejectTarget(null);setRejectReason("")}}>×</button></div><label>เหตุผล<textarea value={rejectReason} maxLength={500} onChange={e=>setRejectReason(e.target.value)} placeholder="เช่น รูปไม่เห็นใบหน้าชัดเจน / จำนวนคนไม่ครบ / หลักฐานไม่ตรงโจทย์"/></label><div className="reject-count">{rejectReason.length}/500</div><div className="reject-actions"><button type="button" onClick={()=>{setRejectTarget(null);setRejectReason("")}}>ยกเลิก</button><button type="button" className="reject-confirm" onClick={submitReject}>ยืนยันว่าไม่ผ่าน</button></div>{error&&<p className="error">{error}</p>}</div></div>} {lightbox&&<div className="evidence-lightbox" role="dialog" aria-modal="true" onClick={()=>setLightbox(null)}><div className="evidence-lightbox-card" onClick={e=>e.stopPropagation()}><div className="evidence-lightbox-head"><b>{lightbox.label}</b><button type="button" onClick={()=>setLightbox(null)} aria-label="ปิด">×</button></div><img src={lightbox.src} alt={lightbox.label}/><p>แตะพื้นที่ด้านนอกหรือกด × เพื่อปิด</p></div></div>}
 </main>;
}

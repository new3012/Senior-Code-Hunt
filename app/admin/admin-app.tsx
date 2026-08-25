"use client";
import {useCallback,useEffect,useState} from "react";
type Item=Record<string,unknown>;
type Data={startDate:string;players:Array<{id:string;nickname:string;completed:number;lastSeenAt:string}>;missions:Item[];completions:Item[];submissions:Item[]};
export default function AdminApp(){
 const[data,setData]=useState<Data|null>(null),[password,setPassword]=useState(""),[error,setError]=useState("");
 const load=useCallback(async()=>{const r=await fetch("/api/admin/dashboard",{cache:"no-store"});if(r.ok)setData(await r.json())},[]);useEffect(()=>{load()},[load]);
 const post=async(url:string,body:unknown,method="POST")=>{await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});load()};
 const login=async()=>{const r=await fetch("/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const x=await r.json();if(!r.ok)setError(x.error);else load()};
 const patch=(body:unknown)=>post("/api/admin/dashboard",body,"PATCH");
 const reset=(id:string)=>confirm("ล้างความคืบหน้าของผู้เล่นคนนี้?")&&post("/api/admin/player",{playerId:id,reset:true},"DELETE");
 const review=(id:unknown,action:"approve"|"reject")=>post("/api/admin/review",{submissionId:id,action});
 if(!data)return <main className="admin-login"><div><p className="eyebrow">RESTRICTED AREA</p><h1>NEW’S<br/><em>CONTROL ROOM</em></h1><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="รหัสผ่านผู้ดูแล"/><button onClick={login}>เข้าสู่ระบบ</button>{error&&<p className="error">{error}</p>}</div></main>;
 return <main className="admin-shell">
  <header><div><p className="eyebrow">PRIVATE DASHBOARD</p><h1>CONTROL ROOM</h1></div><label>วันเริ่มภารกิจ <input type="date" value={data.startDate} onChange={e=>patch({startDate:e.target.value})}/></label></header>
  <section><h2>รูปที่รอตรวจ ({data.submissions.length})</h2><div className="evidence-grid">{data.submissions.map(s=><article key={String(s.id)}><img src={`/api/admin/evidence/${String(s.id)}?source=submission`} alt="รูปที่รอตรวจ"/><b>{String(s.nickname)} · DAY {String(s.day)}</b><span>{String(s.title)}</span><time>{new Date(String(s.submittedAt)).toLocaleString("th-TH")}</time><div className="review-actions"><button onClick={()=>review(s.id,"approve")}>ผ่านและปลดล็อก</button><button onClick={()=>review(s.id,"reject")}>ไม่ผ่าน</button></div></article>)}</div></section>
  <section><h2>ผู้เล่น ({data.players.length}/7)</h2><div className="admin-grid">{data.players.map(p=><article key={p.id}><strong>{p.nickname}</strong><span>{p.completed}/9 ภารกิจ</span><small>ล่าสุด {new Date(p.lastSeenAt).toLocaleString("th-TH")}</small><button onClick={()=>reset(p.id)}>ล้างความคืบหน้า</button></article>)}</div></section>
  <section><h2>แผนภารกิจและคำใบ้</h2><div className="mission-editor">{data.missions.map(m=><details key={String(m.id)}><summary>DAY {String(m.day)} · {String(m.title)} · เปิดวันที่ {25+Number(m.unlockOffset)} ส.ค. <b>{String(m.kind)}</b></summary>{[["title","ชื่อภารกิจ"],["task","โจทย์"],["snippet","โค้ด"],["answer","คำตอบ"],["help_text","คำใบ้ช่วย"],["clue","คำใบ้ที่ได้"]].map(([field,label])=><label key={field}>{label}<textarea defaultValue={String(m[field]??m[field==="help_text"?"help":""]??"")} onBlur={e=>patch({id:m.id,field,value:e.target.value})}/></label>)}</details>)}</div></section>
  <section><h2>หลักฐานที่ผ่านแล้ว</h2><div className="evidence-grid">{data.completions.map(c=><article key={String(c.id)}>{Boolean(c.evidencePath)&&<img src={`/api/admin/evidence/${String(c.id)}`} alt="หลักฐานภารกิจ"/>}<b>{String(c.nickname)} · DAY {String(c.day)}</b><span>{String(c.method)}</span><time>{new Date(String(c.passedAt)).toLocaleString("th-TH")}</time></article>)}</div></section>
 </main>;
}

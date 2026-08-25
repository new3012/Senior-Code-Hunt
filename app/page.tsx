"use client";
import { useMemo, useState } from "react";

type Mission = { tag:string; title:string; clue:string; code:string; type:"code"|"photo"|"choice"; task:string; snippet?:string; answer?:string; hint?:string; detail?:string; choices?:string[] };

const missions: Mission[] = [
  { tag:"IDENTITY", title:"สิ่งที่มาแทนของเดิม", clue:"ชื่อของบุคคลเป้าหมาย ไม่ได้อยู่ในอดีต และไม่ใช่ของเก่า", code:"OLD !== ?", type:"code", task:"โค้ดนี้แสดงผลเป็นเลขอะไร?", snippet:"let x = 4;\nx += 3;\nconsole.log(x);", answer:"7", hint:"เริ่มจาก 4 แล้วบวกเพิ่มอีก 3" },
  { tag:"SOUND", title:"ร่องรอยในความเงียบ", clue:"บางครั้งคนที่น้องตามหา ใช้เสียงดนตรีพูดแทนคำพูด", code:"silence.play()", type:"photo", task:"ถ่ายรูปคู่กับผลงานที่น้องภูมิใจ 1 ชิ้น", detail:"เก็บรูปไว้ในเครื่องของน้อง ไม่ต้องอัปโหลดหรือส่งให้ใคร จากนั้นกดยืนยันเพื่อรับคำใบ้" },
  { tag:"TIME", title:"ปลายทางของหนึ่งปี", clue:"วันสำคัญของพี่ อยู่ในเดือนสุดท้าย ก่อนปีใหม่จะมาถึง", code:"month === 12", type:"code", task:"ตัวแปร result มีค่าเป็นอะไร?", snippet:"const month = 12;\nconst result = month === 12;", answer:"true", hint:"เครื่องหมาย === ใช้ตรวจว่าสองฝั่งเท่ากันหรือไม่" },
  { tag:"TRACE", title:"บุคคลที่เคยเดินผ่าน", clue:"เราอาจเคยสบตากันแล้ว เพียงแต่ตอนนั้นมีแค่คนเดียวที่รู้", code:"seen: true", type:"choice", task:"ถ้าพี่รหัสมองเห็นน้อง แต่น้องยังไม่รู้ว่าเป็นใคร ใครมีข้อมูลมากกว่า?", choices:["น้องรหัส","พี่รหัส","รู้เท่ากัน"], answer:"พี่รหัส", hint:"คนหนึ่งรู้ทั้งสองฝ่าย แต่อีกคนยังรู้แค่ตัวเอง" },
  { tag:"LOGIC", title:"อย่าเชื่อสิ่งที่ชัดเกินไป", clue:"คนที่ดูเหมือนไม่เกี่ยว อาจเกี่ยวกับภารกิจนี้มากที่สุด", code:"suspect ?? senior", type:"photo", task:"ถ่ายรูปสิ่งของสีเดียวกับเสื้อที่ใส่อยู่วันนี้", detail:"ไม่ต้องเห็นหน้าและไม่ต้องอัปโหลด รูปนี้เป็นหลักฐานสำหรับตัวน้องเองเท่านั้น" },
  { tag:"RHYTHM", title:"จังหวะที่ซ่อนอยู่", clue:"ลองสังเกตคนที่เผลอเคาะโต๊ะเป็นจังหวะ โดยไม่รู้ตัว", code:"beat += 1", type:"code", task:"โค้ดนี้จะพิมพ์คำว่า BEAT กี่ครั้ง?", snippet:"for (let i = 0; i < 3; i++) {\n  console.log('BEAT');\n}", answer:"3", hint:"เริ่มนับจาก 0 และหยุดก่อนถึง 3" },
  { tag:"FINAL", title:"ชื่อไม่ใช่ตัวตน", clue:"ต่อให้น้องถอดรหัสชื่อได้ ก็ยังต้องตามหาว่าชื่อนั้นเป็นของใคร", code:"name !== person", type:"choice", task:"คำตรงข้ามของคำว่า OLD คือข้อใด?", choices:["GOLD","NEW","COLD"], answer:"NEW", hint:"คำตอบนี้อาจเป็นมากกว่าคำศัพท์ภาษาอังกฤษ" },
];

function getBangkokDay() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const start = new Date("2026-08-25T00:00:00");
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
}

export default function Home() {
  const dayIndex = useMemo(getBangkokDay, []);
  const current = missions[dayIndex % missions.length];
  const [unlocked, setUnlocked] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [showHint, setShowHint] = useState(false);
  const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date());

  return <main className="site-shell">
    <div className="noise" aria-hidden="true" />
    <nav className="topbar"><div className="brand"><span className="brand-mark">&gt;_</span> SENIOR.HUNT</div><div className="status"><span /> ONLINE</div></nav>
    <section className="dashboard">
      <aside className="case-panel">
        <p className="eyebrow">แฟ้มคดีหมายเลข #2547</p>
        <h1>ภารกิจ<br /><em>ตามหาพี่รหัส</em></h1>
        <p className="intro">ระบบจะเปิดเผยข้อมูลบุคคลเป้าหมายวันละหนึ่งชิ้น ใช้ทุกคำใบ้ให้ดี เพราะคำตอบอาจอยู่ใกล้กว่าที่คิด</p>
        <div className="case-stats"><div><strong>{String(dayIndex + 1).padStart(2,"0")}</strong><span>วันที่สืบ</span></div><div><strong>{String(Math.min(dayIndex + 1,missions.length)).padStart(2,"0")}</strong><span>คำใบ้ที่พบ</span></div><div><strong>??</strong><span>ตัวตนเป้าหมาย</span></div></div>
      </aside>
      <section className={`terminal-card ${unlocked ? "unlocked" : ""}`}>
        <div className="terminal-head"><span>DAILY_CLUE.EXE</span><div><i /><i /><i /></div></div>
        <div className="terminal-body">
          <p className="date">{dateLabel}</p>
          <div className="code-line"><span>01</span><code>const mission = &quot;DAY_{String(dayIndex+1).padStart(2,"0")}&quot;;</code></div>
          <div className="code-line"><span>02</span><code>status: <b>{unlocked ? "UNLOCKED" : "ENCRYPTED"}</b></code></div>
          {!unlocked ? <div className="locked-content"><div className="lock-icon">⌁</div><p className="challenge-label">ภารกิจก่อนปลดล็อก</p><h2>{current.task}</h2>
            {current.type === "code" && <pre className="challenge-code">{current.snippet}</pre>}
            {current.type === "photo" && <><p className="task-detail">{current.detail}</p><label className="confirm-check"><input type="checkbox" checked={answer==="done"} onChange={e=>setAnswer(e.target.checked?"done":"")} /> ถ่ายรูปเรียบร้อยแล้ว</label></>}
            {current.type === "choice" && <div className="choice-grid">{current.choices?.map(choice=><button key={choice} className={answer===choice?"selected":""} onClick={()=>{setAnswer(choice);setError("")}}>{choice}</button>)}</div>}
            {current.type === "code" && <input className="answer-input" value={answer} onChange={e=>{setAnswer(e.target.value);setError("")}} placeholder="พิมพ์คำตอบที่นี่" aria-label="คำตอบ" />}
            {error && <p className="error-text">{error}</p>}
            {current.hint && <button className="hint-button" onClick={()=>setShowHint(!showHint)}>{showHint?"ซ่อนคำใบ้ช่วย":"ขอคำใบ้ช่วย"}</button>}
            {showHint && <p className="hint-text">HINT: {current.hint}</p>}
            <button className="unlock-button" onClick={()=>{const ok=current.type==="photo"?answer==="done":answer.trim().toLowerCase()===current.answer?.toLowerCase();if(ok){setUnlocked(true);setError("")}else setError(current.type==="photo"?"ต้องยืนยันว่าทำภารกิจแล้วก่อน":"ยังไม่ถูก ลองดูโค้ดหรือเปิดคำใบ้ช่วยอีกครั้ง")}}>VERIFY & DECRYPT <span>↗</span></button>
          </div>
          : <div className="clue-content"><p className="clue-tag">[{current.tag}] ข้อมูลที่กู้คืนสำเร็จ</p><h2>{current.title}</h2><blockquote>“{current.clue}”</blockquote><code className="clue-code">{current.code}</code><p className="warning">คำเตือน: รู้ข้อมูลเพิ่ม ไม่ได้แปลว่าเข้าใกล้ตัวจริงเสมอไป</p></div>}
        </div>
      </section>
    </section>
    <section className="archive-wrap">
      <button className="archive-toggle" onClick={()=>setShowArchive(!showArchive)}><span>ประวัติคำใบ้ที่ปลดล็อกแล้ว</span><b>{showArchive ? "−" : "+"}</b></button>
      {showArchive && <div className="archive-grid">{missions.map((item,index)=>{const available=index<=Math.min(dayIndex,missions.length-1);return <article key={item.tag} className={available?"available":"future"}><span>DAY {String(index+1).padStart(2,"0")}</span><h3>{available?item.title:"ยังไม่ปลดล็อก"}</h3><p>{available?item.clue:"กลับมาใหม่เมื่อถึงเวลาของภารกิจ"}</p></article>})}</div>}
    </section>
    <footer><span>ระบบติดตามพี่รหัส v1.0</span><span>อย่าไว้ใจทุกคนที่บอกว่าไม่ใช่</span></footer>
  </main>;
}

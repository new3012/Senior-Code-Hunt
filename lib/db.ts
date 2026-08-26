import mysql, { type PoolConnection, type RowDataPacket } from "mysql2/promise";
import { DEFAULT_MISSIONS } from "./missions";

declare global { var seniorHuntPool: mysql.Pool | undefined; var seniorHuntReady: Promise<void> | undefined; }

export const pool = global.seniorHuntPool ?? mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "seniorhunt",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "senior_hunt",
  connectionLimit: 8,
  charset: "utf8mb4",
});
if (process.env.NODE_ENV !== "production") global.seniorHuntPool = pool;

async function seed(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) total FROM hunt_missions");
  if (Number(rows[0].total)) return;
  for (const m of DEFAULT_MISSIONS) {
    await connection.execute(
      `INSERT INTO hunt_missions (day_number,kind,tag,title,task,snippet,answer,help_text,clue,photo_prompt,choices_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [m.day,m.kind,m.tag,m.title,m.task,m.snippet,m.answer,m.help,m.clue,m.photoPrompt,JSON.stringify("choices" in m ? m.choices : [])]
    );
  }
}

export async function ensureDb() {
  if (!global.seniorHuntReady) global.seniorHuntReady = (async () => {
    const c = await pool.getConnection();
    try {
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_settings (id TINYINT PRIMARY KEY DEFAULT 1, start_date DATE NOT NULL, content_version INT NOT NULL DEFAULT 1, bonus_clue TEXT NULL, bonus_title VARCHAR(160) NULL, bonus_unlock_time VARCHAR(5) NULL, bonus_sequence_rounds INT NULL, bonus_code_attempts INT NULL, final_title VARCHAR(160) NULL, final_task TEXT NULL, final_answer VARCHAR(160) NULL, final_help TEXT NULL, final_choices_json JSON NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
      const [bonusClueColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='bonus_clue'");
      if(!bonusClueColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN bonus_clue TEXT NULL AFTER content_version");
      await c.execute("UPDATE hunt_settings SET bonus_clue=? WHERE id=1 AND (bonus_clue IS NULL OR TRIM(bonus_clue)='')",["พี่รหัสมักอยู่ใกล้พื้นที่ที่มีคอมพิวเตอร์"]);
      const [bonusTitleColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='bonus_title'");
      if(!bonusTitleColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN bonus_title VARCHAR(160) NULL AFTER bonus_clue");
      const [bonusTimeColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='bonus_unlock_time'");
      if(!bonusTimeColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN bonus_unlock_time VARCHAR(5) NULL AFTER bonus_title");
      const [bonusRoundsColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='bonus_sequence_rounds'");
      if(!bonusRoundsColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN bonus_sequence_rounds INT NULL AFTER bonus_unlock_time");
      const [bonusAttemptsColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='bonus_code_attempts'");
      if(!bonusAttemptsColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN bonus_code_attempts INT NULL AFTER bonus_sequence_rounds");
      await c.execute("UPDATE hunt_settings SET bonus_title=COALESCE(NULLIF(TRIM(bonus_title),''),'ภารกิจพิเศษ'),bonus_unlock_time=COALESCE(NULLIF(TRIM(bonus_unlock_time),''),'18:00'),bonus_sequence_rounds=COALESCE(bonus_sequence_rounds,8),bonus_code_attempts=COALESCE(bonus_code_attempts,5) WHERE id=1");
      const [finalTitleColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='final_title'");
      if(!finalTitleColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN final_title VARCHAR(160) NULL AFTER bonus_code_attempts");
      const [finalTaskColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='final_task'");
      if(!finalTaskColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN final_task TEXT NULL AFTER final_title");
      const [finalAnswerColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='final_answer'");
      if(!finalAnswerColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN final_answer VARCHAR(160) NULL AFTER final_task");
      const [finalHelpColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='final_help'");
      if(!finalHelpColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN final_help TEXT NULL AFTER final_answer");
      const [finalChoicesColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='final_choices_json'");
      if(!finalChoicesColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN final_choices_json JSON NULL AFTER final_help");
      await c.execute("UPDATE hunt_settings SET final_title=COALESCE(NULLIF(TRIM(final_title),''),?),final_task=COALESCE(NULLIF(TRIM(final_task),''),?),final_answer=COALESCE(NULLIF(TRIM(final_answer),''),?),final_help=COALESCE(NULLIF(TRIM(final_help),''),?),final_choices_json=COALESCE(final_choices_json,?) WHERE id=1",["ทิศทางที่ไม่ใช่ปลายทาง","ฉันไม่ใช่ปลายทาง แต่ทุกคนต้องผ่านฉันเมื่อสิ่งหนึ่งลดต่ำลง\n\nฉันไม่ใช่ความพ่ายแพ้ แต่บางครั้งการเลือกฉันกลับทำให้ไปต่อได้\n\nฉันอยู่ตรงข้ามกับสิ่งที่พยายามสูงขึ้นเสมอ\n\nฉันคืออะไร?","ลง","ลองคิดถึงคำที่เป็นทั้ง “ทิศทาง” และ “การลดระดับ” ในคำเดียว",JSON.stringify(["ขึ้น", "ลง", "หยุด", "ข้าม", "ย้อน", "หมุน"])]);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_missions (id INT AUTO_INCREMENT PRIMARY KEY, day_number INT NOT NULL UNIQUE, unlock_offset INT NOT NULL DEFAULT 0, kind ENUM('code','choice','photo') NOT NULL, tag VARCHAR(32) NOT NULL, title VARCHAR(160) NOT NULL, task TEXT NOT NULL, snippet TEXT NULL, answer VARCHAR(160) NULL, help_text TEXT NULL, clue TEXT NOT NULL, photo_prompt TEXT NULL, choices_json JSON NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_players (id CHAR(36) PRIMARY KEY, nickname VARCHAR(40) NOT NULL, recovery_code VARCHAR(20) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_completions (id BIGINT AUTO_INCREMENT PRIMARY KEY, player_id CHAR(36) NOT NULL, mission_id INT NOT NULL, method ENUM('answer','manual_photo','ai_photo') NOT NULL, evidence_path VARCHAR(500) NULL, ai_result JSON NULL, passed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_player_mission(player_id,mission_id), CONSTRAINT fk_completion_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE, CONSTRAINT fk_completion_mission FOREIGN KEY(mission_id) REFERENCES hunt_missions(id) ON DELETE CASCADE)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_submissions (id BIGINT AUTO_INCREMENT PRIMARY KEY, player_id CHAR(36) NOT NULL, mission_id INT NOT NULL, evidence_path VARCHAR(500) NOT NULL, status ENUM('pending','rejected') NOT NULL DEFAULT 'pending', rejection_reason VARCHAR(500) NULL, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL, UNIQUE KEY uniq_pending_player_mission(player_id,mission_id), CONSTRAINT fk_submission_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE, CONSTRAINT fk_submission_mission FOREIGN KEY(mission_id) REFERENCES hunt_missions(id) ON DELETE CASCADE)`);
      const [submissionReasonColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_submissions' AND COLUMN_NAME='rejection_reason'");
      if(!submissionReasonColumns.length)await c.query("ALTER TABLE hunt_submissions ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER status");
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_review_history (id BIGINT AUTO_INCREMENT PRIMARY KEY, player_id CHAR(36) NOT NULL, mission_id INT NOT NULL, action ENUM(\'approved\',\'rejected\') NOT NULL, reason VARCHAR(500) NULL, reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_review_player(player_id), INDEX idx_review_mission(mission_id), CONSTRAINT fk_review_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE, CONSTRAINT fk_review_mission FOREIGN KEY(mission_id) REFERENCES hunt_missions(id) ON DELETE CASCADE)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_bonus_progress (player_id CHAR(36) PRIMARY KEY, sequence_done BOOLEAN NOT NULL DEFAULT FALSE, code_done BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_bonus_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_final_completions (player_id CHAR(36) PRIMARY KEY, passed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_final_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE)`);
      await c.execute("INSERT IGNORE INTO hunt_settings (id,start_date) VALUES (1,?)", [process.env.MISSION_START_DATE ?? "2026-08-25"]);
      await seed(c);
      const [columns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_missions' AND COLUMN_NAME='unlock_offset'");
      if(!columns.length)await c.query("ALTER TABLE hunt_missions ADD COLUMN unlock_offset INT NOT NULL DEFAULT 0 AFTER day_number");
      const [settingColumns]=await c.query<RowDataPacket[]>("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hunt_settings' AND COLUMN_NAME='content_version'");
      if(!settingColumns.length)await c.query("ALTER TABLE hunt_settings ADD COLUMN content_version INT NOT NULL DEFAULT 1 AFTER start_date");
      const [versions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(versions[0]?.content_version??1)<4){
        await c.query("UPDATE hunt_missions SET unlock_offset=CASE day_number WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 3 THEN 1 WHEN 4 THEN 2 WHEN 5 THEN 3 WHEN 6 THEN 3 WHEN 7 THEN 4 WHEN 8 THEN 4 WHEN 9 THEN 6 ELSE day_number-1 END");
        await c.execute(`UPDATE hunt_missions SET kind='photo',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,photo_prompt=? WHERE day_number=4`,["ภาพจากโลกของ CE","ถ่ายรูปให้เห็นใบหน้า คู่กับคอมพิวเตอร์หรืออุปกรณ์ไอที และชู 4 นิ้ว","ใบหน้า อุปกรณ์ไอที และสี่นิ้วต้องเห็นในภาพเดียว","Manual review: face, computer or IT equipment, and four fingers visible."]);
        await c.execute(`UPDATE hunt_missions SET kind='photo',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,photo_prompt=? WHERE day_number=7`,["ผู้ร่วมภารกิจพิเศษ","ขออนุญาตอาจารย์ก่อน แล้วถ่ายรูปด้วยกันพร้อมถือกระดาษเขียน DAY 7","ต้องเห็นน้อง อาจารย์ และข้อความ DAY 7 ชัดเจน","Manual review: student and teacher together with a visible DAY 7 sign."]);
        await c.execute(`UPDATE hunt_missions SET kind='photo',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,photo_prompt=? WHERE day_number=9`,["ทีมสืบสวนตัว น","ขออนุญาตเพื่อนแล้วถ่ายรูปรวม 3 คน โดยแต่ละคนถือของที่ชื่อขึ้นต้นด้วย น คนละ 1 ชิ้น","ตัวอย่างเช่น น้ำ หนังสือ นาฬิกา ต้องเห็นทั้งสามคนและของครบสามชิ้น","Manual review: three consenting people, each holding a different object whose Thai name begins with น."]);
        await c.query("UPDATE hunt_settings SET content_version=4 WHERE id=1");
      }
      const [currentVersions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(currentVersions[0]?.content_version??1)<5){
        await c.query("UPDATE hunt_missions SET unlock_offset=CASE day_number WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 3 THEN 1 WHEN 4 THEN 2 WHEN 5 THEN 3 WHEN 6 THEN 3 WHEN 7 THEN 4 WHEN 8 THEN 5 WHEN 9 THEN 6 ELSE day_number-1 END");
        await c.execute(`UPDATE hunt_missions SET kind='code',title=?,task=?,snippet=NULL,answer=?,help_text=?,photo_prompt=NULL WHERE day_number=5`,["สิ่งที่มีคอและมีสาย","มีคอแต่ไม่มีหัว มีสายแต่โทรหาใครไม่ได้ เมื่อนิ้วสัมผัสกลับมีเสียง สิ่งนี้คืออะไร?","กีตาร์","เป็นเครื่องดนตรีชนิดหนึ่ง"]);
        await c.execute(`UPDATE hunt_missions SET kind='photo',tag='BIRTH',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,clue='พี่เกิดเดือน 12',photo_prompt=? WHERE day_number=6`,["ผู้ร่วมภารกิจพิเศษ","ขออนุญาตอาจารย์ก่อน แล้วถ่ายรูปด้วยกันพร้อมถือกระดาษเขียน DAY 6","ต้องเห็นน้อง อาจารย์ และข้อความ DAY 6 ชัดเจน","Manual review: student and teacher together with a visible DAY 6 sign."]);
        await c.execute(`UPDATE hunt_missions SET kind='code',tag='ARTIST',title=?,task=?,snippet=?,answer=?,help_text=?,clue='ศิลปินหรือวงที่พี่สนใจคือ DT.FU',photo_prompt=NULL WHERE day_number=7`,["ชื่อที่สลับด้าน","จัด FU.DT ให้กลับเป็นชื่อที่ถูกต้อง","reverse(\"FU.DT\")","DT.FU","สลับส่วนหน้าและส่วนหลังรอบจุด"]);
        await c.execute(`UPDATE hunt_missions SET kind='photo',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,photo_prompt=? WHERE day_number=9`,["ทีมสืบสวนตัว น","ขออนุญาตเพื่อนแล้วถ่ายรูปรวม 3 คน โดยแต่ละคนถือของที่ชื่อขึ้นต้นด้วย น คนละ 1 ชิ้น","ตัวอย่างเช่น น้ำ หนังสือ นาฬิกา ต้องเห็นทั้งสามคนและของครบสามชิ้น","Manual review: three consenting people, each holding a different object whose Thai name begins with น."]);
        await c.query("UPDATE hunt_settings SET content_version=5 WHERE id=1");
      }

      const [nameSafeVersions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(nameSafeVersions[0]?.content_version??1)<6){
        await c.execute(`UPDATE hunt_missions SET kind='choice',tag='LOGIC',title=?,task=?,snippet=NULL,answer=?,help_text=?,clue=?,photo_prompt=NULL,choices_json=? WHERE day_number=8`,["ทิศทางตรงข้าม","คำตรงข้ามของ UP คือข้อใด?","DOWN","ถ้าไม่ขึ้น ก็ต้องลง","พี่ใช้โทรศัพท์ iPhone",JSON.stringify(["LEFT","DOWN","RIGHT"])]);
        await c.execute(`UPDATE hunt_missions SET kind='photo',tag='TEAM',title=?,task=?,snippet=NULL,answer=NULL,help_text=?,clue=?,photo_prompt=?,choices_json=? WHERE day_number=9`,["ทีมสืบสวนสามคน","ขออนุญาตเพื่อนแล้วถ่ายรูปรวม 3 คน พร้อมชูเลข 1, 2 และ 3 คนละหนึ่งเลข","ต้องเห็นทั้งสามคนและเลข 1, 2, 3 ชัดเจนในภาพเดียว","พี่เรียนสายคอมพิวเตอร์","Manual review: three consenting people together, clearly showing the numbers 1, 2, and 3.",JSON.stringify([])]);
        await c.query("UPDATE hunt_settings SET content_version=6 WHERE id=1");
      }
      const [day6Versions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(day6Versions[0]?.content_version??1)<7){
        await c.execute(`UPDATE hunt_missions SET task=?,help_text=?,photo_prompt=? WHERE day_number=6`,[
          "ขออนุญาตอาจารย์ก่อน แล้วถ่ายรูปด้วยกัน พร้อมให้เห็นข้อความ “ภารกิจที่ 6” บนกระดาษหรือ iPad ก็ได้",
          "ต้องเห็นน้อง อาจารย์ และข้อความ “ภารกิจที่ 6” ชัดเจน จะเขียนบนกระดาษหรือเปิดบน iPad ก็ได้",
          "Manual review: student and teacher together with a clearly visible Mission 6 message shown on paper or an iPad."
        ]);
        await c.query("UPDATE hunt_settings SET content_version=7 WHERE id=1");
      }
      const [riddleVersions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(riddleVersions[0]?.content_version??1)<8){
        await c.execute(`UPDATE hunt_missions SET kind='choice',tag='RIDDLE',title=?,task=?,snippet=NULL,answer=?,help_text=?,choices_json=? WHERE day_number=8`,[
          "เสียงที่ไม่มีใครพูด",
          "อะไรเอ่ย ไม่มีปากแต่ตอบกลับได้ ไม่มีหูแต่ได้ยิน และมักเกิดขึ้นเมื่อเราเปล่งเสียงในที่กว้าง?",
          "เสียงสะท้อน",
          "มันไม่ได้สร้างคำใหม่ เพียงส่งสิ่งที่ได้ยินกลับมา",
          JSON.stringify(["สายลม","เงา","เสียงสะท้อน","ความคิด","ความเงียบ"])
        ]);
        await c.query("UPDATE hunt_settings SET content_version=8 WHERE id=1");
      }
      const [finalChoiceVersions]=await c.query<RowDataPacket[]>("SELECT content_version FROM hunt_settings WHERE id=1");
      if(Number(finalChoiceVersions[0]?.content_version??1)<9){
        await c.execute("UPDATE hunt_missions SET choices_json=? WHERE day_number=8",[JSON.stringify(["สายลม","เงา","เสียงสะท้อน","ความคิด","ความเงียบ","เสียงเรียก"])]);
        await c.execute("UPDATE hunt_settings SET final_title=?,final_task=?,final_answer=?,final_help=?,final_choices_json=?,content_version=9 WHERE id=1",[
          "ทิศทางที่ไม่ใช่ปลายทาง",
          "ฉันไม่ใช่ปลายทาง แต่ทุกคนต้องผ่านฉันเมื่อสิ่งหนึ่งลดต่ำลง\n\nฉันไม่ใช่ความพ่ายแพ้ แต่บางครั้งการเลือกฉันกลับทำให้ไปต่อได้\n\nฉันอยู่ตรงข้ามกับสิ่งที่พยายามสูงขึ้นเสมอ\n\nฉันคืออะไร?",
          "ลง",
          "ลองคิดถึงคำที่เป็นทั้ง “ทิศทาง” และ “การลดระดับ” ในคำเดียว",
          JSON.stringify(["ขึ้น", "ลง", "หยุด", "ข้าม", "ย้อน", "หมุน"])
        ]);
      }

    } finally { c.release(); }
  })();
  return global.seniorHuntReady;
}

export async function settings() {
  await ensureDb();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(start_date,'%Y-%m-%d') startDate,bonus_clue bonusClue,bonus_title bonusTitle,bonus_unlock_time bonusUnlockTime,bonus_sequence_rounds bonusSequenceRounds,bonus_code_attempts bonusCodeAttempts,final_title finalTitle,final_task finalTask,final_answer finalAnswer,final_help finalHelp,final_choices_json finalChoices FROM hunt_settings WHERE id=1");
  return rows[0] as { startDate: string; bonusClue: string; bonusTitle: string; bonusUnlockTime: string; bonusSequenceRounds: number; bonusCodeAttempts: number; finalTitle: string; finalTask: string; finalAnswer: string; finalHelp: string; finalChoices: string[] | string };
}

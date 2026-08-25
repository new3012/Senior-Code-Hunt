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
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_settings (id TINYINT PRIMARY KEY DEFAULT 1, start_date DATE NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_missions (id INT AUTO_INCREMENT PRIMARY KEY, day_number INT NOT NULL UNIQUE, kind ENUM('code','choice','photo') NOT NULL, tag VARCHAR(32) NOT NULL, title VARCHAR(160) NOT NULL, task TEXT NOT NULL, snippet TEXT NULL, answer VARCHAR(160) NULL, help_text TEXT NULL, clue TEXT NOT NULL, photo_prompt TEXT NULL, choices_json JSON NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_players (id CHAR(36) PRIMARY KEY, nickname VARCHAR(40) NOT NULL, recovery_code VARCHAR(20) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_completions (id BIGINT AUTO_INCREMENT PRIMARY KEY, player_id CHAR(36) NOT NULL, mission_id INT NOT NULL, method ENUM('answer','manual_photo','ai_photo') NOT NULL, evidence_path VARCHAR(500) NULL, ai_result JSON NULL, passed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_player_mission(player_id,mission_id), CONSTRAINT fk_completion_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE, CONSTRAINT fk_completion_mission FOREIGN KEY(mission_id) REFERENCES hunt_missions(id) ON DELETE CASCADE)`);
      await c.query(`CREATE TABLE IF NOT EXISTS hunt_submissions (id BIGINT AUTO_INCREMENT PRIMARY KEY, player_id CHAR(36) NOT NULL, mission_id INT NOT NULL, evidence_path VARCHAR(500) NOT NULL, status ENUM('pending','rejected') NOT NULL DEFAULT 'pending', submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL, UNIQUE KEY uniq_pending_player_mission(player_id,mission_id), CONSTRAINT fk_submission_player FOREIGN KEY(player_id) REFERENCES hunt_players(id) ON DELETE CASCADE, CONSTRAINT fk_submission_mission FOREIGN KEY(mission_id) REFERENCES hunt_missions(id) ON DELETE CASCADE)`);
      await c.execute("INSERT IGNORE INTO hunt_settings (id,start_date) VALUES (1,?)", [process.env.MISSION_START_DATE ?? "2026-08-25"]);
      await seed(c);
    } finally { c.release(); }
  })();
  return global.seniorHuntReady;
}

export async function settings() {
  await ensureDb();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(start_date,'%Y-%m-%d') startDate FROM hunt_settings WHERE id=1");
  return rows[0] as { startDate: string };
}

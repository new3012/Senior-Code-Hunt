# ติดตั้งระบบผู้เล่นและหลังบ้าน (ทำครั้งเดียว)

## 1. สร้างฐานข้อมูลบน VPS
เปลี่ยน `CHANGE_THIS_DATABASE_PASSWORD` ใน `database/schema.sql` แล้วรัน:
```bash
cd /home/discordbot/projects/senior-code-hunt
sudo mysql < database/schema.sql
```

## 2. สร้างรหัสผ่านหลังบ้านแบบ Hash
```bash
npm ci
node scripts/hash-password.mjs "รหัสผ่านของนิว"
```

## 3. สร้าง `.env.production` บน VPS
```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=seniorhunt
DB_PASSWORD=รหัสฐานข้อมูลจากข้อ 1
DB_NAME=senior_hunt
SESSION_SECRET=ข้อความสุ่มยาวอย่างน้อย-32-ตัวอักษร
ADMIN_PASSWORD_HASH=ค่า-hash-จากข้อ-2
OPENAI_API_KEY=คีย์-OpenAI
OPENAI_VISION_MODEL=gpt-4o-mini
PRIVATE_UPLOAD_DIR=/home/discordbot/private/senior-code-hunt
MISSION_START_DATE=2026-08-25
```
ห้าม Push ไฟล์นี้ขึ้น GitHub เปลี่ยนวันเริ่มภายหลังได้จาก `/admin`

## 4. Build และ Restart
```bash
npm run build
pm2 restart senior-code-hunt
pm2 save
```

- เว็บผู้เล่น: `https://seniorhunt.nexspacehub.com`
- หลังบ้าน: `https://seniorhunt.nexspacehub.com/admin`
- รูปไม่ผ่านจะไม่ถูกเก็บ รูปผ่านเก็บ private และลบเมื่อเกิน 7 วันในครั้งถัดไปที่เปิดหลังบ้าน
- AI ตรวจองค์ประกอบตามโจทย์เท่านั้น ไม่ระบุตัวตนหรือจดจำใบหน้า

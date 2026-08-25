@echo off
chcp 65001 >nul
setlocal

echo ========================================
echo   Senior Code Hunt - GitHub Deploy
echo ========================================

git status
git add .
set /p commit_message=ข้อความอัปเดต: 
if "%commit_message%"=="" set commit_message=Update Senior Code Hunt
git commit -m "%commit_message%"
if errorlevel 1 (
  echo ไม่มีไฟล์ใหม่ให้ Commit หรือเกิดข้อผิดพลาด
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo Push ไม่สำเร็จ กรุณาตรวจสอบ GitHub
  pause
  exit /b 1
)

echo อัปโหลดขึ้น GitHub สำเร็จ กำลังอัปเดต VPS...
ssh discordbot@194.163.174.4 "cd /home/discordbot/projects/senior-code-hunt && git pull --ff-only origin main && npm ci && npm run build && pm2 restart senior-code-hunt && pm2 save"
if errorlevel 1 (
  echo อัปเดต VPS ไม่สำเร็จ เว็บไซต์เดิมยังทำงานอยู่ กรุณาอ่าน DEPLOY_GUIDE.md
  pause
  exit /b 1
)
echo Deploy สำเร็จ: https://seniorhunt.nexspacehub.com
pause

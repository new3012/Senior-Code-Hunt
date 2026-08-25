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

echo อัปโหลดขึ้น GitHub สำเร็จ
echo จากนั้นเข้า VPS และรันคำสั่งใน DEPLOY_GUIDE.md
pause


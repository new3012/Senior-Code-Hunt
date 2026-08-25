@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   Senior Code Hunt - Auto Deploy
echo ========================================

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git was not found.
  pause
  exit /b 1
)

git status --short
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update Senior Code Hunt"
  if errorlevel 1 (
    echo ERROR: Git commit failed.
    pause
    exit /b 1
  )
) else (
  echo No local changes. Continuing with deploy...
)

git push origin main
if errorlevel 1 (
  echo ERROR: GitHub push failed.
  pause
  exit /b 1
)

echo Updating VPS...
ssh discordbot@194.163.174.4 "cd /home/discordbot/projects/senior-code-hunt && git restore next-env.d.ts && git pull --ff-only origin main && npm ci && npm run build && pm2 restart senior-code-hunt && pm2 save"
if errorlevel 1 (
  echo ERROR: VPS deploy failed. The previous website may still be running.
  pause
  exit /b 1
)

echo ========================================
echo Deploy completed successfully.
echo https://seniorhunt.nexspacehub.com
echo ========================================
pause

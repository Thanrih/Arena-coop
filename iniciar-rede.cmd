@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js antes de iniciar o jogo.
  pause
  exit /b 1
)
if not exist node_modules\ws (
  call npm install --omit=dev
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm start
pause

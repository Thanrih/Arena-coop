@echo off
setlocal
title Centipede Arena - Servidor local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: instale o Node.js 20 ou mais recente em https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\ws" (
  echo Instalando dependencias do servidor...
  call npm install --omit=dev
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)
echo Iniciando o servidor autoritativo das salas multiplayer...
echo Jogadores desta maquina usam http://localhost:3000
echo.
node server.js
echo.
echo O servidor foi encerrado.
pause

@echo off
setlocal
cd /d "%~dp0"
title HobbyVerse AI

cls
echo ================================================
echo              HOBBYVERSE AI STORE
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 goto NODE_OLD

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-ai.ps1"
if errorlevel 1 goto CONFIG_FAILED

echo.
echo Dang khoi dong website...
echo Dia chi: http://127.0.0.1:3000
echo Giu cua so nay mo trong luc su dung.
echo Nhan Ctrl+C de dung website.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:3000'"
node server.js

echo.
echo Website da dung.
pause
exit /b 0

:NODE_MISSING
echo [THIEU NODE.JS]
echo HobbyVerse can Node.js 20 tro len de chay may chu AI.
echo Hay cai Node.js tai https://nodejs.org/ (khong can cai VS Code).
echo Sau khi cai xong, dong cua so nay va nhap dup start.bat.
start "" "https://nodejs.org/"
pause
exit /b 1

:NODE_OLD
echo [NODE.JS QUA CU]
echo Hay cap nhat Node.js len phien ban 20 tro len tai https://nodejs.org/
start "" "https://nodejs.org/"
pause
exit /b 1

:CONFIG_FAILED
echo.
echo Chua cau hinh duoc Gemini. Hay chay configure-ai.bat de nhap lai API key.
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0"
where powershell >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Windows PowerShell.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-ai.ps1" -Force
if errorlevel 1 (
  echo Cau hinh that bai. Hay thu lai.
) else (
  echo.
  echo Da cap nhat API key. Hay chay start.bat de mo website.
)
pause

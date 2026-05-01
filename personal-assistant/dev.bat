@echo off
setlocal EnableExtensions
title Personal Assistant - dev
cd /d "%~dp0"
if errorlevel 1 (
  echo  Could not change to script folder.
  pause
  exit /b 1
)

if not exist package.json (
  echo  Run this from the folder that contains package.json - the inner personal-assistant directory.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  npm was not found on PATH. Install Node.js LTS, then reopen this window.
  pause
  exit /b 1
)

echo.
echo  App folder: %CD%
echo  Starting Vite + Electron. Close the Electron window or press Ctrl+C here to stop.
echo.

if not exist node_modules (
  echo  First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
  )
)

call npm run dev
set "EXITCODE=%ERRORLEVEL%"

echo.
if not "%EXITCODE%"=="0" echo  npm run dev exited with code %EXITCODE%
pause
endlocal
exit /b %EXITCODE%

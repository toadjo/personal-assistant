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
  echo  Expected package.json in the same folder as dev.bat ^(repository root^).
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  npm was not found on PATH. Install Node.js 22.12 or newer ^(see README^), then reopen this window.
  pause
  exit /b 1
)

echo.
echo  App folder: %CD%
echo  Closing existing Personal Assistant/Electron dev windows...
taskkill /IM electron.exe /F >nul 2>nul
taskkill /IM PersonalAssistant.exe /F >nul 2>nul
taskkill /IM PersonalAssistantSetup.exe /F >nul 2>nul

echo  Rebuilding main/preload once before dev launch...
call npm run build:main
if errorlevel 1 (
  echo  build:main failed.
  pause
  exit /b 1
)

echo  Starting Vite + Electron. Close the Electron window or press Ctrl+C here to stop.
echo  If the window still looks old, close the installed tray app and run this file again.
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

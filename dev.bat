@echo off
setlocal EnableExtensions
title Personal Assistant - dev
set "REPO_ROOT=%~dp0"
set "APP_DIR=%REPO_ROOT%personal-assistant"

if not exist "%APP_DIR%\package.json" (
  echo.
  echo  Expected: "%APP_DIR%\package.json"
  echo  Put this dev.bat in the repository root next to the inner "personal-assistant" app folder.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  npm was not found on PATH. Install Node.js LTS, then reopen this window.
  pause
  exit /b 1
)

pushd "%APP_DIR%"
if errorlevel 1 (
  echo  Could not open app folder: "%APP_DIR%"
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
    popd
    pause
    exit /b 1
  )
)

call npm run dev
set "EXITCODE=%ERRORLEVEL%"
popd

echo.
if not "%EXITCODE%"=="0" echo  npm run dev exited with code %EXITCODE%
pause
endlocal
exit /b %EXITCODE%

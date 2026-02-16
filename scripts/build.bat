@echo off
REM Electron Boilerplate Build Script for Windows
REM Offline CI/CD - builds app for Windows

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Electron App Build Script (Windows)
echo ========================================
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
  )
)

echo Building Windows application...
call npm run build -- --win
if errorlevel 1 (
  echo [ERROR] Build failed
  exit /b 1
)

echo.
echo [SUCCESS] Build completed!
echo Output: .\dist
dir dist\
pause

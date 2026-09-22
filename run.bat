@echo off
title AI Video Greeting Runner
echo ========================================================
echo   AI Personalized Video Greeting System - Launcher
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check Server Dependencies
if not exist "server\node_modules" (
    echo [1/3] Installing Server Dependencies...
    cd server
    call npm install
    cd ..
) else (
    echo [1/3] Server dependencies already installed.
)

:: 2. Check Client Dependencies
if not exist "client\node_modules" (
    echo [2/3] Installing Client Dependencies...
    cd client
    call npm install
    cd ..
) else (
    echo [2/3] Client dependencies already installed.
)

echo.
echo [3/3] Starting Backend Server and Frontend Client...
echo.

:: Launch Server in new terminal window
start "AI Video Greeting - Backend Server (Port 5000)" /D "%~dp0server" cmd /k npm run dev

:: Launch Client in new terminal window
start "AI Video Greeting - Frontend Client (Port 5173)" /D "%~dp0client" cmd /k npm run dev

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo ========================================================
echo   Application is running!
echo   - Backend:  http://localhost:5000/api/health
echo   - Frontend: http://localhost:5173
echo ========================================================

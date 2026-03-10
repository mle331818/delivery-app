@echo off
REM Sushi Delivery System - Development Startup Script (Batch)
REM This script starts both backend and frontend servers concurrently

echo.
echo ========================================
echo   Sushi Stun Delivery - Dev Start
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js v18 or higher from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
echo.

REM Check backend dependencies
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

REM Check frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

echo.
echo ========================================
echo   Starting Servers...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop
echo.

REM Start backend server in new window
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

REM Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

REM Start frontend server in new window
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo [OK] Both servers started!
echo.
echo Open http://localhost:3000 in your browser
echo.
pause

# Sushi Delivery System - Development Startup Script
# This script starts both backend and frontend servers concurrently

Write-Host "🍣 Starting Sushi Stun Delivery..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js v18 or higher." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ npm is not installed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

# Check and install backend dependencies
if (-Not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "✓ Backend dependencies already installed" -ForegroundColor Green
}

# Check and install frontend dependencies
if (-Not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "✓ Frontend dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting servers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend will run on: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host ""

# Start backend in a new window
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend Server' -ForegroundColor Magenta; npm start" -PassThru

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start frontend in a new window
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '⚛️  Frontend Server' -ForegroundColor Cyan; npm run dev" -PassThru

Write-Host "✓ Both servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Server Process IDs:" -ForegroundColor Yellow
Write-Host "   Backend PID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host ""
Write-Host "To stop servers, close the terminal windows or run:" -ForegroundColor Gray
Write-Host "   Stop-Process -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Stop-Process -Id $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""

# Sushi Delivery System - Stop Development Servers
# This script stops all running Node.js processes for the backend and frontend

Write-Host "🛑 Stopping Sushi Stun Delivery servers..." -ForegroundColor Yellow
Write-Host ""

# Find and stop processes running on port 5000 (backend)
$backendProcesses = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($backendProcesses) {
    foreach ($pid in $backendProcesses) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $pid -Force
                Write-Host "✓ Stopped backend server (PID: $pid)" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "✗ Could not stop process $pid" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "ℹ No backend server running on port 5000" -ForegroundColor Gray
}

# Find and stop processes running on port 3000 (frontend)
$frontendProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($frontendProcesses) {
    foreach ($pid in $frontendProcesses) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $pid -Force
                Write-Host "✓ Stopped frontend server (PID: $pid)" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "✗ Could not stop process $pid" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "ℹ No frontend server running on port 3000" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✓ All servers stopped!" -ForegroundColor Green
Write-Host ""

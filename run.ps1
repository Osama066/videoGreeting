Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AI Personalized Video Greeting System - Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# 1. Server Dependencies
if (-not (Test-Path "$RootPath\server\node_modules")) {
    Write-Host "[1/3] Installing Server Dependencies..." -ForegroundColor Yellow
    Set-Location "$RootPath\server"
    npm install
} else {
    Write-Host "[1/3] Server dependencies already installed." -ForegroundColor Green
}

# 2. Client Dependencies
if (-not (Test-Path "$RootPath\client\node_modules")) {
    Write-Host "[2/3] Installing Client Dependencies..." -ForegroundColor Yellow
    Set-Location "$RootPath\client"
    npm install
} else {
    Write-Host "[2/3] Client dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] Starting Backend Server and Frontend Client..." -ForegroundColor Cyan

# Start Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\server'; npm run dev"

# Start Client
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\client'; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Application is running!" -ForegroundColor Green
Write-Host "  - Backend:  http://localhost:5000/api/health" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

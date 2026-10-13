Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "        Launching AI-Powered Resume Builder" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. PostgreSQL
$pgCheck = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
if ($pgCheck) {
    Write-Host "[OK] PostgreSQL is already active on port 5433." -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL cluster in .pgdata..." -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "$PSScriptRoot\.pgdata" -l "$PSScriptRoot\.pgdata\pg.log" -o "-p 5433" start
}

# 2. Backend
Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", ".venv\Scripts\uvicorn.exe app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory "$PSScriptRoot\backend"


# 3. Frontend
Write-Host "Starting React Frontend on port 5173..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "npm run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
Write-Host "Application launched at http://localhost:5173!" -ForegroundColor Green

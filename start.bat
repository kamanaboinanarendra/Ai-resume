@echo off
setlocal
cd /d "%~dp0"
title AI Resume Builder Launcher

echo ========================================================
echo         Launching AI-Powered Resume Builder
echo ========================================================
echo.

:: 1. Ensure PostgreSQL is running on port 5433
echo [1/3] Checking PostgreSQL database on port 5433...
netstat -ano | findstr ":5433" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] PostgreSQL is already active on port 5433.
) else (
    echo Starting PostgreSQL cluster in .pgdata...
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "%~dp0.pgdata" -l "%~dp0.pgdata\pg.log" -o "-p 5433" start
)

:: 2. Launch Backend
echo.
echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "AI Resume Builder - Backend" /D "%~dp0backend" cmd /k ".venv\Scripts\uvicorn.exe app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload"

:: 3. Launch Frontend
echo.
echo [3/3] Starting React / Vite Frontend on http://localhost:5173...
start "AI Resume Builder - Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

:: 4. Wait 3 seconds using ping (safe across all Windows versions)
echo.
echo ========================================================
echo  All services are launching!
echo  Opening http://localhost:5173 in your default browser...
echo ========================================================
ping 127.0.0.1 -n 4 >nul

start http://localhost:5173

echo.
echo ========================================================
echo  Application is running!
echo  Keep the Backend and Frontend command windows open.
echo  To shut down everything later, double-click stop.bat.
echo ========================================================
echo.
pause

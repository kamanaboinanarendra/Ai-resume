@echo off
title Stopping AI Resume Builder
echo ========================================================
echo         Stopping AI-Powered Resume Builder
echo ========================================================
echo.

echo [1/2] Stopping PostgreSQL on port 5433...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "%~dp0.pgdata" stop >nul 2>&1

echo [2/2] Stopping servers...
taskkill /F /FI "WINDOWTITLE eq AI Resume Builder*" >nul 2>&1

echo.
echo All services stopped cleanly.
timeout /t 2 /nobreak >nul

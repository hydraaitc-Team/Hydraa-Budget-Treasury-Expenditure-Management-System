@echo off
title HYDRAA Treasury Management System - Production Runner
echo ================================================================
echo HYDRAA Budget, Treasury & Expenditure Management System
echo Government of Telangana
echo ================================================================
echo.
echo Starting Production Servers...
echo 1. Backend REST API on http://localhost:4000
echo 2. Web Portal UI on http://localhost:3000
echo.

start "HYDRAA Backend API (Port 4000)" cmd /k "cd /d "%~dp0apps\backend" && node dist/main"
timeout /t 3 /nobreak >nul
start "HYDRAA Web Portal (Port 3000)" cmd /k "cd /d "%~dp0apps\web" && node node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000"

echo.
echo ================================================================
echo System is launching!
echo Access the portal in your browser:
echo Local:   http://localhost:3000
echo Network: http://192.168.0.210:3000
echo Backend: http://localhost:4000/api/docs
echo ================================================================
echo.


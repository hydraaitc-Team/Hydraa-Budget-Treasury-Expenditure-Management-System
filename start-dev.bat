@echo off
title HYDRAA Treasury Management System - Development Mode
echo ================================================================
echo HYDRAA Budget, Treasury & Expenditure Management System (DEV)
echo Government of Telangana
echo ================================================================
echo.
echo Starting Development Watch Mode...
echo.

start "HYDRAA Backend Dev (Port 4000)" cmd /k "cd /d "%~dp0apps\backend" && node node_modules/@nestjs/cli/bin/nest.js start --watch"
timeout /t 3 /nobreak >nul
start "HYDRAA Web Dev (Port 3000)" cmd /k "cd /d "%~dp0apps\web" && node node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 3000"

echo.
echo Development servers started in separate terminal windows.
echo Portal:  http://localhost:3000
echo Swagger: http://localhost:4000/api/docs
echo.

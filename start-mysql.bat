@echo off
title Start MySQL80 Service - HYDRAA Treasury
echo ================================================================
echo Starting MySQL 8.0 Service for HYDRAA Financial System...
echo ================================================================
echo.

net start MySQL80

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] MySQL80 service is running on port 3306!
) else (
    echo.
    echo [WARNING] Could not start service directly.
    echo Please right-click this file and choose "Run as administrator",
    echo OR open Windows Services (services.msc), find "MySQL80", and click "Start".
)
echo.
pause


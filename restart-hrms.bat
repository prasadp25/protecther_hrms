@echo off
REM ===================================================
REM HRMS Application Restart Script
REM ===================================================
REM This script restarts the HRMS application
REM ===================================================

echo ========================================
echo Restarting HRMS Application...
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Restart all PM2 processes
call pm2 restart all

if errorlevel 1 (
    echo ERROR: Failed to restart HRMS application
    pause
    exit /b 1
)

echo.
echo ========================================
echo HRMS Application Restarted Successfully!
echo ========================================
echo.
echo Frontend: http://localhost:8000
echo Backend API: http://localhost:8001
echo.

timeout /t 5

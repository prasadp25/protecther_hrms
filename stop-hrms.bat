@echo off
REM ===================================================
REM HRMS Application Stop Script
REM ===================================================
REM This script stops the HRMS application
REM ===================================================

echo ========================================
echo Stopping HRMS Application...
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Stop all PM2 processes
call pm2 stop all

if errorlevel 1 (
    echo ERROR: Failed to stop HRMS application
    pause
    exit /b 1
)

echo.
echo ========================================
echo HRMS Application Stopped Successfully!
echo ========================================
echo.

timeout /t 5

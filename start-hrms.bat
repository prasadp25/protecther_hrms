@echo off
REM ===================================================
REM HRMS Application Startup Script
REM ===================================================
REM This script starts the HRMS application using PM2
REM Run this script to start both frontend and backend
REM ===================================================

echo ========================================
echo Starting HRMS Application...
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if PM2 is installed
call pm2 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PM2 is not installed!
    echo Please install PM2 using: npm install -g pm2
    pause
    exit /b 1
)

REM Check if MySQL service is running
echo Checking MySQL service...
sc query MySQL | find "RUNNING" >nul
if errorlevel 1 (
    echo WARNING: MySQL service is not running!
    echo Starting MySQL service...
    net start MySQL
    if errorlevel 1 (
        echo ERROR: Failed to start MySQL service
        echo Please start it manually from Services or check service name
        echo Common service names: MySQL, MySQL80, MySQL57
        pause
        exit /b 1
    )
)

echo MySQL service is running
echo.

REM Start the application using PM2
echo Starting HRMS with PM2...
call pm2 start ecosystem.config.js

if errorlevel 1 (
    echo ERROR: Failed to start HRMS application
    pause
    exit /b 1
)

echo.
echo ========================================
echo HRMS Application Started Successfully!
echo ========================================
echo.
echo Frontend: http://localhost:8000
echo Backend API: http://localhost:8001
echo.
echo Useful Commands:
echo   pm2 status          - Check application status
echo   pm2 logs            - View application logs
echo   pm2 monit           - Monitor applications
echo   pm2 restart all     - Restart all applications
echo   pm2 stop all        - Stop all applications
echo.
echo To access from other devices on network:
echo   Frontend: http://YOUR_IP:8000
echo   Backend API: http://YOUR_IP:8001
echo.
echo ========================================

timeout /t 10

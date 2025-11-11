@echo off
REM ===================================================
REM HRMS Automatic Backup Scheduler Setup
REM ===================================================
REM This script creates a Windows scheduled task for
REM automatic daily database backups
REM Run this script as Administrator
REM ===================================================

echo ========================================
echo HRMS Backup Scheduler Setup
echo ========================================
echo.
echo This will create a scheduled task to backup
echo the database daily at 2:00 AM
echo.
echo NOTE: You must run this script as Administrator
echo.
pause

REM Navigate to the project directory
cd /d "%~dp0"

REM Get the full path to backup script
set BACKUP_SCRIPT=%~dp0backup-database.bat

echo.
echo Creating scheduled task...
echo Task Name: HRMS_Daily_Backup
echo Schedule: Daily at 2:00 AM
echo Script: %BACKUP_SCRIPT%
echo.

REM Delete existing task if it exists
schtasks /delete /tn "HRMS_Daily_Backup" /f >nul 2>&1

REM Create new scheduled task
schtasks /create /tn "HRMS_Daily_Backup" /tr "\"%BACKUP_SCRIPT%\" auto" /sc daily /st 02:00 /ru SYSTEM /f

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create scheduled task
    echo.
    echo Please make sure:
    echo   1. You are running this script as Administrator
    echo   2. Task Scheduler service is running
    echo.
    echo To run as Administrator:
    echo   - Right-click this file
    echo   - Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Scheduled Task Created Successfully!
echo ========================================
echo.
echo Task Details:
echo   Name: HRMS_Daily_Backup
echo   Runs: Daily at 2:00 AM
echo   Action: Database backup
echo   Backups stored in: backups\database\
echo.
echo You can view/modify this task in:
echo   Task Scheduler ^> Task Scheduler Library
echo.
echo To test the backup now, run:
echo   backup-database.bat
echo.
echo ========================================

pause

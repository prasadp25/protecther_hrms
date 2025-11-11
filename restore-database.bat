@echo off
REM ===================================================
REM HRMS Database Restore Script
REM ===================================================
REM This script restores the HRMS database from a backup
REM WARNING: This will overwrite the current database!
REM ===================================================

echo ========================================
echo HRMS Database Restore
echo ========================================
echo.
echo WARNING: This will OVERWRITE your current database!
echo Make sure you have a recent backup before proceeding.
echo.
pause

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if backups directory exists
if not exist "backups\database\" (
    echo ERROR: No backup directory found!
    echo Expected: backups\database\
    pause
    exit /b 1
)

REM List available backups
echo.
echo Available backups:
echo ========================================
dir /b /o-d "backups\database\*.sql"
echo ========================================
echo.

REM Prompt for backup file
set /p BACKUP_FILE="Enter backup filename (from list above): "

REM Validate backup file exists
if not exist "backups\database\%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    pause
    exit /b 1
)

echo.
echo Selected backup: %BACKUP_FILE%
echo.
echo WARNING: This will DESTROY all current data!
set /p CONFIRM="Type 'YES' to confirm restore: "

if not "%CONFIRM%"=="YES" (
    echo Restore cancelled.
    pause
    exit /b 0
)

REM Check if MySQL is accessible
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL client is not installed or not in PATH!
    pause
    exit /b 1
)

REM Prompt for MySQL password
set /p DB_PASSWORD="Enter MySQL root password: "

echo.
echo ========================================
echo Starting Restore Process
echo ========================================
echo.

REM Stop the application first
echo Stopping HRMS application...
call pm2 stop all >nul 2>&1

echo Restoring database from backup...
mysql -u root -p%DB_PASSWORD% < "backups\database\%BACKUP_FILE%" 2>nul

if errorlevel 1 (
    echo.
    echo ERROR: Restore failed!
    echo Please check:
    echo   1. MySQL server is running
    echo   2. Password is correct
    echo   3. Backup file is valid
    pause
    exit /b 1
)

echo.
echo ========================================
echo Restore Completed Successfully!
echo ========================================
echo.
echo Restarting HRMS application...
call pm2 restart all >nul 2>&1

echo.
echo Database restored from: %BACKUP_FILE%
echo HRMS application restarted
echo ========================================
echo.

pause

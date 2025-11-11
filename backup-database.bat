@echo off
REM ===================================================
REM HRMS Database Backup Script
REM ===================================================
REM This script creates a backup of the HRMS database
REM Recommended: Run daily via Windows Task Scheduler
REM ===================================================

echo ========================================
echo HRMS Database Backup
echo ========================================
echo.

REM Navigate to the project directory
cd /d "%~dp0"

REM Create backups directory if it doesn't exist
if not exist "backups" mkdir backups
if not exist "backups\database" mkdir backups\database

REM Check if MySQL is accessible
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL client is not installed or not in PATH!
    echo Backup failed!
    exit /b 1
)

REM Set backup filename with timestamp
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=backups\database\hrms_backup_%TIMESTAMP%.sql

echo Creating backup...
echo Backup file: %BACKUP_FILE%
echo.

REM Read MySQL password from .env file or prompt
if exist "backend\.env" (
    REM Try to read password from .env file
    for /f "tokens=2 delims==" %%a in ('type backend\.env ^| findstr /b "DB_PASSWORD"') do set DB_PASSWORD=%%a
)

if "%DB_PASSWORD%"=="" (
    set /p DB_PASSWORD="Enter MySQL root password: "
)

REM Perform backup
mysqldump -u root -p%DB_PASSWORD% --databases hrms_db --add-drop-database --routines --triggers --events > "%BACKUP_FILE%" 2>nul

if errorlevel 1 (
    echo.
    echo ERROR: Backup failed!
    echo Please check:
    echo   1. MySQL server is running
    echo   2. Password is correct
    echo   3. Database 'hrms_db' exists
    echo   4. Sufficient disk space available
    exit /b 1
)

REM Get file size
for %%A in ("%BACKUP_FILE%") do set BACKUP_SIZE=%%~zA

echo.
echo ========================================
echo Backup Completed Successfully!
echo ========================================
echo File: %BACKUP_FILE%
echo Size: %BACKUP_SIZE% bytes
echo Time: %date% %time%
echo ========================================
echo.

REM Clean up old backups (keep last 30 days)
echo Cleaning up old backups (keeping last 30 days)...
forfiles /p "backups\database" /m *.sql /d -30 /c "cmd /c del @path" 2>nul
if errorlevel 1 (
    echo No old backups to clean
) else (
    echo Old backups cleaned
)

echo.
echo Backup process complete!
echo.

REM Don't pause if run by scheduler
if "%1"=="" (
    timeout /t 5
)

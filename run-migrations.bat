@echo off
REM ===================================================
REM HRMS Database Migration Runner
REM ===================================================
REM This script automatically runs all database migrations
REM Run this ONCE during initial setup
REM ===================================================

echo ========================================
echo HRMS Database Migration Runner
echo ========================================
echo.
echo This will create the database and run all migrations.
echo.
echo Prerequisites:
echo   - MySQL server must be running
echo   - You need the MySQL root password
echo.
pause

REM Navigate to the project directory
cd /d "%~dp0"

REM Check if MySQL is accessible
echo.
echo Checking MySQL connection...
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL client is not installed or not in PATH!
    echo Please ensure MySQL is installed and added to system PATH
    pause
    exit /b 1
)

echo MySQL client found
echo.

REM Prompt for MySQL password
set /p MYSQL_PASSWORD="Enter MySQL root password: "

echo.
echo ========================================
echo Step 1: Creating Database
echo ========================================
echo.

REM Create database
mysql -u root -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS hrms_db;" 2>nul

if errorlevel 1 (
    echo ERROR: Failed to create database
    echo Please check:
    echo   1. MySQL server is running
    echo   2. Password is correct
    echo   3. Root user has CREATE DATABASE permission
    pause
    exit /b 1
)

echo Database 'hrms_db' created successfully
echo.

REM Check if migration files exist
if not exist "backend\database\migrations\" (
    echo ERROR: Migration folder not found!
    echo Expected: backend\database\migrations\
    pause
    exit /b 1
)

echo ========================================
echo Step 2: Running Migrations
echo ========================================
echo.

REM Run each migration file
set MIGRATION_COUNT=0

for %%f in (backend\database\migrations\*.sql) do (
    echo Running migration: %%~nxf
    mysql -u root -p%MYSQL_PASSWORD% hrms_db < "%%f"

    if errorlevel 1 (
        echo ERROR: Migration failed for %%~nxf
        echo Please check the SQL file and database logs
        pause
        exit /b 1
    )

    echo ✓ %%~nxf completed
    set /a MIGRATION_COUNT+=1
    echo.
)

echo.
echo ========================================
echo Migration Summary
echo ========================================
echo Total migrations run: %MIGRATION_COUNT%
echo Database: hrms_db
echo Status: SUCCESS
echo ========================================
echo.

REM Check if calendar days fix script exists
if exist "backend\database\fix-calendar-days.sql" (
    echo.
    echo Found calendar days fix script.
    set /p RUN_FIX="Do you want to run the calendar days fix? (Y/N): "

    if /i "%RUN_FIX%"=="Y" (
        echo Running calendar days fix...
        mysql -u root -p%MYSQL_PASSWORD% hrms_db < "backend\database\fix-calendar-days.sql"

        if errorlevel 1 (
            echo WARNING: Calendar days fix failed
            echo You may need to run it manually
        ) else (
            echo ✓ Calendar days fix completed
        )
    )
)

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo   1. Copy DEPLOYMENT_CONFIG_PC09.env.backend to backend\.env
echo   2. Update the DB_PASSWORD in backend\.env
echo   3. Copy DEPLOYMENT_CONFIG_PC09.env.frontend to frontend\.env
echo   4. Run: npm install in both backend and frontend folders
echo   5. Build frontend: cd frontend && npm run build
echo   6. Start application: start-hrms.bat
echo.
echo ========================================

pause

@echo off
REM ====================================
REM HRMS Database Setup Script
REM ====================================

echo.
echo ====================================
echo HRMS Database Setup
echo ====================================
echo.

REM Check if MySQL is installed
where mysql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] MySQL command not found!
    echo.
    echo Please install MySQL first:
    echo 1. Download from: https://dev.mysql.com/downloads/mysql/
    echo 2. OR install XAMPP: https://www.apacheframeworkdownload.com/download/xampp-windows
    echo.
    echo After installation, add MySQL to PATH:
    echo - XAMPP: C:\xampp\mysql\bin
    echo - MySQL: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    pause
    exit /b 1
)

echo [INFO] MySQL command found!
echo.

REM Prompt for MySQL password
set /p MYSQL_PASSWORD="Enter MySQL root password (leave empty if no password): "
echo.

REM Test MySQL connection
echo [INFO] Testing MySQL connection...
if "%MYSQL_PASSWORD%"=="" (
    mysql -u root -e "SELECT 1;" >nul 2>&1
) else (
    mysql -u root -p%MYSQL_PASSWORD% -e "SELECT 1;" >nul 2>&1
)

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot connect to MySQL!
    echo Please check:
    echo - MySQL service is running
    echo - Password is correct
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Connected to MySQL successfully!
echo.

REM Create database
echo [INFO] Creating database and tables...
if "%MYSQL_PASSWORD%"=="" (
    mysql -u root < "backend\database\migrations\001_create_database.sql"
) else (
    mysql -u root -p%MYSQL_PASSWORD% < "backend\database\migrations\001_create_database.sql"
)

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create database!
    pause
    exit /b 1
)

echo [SUCCESS] Database created successfully!
echo.

REM Ask about seed data
set /p LOAD_SEED="Do you want to load sample data? (y/n): "
if /i "%LOAD_SEED%"=="y" (
    echo [INFO] Loading seed data...
    if "%MYSQL_PASSWORD%"=="" (
        mysql -u root < "backend\database\seeds\001_seed_data.sql"
    ) else (
        mysql -u root -p%MYSQL_PASSWORD% < "backend\database\seeds\001_seed_data.sql"
    )

    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Failed to load seed data, but database is ready.
    ) else (
        echo [SUCCESS] Seed data loaded successfully!
    )
    echo.
)

REM Update .env file with password
echo [INFO] Updating .env file...
powershell -Command "(gc backend\.env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%MYSQL_PASSWORD%' | Out-File -encoding ASCII backend\.env"
echo [SUCCESS] Configuration updated!
echo.

echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Database: hrms_db
echo User: root
echo Password: %MYSQL_PASSWORD%
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& npm run dev
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo 3. Open browser: http://localhost:5173
echo.
if /i "%LOAD_SEED%"=="y" (
    echo Default login credentials:
    echo - Admin: username=admin, password=admin123
    echo - HR: username=hr, password=hr123
    echo.
)
echo ====================================
pause

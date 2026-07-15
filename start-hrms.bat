
@echo off
echo ============================================
echo HRMS Startup Script
echo ============================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

cd /d C:\hrms-frontend

:: Step 1: Check MySQL
echo [1/4] Checking MySQL service...
sc query MySQL | find "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo      MySQL not running, starting...
    net start MySQL >nul 2>&1
    timeout /t 3 >nul
)
echo      MySQL is running.

:: Step 2: Test MySQL connection (credentials come from backend\.env)
echo [2/4] Testing MySQL connection...
set DB_USER=
set DB_PASSWORD=
if exist "backend\.env" (
    for /f "tokens=2 delims==" %%a in ('type backend\.env ^| findstr /b "DB_USER"') do set DB_USER=%%a
    for /f "tokens=2 delims==" %%a in ('type backend\.env ^| findstr /b "DB_PASSWORD"') do set DB_PASSWORD=%%a
)
if "%DB_USER%"=="" set DB_USER=root

mysql -u %DB_USER% -p%DB_PASSWORD% -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo      ERROR: Cannot connect to MySQL with credentials from backend\.env
    echo      Check that MySQL is running and DB_USER/DB_PASSWORD in backend\.env are correct.
    echo      Do NOT reset the MySQL password blindly - investigate first.
    pause
    exit /b 1
)
echo      MySQL connection OK.

:: Step 3: Start/reload PM2 services (does not touch other PM2 apps)
echo [3/4] Starting PM2 services...
pm2 startOrReload ecosystem.config.js >nul 2>&1
timeout /t 3 >nul
echo      PM2 services started.

:: Step 4: Show status
echo [4/4] Checking status...
echo.
pm2 status
echo.
echo ============================================
echo HRMS Started Successfully!
echo ============================================
echo.
echo Frontend: http://192.168.1.36:8000
echo Backend:  http://192.168.1.36:8001/api/v1
echo Public:   https://hr.protecther.in
echo.
echo NOTE: Production builds use frontend\.env.production (not .env)
echo See STARTUP_GUIDE.md for instructions
echo.
pause
exit /b 0

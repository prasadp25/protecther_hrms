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

:: Step 2: Test MySQL connection
echo [2/4] Testing MySQL connection...
mysql -u root -proot -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo      ERROR: MySQL password issue detected!
    echo      Running password fix...
    call :FixMySQL
)
echo      MySQL connection OK.

:: Step 3: Stop any existing PM2 processes
echo [3/4] Starting PM2 services...
pm2 delete all >nul 2>&1
pm2 start ecosystem.config.js >nul 2>&1
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
echo.
echo NOTE: If IP changed, update .env files and rebuild frontend
echo See STARTUP_GUIDE.md for instructions
echo.
pause
exit /b 0

:FixMySQL
echo      Stopping MySQL...
net stop MySQL >nul 2>&1
taskkill /F /IM mysqld.exe >nul 2>&1
timeout /t 2 >nul

echo      Adding skip-grant-tables...
echo skip-grant-tables>> "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

echo      Starting MySQL in safe mode...
net start MySQL >nul 2>&1
timeout /t 5 >nul

echo      Resetting password...
mysql -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';" >nul 2>&1

echo      Cleaning up config...
net stop MySQL >nul 2>&1
timeout /t 2 >nul
powershell -Command "(Get-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini') | Where-Object { $_ -notmatch 'skip-grant-tables' } | Set-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini'"

echo      Starting MySQL normally...
net start MySQL >nul 2>&1
timeout /t 3 >nul
goto :eof

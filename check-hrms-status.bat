@echo off
REM ========================================
REM HRMS Status Check Script
REM ========================================

echo ========================================
echo HRMS System Status
echo ========================================
echo.

cd /d C:\hrms-frontend

echo Checking MySQL service...
sc query MySQL80 | find "RUNNING" > nul
if errorlevel 1 (
    echo [X] MySQL: NOT RUNNING
) else (
    echo [OK] MySQL: RUNNING
)

echo.
echo Checking PM2 processes...
pm2 status

echo.
echo Testing HRMS access...
curl -s -o nul -w "Frontend (port 8000): %%{http_code}\n" http://localhost:8000
curl -s -o nul -w "Backend (port 8001): %%{http_code}\n" http://localhost:8001/api/v1/health

echo.
echo ========================================
echo.
echo If you see "200" above, HRMS is working!
echo Access HRMS at: http://192.168.1.33:8000
echo.
pause

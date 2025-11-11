@echo off
REM ===================================================
REM HRMS Application Status Check Script
REM ===================================================

echo ========================================
echo HRMS Application Status
echo ========================================
echo.

call pm2 status

echo.
echo ========================================
echo Access URLs:
echo ========================================
echo Frontend: http://localhost:8000
echo Backend API: http://localhost:8001
echo.

pause

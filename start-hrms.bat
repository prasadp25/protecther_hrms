@echo off
REM ====================================
REM HRMS Quick Start Script
REM ====================================

echo.
echo ====================================
echo Starting HRMS System
echo ====================================
echo.

REM Start MySQL Server
echo [1/3] Starting MySQL Server...
start "MySQL Server" /MIN C:\mysql\bin\mysqld.exe --defaults-file=C:\mysql\my.ini --console
timeout /t 3 /nobreak >nul
echo ✓ MySQL Server started on port 3306
echo.

REM Start Backend
echo [2/3] Starting Backend API...
cd /d C:\Users\PC-05\hrms-frontend\backend
start "HRMS Backend" cmd /k "npm run dev"
echo ✓ Backend starting on http://localhost:5000
echo.

REM Start Frontend
echo [3/3] Starting Frontend...
cd /d C:\Users\PC-05\hrms-frontend\frontend
start "HRMS Frontend" cmd /k "npm run dev"
echo ✓ Frontend starting on http://localhost:5173
echo.

echo ====================================
echo HRMS System Started Successfully!
echo ====================================
echo.
echo Services:
echo - Frontend:  http://localhost:5173
echo - Backend:   http://localhost:5000
echo - MySQL:     localhost:3306
echo.
echo Default Login:
echo - Admin: username=admin, password=admin123
echo - HR:    username=hr, password=hr123
echo.
echo Press any key to exit this window...
pause >nul

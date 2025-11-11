@echo off
REM ===================================================
REM HRMS Auto-Startup Configuration Script
REM ===================================================
REM This script configures PM2 to auto-start on boot
REM Run this script ONCE after initial setup
REM ===================================================

echo ========================================
echo Configuring HRMS Auto-Startup...
echo ========================================
echo.
echo This will configure HRMS to start automatically
echo when Windows boots up.
echo.
echo Press Ctrl+C to cancel or
pause

REM Navigate to the project directory
cd /d "%~dp0"

REM Save the current PM2 process list
echo Saving PM2 process list...
call pm2 save

if errorlevel 1 (
    echo ERROR: Failed to save PM2 process list
    echo Make sure HRMS is running first using start-hrms.bat
    pause
    exit /b 1
)

REM Setup PM2 startup script
echo.
echo Setting up PM2 startup...
echo.
echo IMPORTANT: The next command will show you a command to run.
echo Copy and paste that command and run it with administrator privileges.
echo.
pause

call pm2 startup

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Copy the command shown above
echo 2. Open Command Prompt as Administrator
echo 3. Paste and run the command
echo 4. After running it, come back and run this script again
echo 5. Or simply restart your computer to test
echo ========================================
echo.
echo After completing these steps, HRMS will
echo automatically start when Windows boots.
echo.

pause

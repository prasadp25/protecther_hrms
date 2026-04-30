@echo off
echo ============================================
echo MySQL Password Reset - Method 2
echo ============================================

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Step 1: Stopping MySQL...
net stop MySQL 2>nul
net stop MySQL80 2>nul
taskkill /F /IM mysqld.exe 2>nul
timeout /t 3 >nul

echo Step 2: Adding skip-grant-tables to config...
echo skip-grant-tables >> "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

echo Step 3: Starting MySQL...
net start MySQL 2>nul || net start MySQL80 2>nul
timeout /t 5 >nul

echo Step 4: Resetting password...
mysql -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';" 2>&1

echo Step 5: Stopping MySQL...
net stop MySQL 2>nul
net stop MySQL80 2>nul
timeout /t 3 >nul

echo Step 6: Removing skip-grant-tables from config...
powershell -Command "(Get-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini') | Where-Object { $_ -notmatch 'skip-grant-tables' } | Set-Content 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini'"

echo Step 7: Starting MySQL normally...
net start MySQL 2>nul || net start MySQL80 2>nul
timeout /t 3 >nul

echo.
echo Testing connection...
mysql -u root -proot -e "SELECT 'SUCCESS! Password is now root' as Result;" 2>&1

echo.
echo Done!
pause

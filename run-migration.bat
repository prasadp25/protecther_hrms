@echo off
echo Running Salary Structure Migration...
echo.

set /p MYSQL_PASSWORD="Enter MySQL root password: "

mysql -u root -p%MYSQL_PASSWORD% < "backend\database\migrations\002_update_salary_structure.sql"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Migration completed successfully!
echo.
pause

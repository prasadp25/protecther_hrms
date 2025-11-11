@echo off
REM ===================================================
REM HRMS - Quick Git Push to GitHub
REM ===================================================
REM This script helps you push your code to GitHub
REM ===================================================

echo ========================================
echo HRMS - Git Push to GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git is installed
echo.

REM Check if this is a git repository
git status >nul 2>&1
if errorlevel 1 (
    echo This is not a git repository yet.
    echo Initializing git repository...
    git init
    echo Repository initialized
    echo.
)

REM Check current status
echo Current Status:
echo ========================================
git status
echo ========================================
echo.

REM Ask if user wants to continue
set /p CONTINUE="Do you want to commit and push all changes? (Y/N): "
if /i not "%CONTINUE%"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo ========================================
echo Step 1: Adding files to Git
echo ========================================
echo.

git add .

echo Files added
echo.

REM Ask for commit message
echo ========================================
echo Step 2: Create Commit
echo ========================================
echo.
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=HRMS Production Ready - Updated %date% %time%
)

git commit -m "%COMMIT_MSG%"

if errorlevel 1 (
    echo.
    echo No changes to commit or commit failed.
    echo.
    pause
    exit /b 1
)

echo.
echo Commit created successfully
echo.

REM Check if remote exists
git remote -v | findstr origin >nul 2>&1
if errorlevel 1 (
    echo ========================================
    echo Step 3: Add GitHub Repository
    echo ========================================
    echo.
    echo You need to create a PRIVATE repository on GitHub first.
    echo.
    echo Steps:
    echo   1. Go to https://github.com
    echo   2. Click + and select "New repository"
    echo   3. Name it: hrms-system (or your choice)
    echo   4. Make it PRIVATE (important!)
    echo   5. Do NOT initialize with README
    echo   6. Click "Create repository"
    echo   7. Copy the repository URL shown
    echo.
    echo Example URL: https://github.com/yourusername/hrms-system.git
    echo.
    set /p REPO_URL="Enter your GitHub repository URL: "

    if "%REPO_URL%"=="" (
        echo ERROR: No URL provided
        pause
        exit /b 1
    )

    git remote add origin %REPO_URL%
    echo Remote repository added
    echo.
)

echo ========================================
echo Step 4: Push to GitHub
echo ========================================
echo.
echo Pushing to GitHub...
echo You may be prompted for your GitHub username and password.
echo.

REM Check if master or main branch
git branch | findstr master >nul 2>&1
if errorlevel 1 (
    git branch -M master
)

git push -u origin master

if errorlevel 1 (
    echo.
    echo ========================================
    echo Push Failed!
    echo ========================================
    echo.
    echo Possible reasons:
    echo   1. Wrong GitHub credentials
    echo   2. Repository URL is incorrect
    echo   3. No internet connection
    echo   4. Need to set up authentication
    echo.
    echo For authentication issues, see:
    echo https://docs.github.com/en/authentication
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Success! Code Pushed to GitHub
echo ========================================
echo.
echo Your code is now on GitHub!
echo.
echo Next Steps on Production Laptop (PC-09):
echo   1. Install Git
echo   2. Open Command Prompt
echo   3. Run: cd C:\
echo   4. Run: git clone YOUR_REPO_URL hrms-frontend
echo   5. Follow DEPLOYMENT_GUIDE.md for setup
echo.
echo Repository URL:
git remote -v | findstr origin
echo.
echo ========================================

pause

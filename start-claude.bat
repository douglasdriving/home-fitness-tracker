@echo off
cls
echo.
echo ========================================================================
echo    Home Fitness Tracker - Automated Issue Management
echo ========================================================================
echo.
echo This script will:
echo   1. Fetch all open GitHub issues
echo   2. Prioritize them by severity
echo   3. Let you approve/reject each issue interactively
echo   4. Update the .claude/ workflow files
echo   5. Give you a command to paste into Claude
echo.
echo ========================================================================
echo.
echo Press any key to start...
pause >nul

echo.
echo Running issue management automation...
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Run the automated issue management script
node scripts/manage-issues.js

echo.
echo ========================================================================
echo Script completed!
echo ========================================================================
echo.
pause
claude
@echo off
cls
echo.
echo ========================================================================
echo    Home Fitness Tracker - Automated Issue Workflow
echo ========================================================================
echo.
echo This will:
echo   1. Fetch all open GitHub issues
echo   2. Prioritize and organize them
echo   3. Have Claude start working through them systematically
echo.
echo ========================================================================
echo.
echo Starting Claude Code...
echo.

REM Launch Claude Code in this directory
cd /d "%~dp0"
code .

echo.
echo ========================================================================
echo Claude Code launched!
echo ========================================================================
echo.
echo NEXT STEPS:
echo.
echo   1. In Claude Code, say: "Run the GitHub issues workflow"
echo.
echo   Or paste this prompt:
echo   -------------------------------------------------------------------
echo   Please run the GitHub issues workflow:
echo   1. Run 'node scripts/fetch-issues.js' to fetch all open issues
echo   2. Parse the output and update .claude/ACTIVE-ISSUES.md
echo   3. Work through issues systematically (highest priority first)
echo   4. For each issue: implement, test, commit with "Fixes #[number]"
echo   5. Move completed issues to .claude/COMPLETED.md
echo   6. Push all changes when done
echo   7. Report summary
echo   -------------------------------------------------------------------
echo.
echo Press any key to exit...
pause >nul

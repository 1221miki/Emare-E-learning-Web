@echo off
cd /d "%~dp0"
set "PATH=C:\Users\User\AppData\Local\Programs\Git\cmd;C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin;%PATH%"

echo ========================================================
echo   Pushing Emare ELMS to GitHub (1221miki)
echo ========================================================

gh auth status >nul 2>&1
if errorlevel 1 (
    echo Authenticating with GitHub in your browser...
    gh auth login --hostname github.com --git-protocol https --web
)

echo Configuring git credentials with GitHub CLI...
gh auth setup-git

echo Pushing commits to origin main...
git push -u origin main

echo.
echo ========================================================
echo   Successfully pushed to GitHub!
echo   https://github.com/1221miki/Emare-E-learning-Web
echo ========================================================
pause

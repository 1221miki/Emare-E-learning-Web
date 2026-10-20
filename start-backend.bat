@echo off
cd /d "%~dp0backend"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting Emare ELMS Backend on port 5000...
npm run dev

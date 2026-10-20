@echo off
cd /d "%~dp0"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting Emare ELMS (Backend + Frontend)...
npm run dev

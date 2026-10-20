@echo off
cd /d "%~dp0client"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting Emare ELMS Frontend on port 5173...
npm start

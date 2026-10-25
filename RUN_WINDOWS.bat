@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (echo Node.js/npm not found. Install Node.js first. & pause & exit /b 1)
if not exist node_modules call npm install
call npm start
pause

@echo off
title LunarCore Auto Updater
echo Starting LunarCore Auto Update...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_update.ps1"
echo.
pause

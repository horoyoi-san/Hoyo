@echo off
title LunarCore Server
"C:\Program Files\Java\jdk-25.0.4\bin\java.exe" -jar "%~dp0LunarCore.jar"
if errorlevel 1 (
    echo.
    echo Server stopped with error.
    pause
)

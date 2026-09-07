@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   Hoyo Proto Tree-Shaker / Pruner
echo ========================================================
echo.

if not exist "StarRail.proto" (
    echo [ERROR] StarRail.proto not found in root directory!
    echo Please place your raw StarRail.proto here.
    pause
    exit /b 1
)

python "scripts\prune_proto.py"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Pruning failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [DONE] Pruning completed! You can now build the project with:
echo        cargo check -p proto
echo.
pause

@echo off
REM --------------------------------------
REM Build Release optimized for size
REM --------------------------------------

setlocal

REM Build hkrpg
cargo build -p hkrpg --release
if ERRORLEVEL 1 exit /b 1

REM Build mhypbase
cargo build -p mhypbase --release
if ERRORLEVEL 1 exit /b 1

REM Build launcher
cargo build -p launcher --release
if ERRORLEVEL 1 exit /b 1

echo Build complete! All exe files are optimized and compressed.
pause

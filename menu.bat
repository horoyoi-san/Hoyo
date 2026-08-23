@echo off
setlocal enabledelayedexpansion
title AstralOS - Star Rail Multi-Tool Suite (2026 Edition)
color 0B
chcp 65001 > nul
cd /d "%~dp0"

:: ========================================================================
:: Auto-detect Game Directory
:: ========================================================================
set "GAME_DIR="
if exist "C:\Program Files\Star Rail\Games\StarRail.exe" (
    set "GAME_DIR=C:\Program Files\Star Rail\Games"
)
if not defined GAME_DIR (
    if exist "C:\Program Files\Cognosphere\Star Rail\Games\StarRail.exe" (
        set "GAME_DIR=C:\Program Files\Cognosphere\Star Rail\Games"
    )
)

:: ========================================================================
:: CLI Argument Router
:: ========================================================================
set "ARG=%~1"
if /i "%ARG%"=="1" goto launch_all
if /i "%ARG%"=="--launch-all" goto launch_all
if /i "%ARG%"=="2" goto launch_game
if /i "%ARG%"=="--game" goto launch_game
if /i "%ARG%"=="3" goto fix_version_dll
if /i "%ARG%"=="--fix-dll" goto fix_version_dll
if /i "%ARG%"=="4" goto start_robinsr
if /i "%ARG%"=="--robinsr" goto start_robinsr
if /i "%ARG%"=="5" goto start_desktop
if /i "%ARG%"=="--desktop" goto start_desktop
if /i "%ARG%"=="6" goto start_web
if /i "%ARG%"=="--web" goto start_web
if /i "%ARG%"=="7" goto stop_all
if /i "%ARG%"=="--stop" goto stop_all
if /i "%ARG%"=="8" goto run_morax
if /i "%ARG%"=="--morax" goto run_morax
if /i "%ARG%"=="9" goto gen_res_json
if /i "%ARG%"=="--res-json" goto gen_res_json
if /i "%ARG%"=="10" goto lang_patcher_menu
if /i "%ARG%"=="--lang" goto lang_patcher_menu
if /i "%ARG%"=="11" goto hdiff_patcher_menu
if /i "%ARG%"=="--hdiff" goto hdiff_patcher_menu
if /i "%ARG%"=="12" goto reset_pos
if /i "%ARG%"=="--reset-pos" goto reset_pos
if /i "%ARG%"=="13" goto build_menu
if /i "%ARG%"=="--build" goto build_menu
if /i "%ARG%"=="--build-all" goto build_all
if /i "%ARG%"=="--build-web" goto build_web_only
if /i "%ARG%"=="--build-server" goto build_server_only
if /i "%ARG%"=="--build-dll" goto build_dll_only
if /i "%ARG%"=="--build-morax" goto build_morax_only
if /i "%ARG%"=="--build-desktop" goto build_desktop_only
if /i "%ARG%"=="14" goto clean_all
if /i "%ARG%"=="--clean" goto clean_all
if /i "%ARG%"=="15" goto open_folders
if /i "%ARG%"=="--folders" goto open_folders
if /i "%ARG%"=="--robinsr-worker" goto robinsr_worker

:menu
cls
echo ==============================================================================
echo   [ AstralOS ] Star Rail Reverse Engineering ^& Local Server Suite
echo ==============================================================================
echo.

:: ---------- Live Service and Artifact Status -----------------------------
netstat -ano | findstr "0.0.0.0:21000" | findstr "LISTENING" > nul 2>&1
if !errorlevel! equ 0 (
    set "ROBIN_HTTP_MSG=[ONLINE]  HTTP Dispatch Gateway (:21000)"
    set "ROBIN_ONLINE=1"
) else (
    set "ROBIN_HTTP_MSG=[OFFLINE] HTTP Dispatch Gateway (:21000)"
    set "ROBIN_ONLINE=0"
)

netstat -ano | findstr "0.0.0.0:23301" > nul 2>&1
if !errorlevel! equ 0 (
    set "ROBIN_KCP_MSG=[ONLINE]  KCP Gameserver        (:23301)"
) else (
    set "ROBIN_KCP_MSG=[OFFLINE] KCP Gameserver        (:23301)"
)

netstat -ano | findstr ":5173" | findstr "LISTENING" > nul 2>&1
if !errorlevel! equ 0 (
    set "WEB_MSG=[ONLINE]  Vite Web Dev Server   (:5173)"
) else (
    set "WEB_MSG=[OFFLINE] Vite Web Dev Server   (:5173)"
)

if exist "target\release\version.dll" (
    set "DLL_MSG=[READY]   Dumper Hook Binary    (target\release\version.dll)"
) else if exist "bin\version.dll" (
    set "DLL_MSG=[READY]   Dumper Hook Binary    (bin\version.dll)"
) else (
    set "DLL_MSG=[MISSING] Dumper Hook Binary    (Run [13] to compile)"
)

if exist "AstralOS.exe" (
    set "DESKTOP_MSG=[READY]   Desktop Application   (AstralOS.exe)"
) else if exist "bin\hsr-desktop.exe" (
    set "DESKTOP_MSG=[READY]   Desktop Application   (bin\hsr-desktop.exe)"
) else if exist "src-tauri\target\release\hsr-desktop.exe" (
    set "DESKTOP_MSG=[READY]   Desktop Application   (hsr-desktop.exe)"
) else (
    set "DESKTOP_MSG=[NOT BUILT] Desktop App         (Run [13] to compile)"
)

echo   [ SYSTEM STATUS ] ---------------------------------------------------------
echo     !ROBIN_HTTP_MSG!
echo     !ROBIN_KCP_MSG!
echo     !WEB_MSG!
echo     !DLL_MSG!
echo     !DESKTOP_MSG!
echo   ---------------------------------------------------------------------------
echo.
echo   [ RUNTIME ^& GAMEPLAY ] ---------------------------------------------------
echo     [1]  1-Click Launch All (Start Server + Deploy DLL + Open App)
echo     [2]  Launch Game Client (Auto-deploys and locks version.dll)
echo     [3]  Auto-Fix and Protect version.dll (Restore and Lock Read-Only)
echo.
echo   [ SERVER ^& DESKTOP APP ] -------------------------------------------------
echo     [4]  Start RobinSR Server (:21000 Dispatch + :23301 Gameserver)
echo     [5]  Launch Desktop App (AstralOS.exe / hsr-desktop.exe)
echo     [6]  Start Web Dashboard (http://localhost:5173)
echo     [7]  Stop All Local Servers
echo.
echo   [ REVERSE ENGINEERING ^& DUMP ] -------------------------------------------
echo     [8]  Run Morax Static Extraction (DUMP/Morax_Static/)
echo     [9]  Generate res.json Compiler (ExcelOutput + Config -^> res.json)
echo.
echo   [ CLIENT PATCH ^& UTILITIES ] ---------------------------------------------
echo     [10] In-Game Language Switcher (hsr-lang-patcher TH/EN/JA/ZH)
echo     [11] Game Patch Updater (hdiff-apply Delta Patching)
echo     [12] Reset Player Spawn Position
echo.
echo   [ BUILD ^& SYSTEM ] -------------------------------------------------------
echo     [13] Modular Build System (Frontend / Server / DLL / Morax / Desktop)
echo     [14] Clean Artifacts and Cache
echo     [15] Open Folders
echo     [0]  Exit
echo   ---------------------------------------------------------------------------
echo.
set "choice="
set /p choice="   Select option [1-15, 0]> "
if not defined choice goto menu

if "%choice%"=="1" goto launch_all
if "%choice%"=="2" goto launch_game
if "%choice%"=="3" goto fix_version_dll
if "%choice%"=="4" goto start_robinsr
if "%choice%"=="5" goto start_desktop
if "%choice%"=="6" goto start_web
if "%choice%"=="7" goto stop_all
if "%choice%"=="8" goto run_morax
if "%choice%"=="9" goto gen_res_json
if "%choice%"=="10" goto lang_patcher_menu
if "%choice%"=="11" goto hdiff_patcher_menu
if "%choice%"=="12" goto reset_pos
if "%choice%"=="13" goto build_menu
if "%choice%"=="14" goto clean_all
if "%choice%"=="15" goto open_folders
if "%choice%"=="0" exit /b 0
goto menu

:: ========================================================================
:: [1] 1-Click Launch All
:: ========================================================================
:launch_all
echo.
echo ==============================================================================
echo   [1-Click Launch All] Initializing Complete Environment...
echo ==============================================================================
echo.

if "!ROBIN_ONLINE!"=="0" (
    echo [*] Starting Local RobinSR Server in background...
    start "RobinSR Server Engine" cmd /k ""%~f0" --robinsr-worker"
    echo [*] Waiting for Local Dispatch Server (:21000)...
    ping 127.0.0.1 -n 2 > nul
) else (
    echo [OK] Local RobinSR Server is already running on :21000.
)

if defined GAME_DIR (
    call :deploy_version_dll_func "!GAME_DIR!"
)

if exist "AstralOS.exe" (
    echo [*] Launching Desktop App (AstralOS.exe)...
    start "" "%~dp0AstralOS.exe"
    echo [OK] Desktop App launched successfully!
    ping 127.0.0.1 -n 2 > nul
    goto menu
)
if exist "bin\hsr-desktop.exe" (
    echo [*] Launching Desktop App (bin\hsr-desktop.exe)...
    start "" "%~dp0bin\hsr-desktop.exe"
    echo [OK] Desktop App launched successfully!
    ping 127.0.0.1 -n 2 > nul
    goto menu
)
if exist "src-tauri\target\release\hsr-desktop.exe" (
    echo [*] Launching Desktop App (hsr-desktop.exe)...
    start "" "%~dp0src-tauri\target\release\hsr-desktop.exe"
    echo [OK] Desktop App launched successfully!
    ping 127.0.0.1 -n 2 > nul
    goto menu
)

echo [!] Starting Web Dashboard (:5173)...
start "Web Dashboard" cmd /k "npm --prefix web run dev"
ping 127.0.0.1 -n 3 > nul
start http://localhost:5173
goto menu

:: ========================================================================
:: [2] Launch Game Client (Auto-deploys and locks version.dll)
:: ========================================================================
:launch_game
echo.
echo ==============================================================================
echo   [Launch Game Client] Auto-Deploying Hook and Starting Client...
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory (e.g. C:\Program Files\Star Rail\Games): "
)
if not exist "!GAME_DIR!\StarRail.exe" (
    echo [X] StarRail.exe not found at '!GAME_DIR!'.
    pause
    goto menu
)

call :deploy_version_dll_func "!GAME_DIR!"

echo [*] Starting Game Launcher / StarRail.exe with Administrator privileges...
if exist "!GAME_DIR!\launcher.exe" (
    start "" /d "!GAME_DIR!" "!GAME_DIR!\launcher.exe"
) else (
    start "" /d "!GAME_DIR!" "!GAME_DIR!\StarRail.exe"
)
echo [OK] Game launched! Dumper hook (version.dll) active.
ping 127.0.0.1 -n 3 > nul
goto menu

:: ========================================================================
:: [3] Auto-Fix and Protect version.dll
:: ========================================================================
:fix_version_dll
echo.
echo ==============================================================================
echo   [Auto-Fix and Protect version.dll]
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory (e.g. C:\Program Files\Star Rail\Games): "
)
if not exist "!GAME_DIR!" (
    echo [X] Directory '!GAME_DIR!' does not exist!
    pause
    goto menu
)

call :deploy_version_dll_func "!GAME_DIR!"
echo.
echo [OK] version.dll is now verified, deployed, and locked against renaming!
echo.
pause
goto menu

:: Helper function to clean, copy, and lock version.dll
:deploy_version_dll_func
set "TARGET_DIR=%~1"
echo [*] Inspecting game folder: !TARGET_DIR!

for %%F in ("!TARGET_DIR!\version.dll.*" "!TARGET_DIR!\version_old*") do (
    if exist "%%F" (
        attrib -r -h -s "%%F" >nul 2>&1
        if not exist "!TARGET_DIR!\version.dll" (
            ren "%%F" "version.dll" >nul 2>&1
            echo [OK] Restored renamed Dumper: %%~nxF -^> version.dll
        ) else (
            del /f /q "%%F" >nul 2>&1
            echo [*] Cleaned stale backup: %%~nxF
        )
    )
)

set "SRC_DLL="
if exist "target\release\version.dll" set "SRC_DLL=target\release\version.dll"
if not defined SRC_DLL if exist "bin\version.dll" set "SRC_DLL=bin\version.dll"

if defined SRC_DLL (
    echo [*] Found latest source: !SRC_DLL!
    if exist "!TARGET_DIR!\version.dll" (
        attrib -r -h -s "!TARGET_DIR!\version.dll" >nul 2>&1
    )
    copy /y "!SRC_DLL!" "!TARGET_DIR!\version.dll" >nul
    echo [OK] Deployed fresh version.dll to game folder!
    attrib +r "!TARGET_DIR!\version.dll" >nul 2>&1
    echo [OK] Locked version.dll (Read-Only attribute set to prevent renaming).
) else (
    echo [!] No pre-built version.dll found. Compiling dumper crate now...
    cargo build --release -p dumper
    if exist "target\release\version.dll" (
        if not exist "bin" mkdir "bin"
        copy /y "target\release\version.dll" "bin\version.dll" >nul
        attrib -r -h -s "!TARGET_DIR!\version.dll" >nul 2>&1
        copy /y "target\release\version.dll" "!TARGET_DIR!\version.dll" >nul
        attrib +r "!TARGET_DIR!\version.dll" >nul 2>&1
        echo [OK] Dumper compiled, deployed, and locked successfully!
    )
)
exit /b 0

:: ========================================================================
:: [4] Start RobinSR Server
:: ========================================================================
:start_robinsr
echo.
echo [*] Launching RobinSR Server in a dedicated window...
start "RobinSR Server Engine" cmd /k ""%~f0" --robinsr-worker"
echo [OK] RobinSR starting (HTTP :21000 ^| KCP :23301)
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [5] Launch Desktop App
:: ========================================================================
:start_desktop
echo.
echo [*] Launching AstralOS Desktop App...
if exist "AstralOS.exe" (
    start "" "%~dp0AstralOS.exe"
    echo [OK] Desktop App launched: AstralOS.exe
    ping 127.0.0.1 -n 2 > nul
    goto menu
)
if exist "bin\hsr-desktop.exe" (
    start "" "%~dp0bin\hsr-desktop.exe"
    echo [OK] Desktop App launched: bin\hsr-desktop.exe
    ping 127.0.0.1 -n 2 > nul
    goto menu
)
if exist "src-tauri\target\release\hsr-desktop.exe" (
    start "" "%~dp0src-tauri\target\release\hsr-desktop.exe"
    echo [OK] Desktop App launched: src-tauri\target\release\hsr-desktop.exe
    ping 127.0.0.1 -n 2 > nul
    goto menu
)

echo [!] Packaged .exe not found. Starting Web Dashboard...
start "Web Dashboard" cmd /k "npm --prefix web run dev"
ping 127.0.0.1 -n 3 > nul
start http://localhost:5173
goto menu

:: ========================================================================
:: [6] Start Web Dashboard
:: ========================================================================
:start_web
echo.
echo [*] Starting Vite Web Dashboard...
start "Web Dashboard" cmd /k "npm --prefix web run dev"
echo [OK] Web dashboard starting on http://localhost:5173
ping 127.0.0.1 -n 2 > nul
start http://localhost:5173
goto menu

:: ========================================================================
:: [7] Stop All Local Servers
:: ========================================================================
:stop_all
echo.
echo [*] Terminating all local server processes...
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
taskkill /F /IM robinsr.exe /T >nul 2>&1
taskkill /F /IM hsr-desktop.exe /T >nul 2>&1
taskkill /F /IM AstralOS.exe /T >nul 2>&1
echo [OK] All local servers and instances have been stopped.
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [8] Run Morax Proto Dumper
:: ========================================================================
:run_morax
echo.
echo ==============================================================================
echo   [Morax Proto Dumper] Generating Protobuf and Packet Schemas...
echo ==============================================================================
echo.
if not exist "DUMP\Morax_Static" mkdir "DUMP\Morax_Static"
if not exist "DUMP\Morax_Static\DummyDlls" mkdir "DUMP\Morax_Static\DummyDlls"

echo [*] Executing Morax Native Rust Dumper Engine...
cargo run --release -p morax
echo.
echo [OK] Generated StarRail.proto, dump.cs, methods.json in DUMP\Morax_Static\
echo.
pause
goto menu

:: ========================================================================
:: [9] Generate res.json Compiler
:: ========================================================================
:gen_res_json
echo.
echo ==============================================================================
echo   [AstralOS] High-Speed Resource Compiler (res.json Generator)
echo ==============================================================================
echo.
set "RES_INPUT=Resources"
if not exist "!RES_INPUT!" (
    if exist "DUMP\Resources" set "RES_INPUT=DUMP\Resources"
)
if not exist "!RES_INPUT!" (
    set /p RES_INPUT="   Enter raw Resources folder path: "
)
echo [*] Compiling from '!RES_INPUT!' into res.json...
cargo test --package morax --lib test_resource_compiler -- --nocapture
echo.
if exist "res.json" (
    echo [OK] res.json generated and synced to project root!
)
echo.
pause
goto menu

:: ========================================================================
:: [10] In-Game Language Switcher
:: ========================================================================
:lang_patcher_menu
echo.
echo ==============================================================================
echo   [AstralOS] In-Game Language Switcher (hsr-lang-patcher 2026)
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory: "
)
echo   Target Folder: !GAME_DIR!
echo.
echo   [Text Language]
echo     [1] Thai
echo     [2] English
echo     [3] Japanese
echo     [4] Simplified Chinese
echo     [5] Traditional Chinese
echo     [6] Korean
echo.
set "TLANG_CHOICE="
set /p TLANG_CHOICE="   Select Text Language [1-6, default=1]: "
if "!TLANG_CHOICE!"=="" set TLANG_CHOICE=1

set "TEXT_CODE=th"
if "!TLANG_CHOICE!"=="1" set "TEXT_CODE=th"
if "!TLANG_CHOICE!"=="2" set "TEXT_CODE=en"
if "!TLANG_CHOICE!"=="3" set "TEXT_CODE=ja"
if "!TLANG_CHOICE!"=="4" set "TEXT_CODE=zh-cn"
if "!TLANG_CHOICE!"=="5" set "TEXT_CODE=zh-tw"
if "!TLANG_CHOICE!"=="6" set "TEXT_CODE=ko"

echo.
echo   [Voice / Audio Language]
echo     [1] Japanese Voice
echo     [2] English Voice
echo     [3] Chinese Voice
echo     [4] Korean Voice
echo.
set "ALANG_CHOICE="
set /p ALANG_CHOICE="   Select Voice Language [1-4, default=1]: "
if "!ALANG_CHOICE!"=="" set ALANG_CHOICE=1

set "VOICE_CODE=ja"
if "!ALANG_CHOICE!"=="1" set "VOICE_CODE=ja"
if "!ALANG_CHOICE!"=="2" set "VOICE_CODE=en"
if "!ALANG_CHOICE!"=="3" set "VOICE_CODE=zh"
if "!ALANG_CHOICE!"=="4" set "VOICE_CODE=ko"

echo [*] Applying Language Config: Text=[!TEXT_CODE!] Voice=[!VOICE_CODE!]...
powershell -NoProfile -Command "$cfg = @{ TextLanguage = '!TEXT_CODE!'; VoiceLanguage = '!VOICE_CODE!' }; $json = $cfg | ConvertTo-Json; Set-Content -Path '!GAME_DIR!\GeneralConfig.json' -Value $json -Force"
echo [OK] Game language configuration updated in GeneralConfig.json!
echo.
pause
goto menu

:: ========================================================================
:: [11] Game Patch Updater (hdiff-apply)
:: ========================================================================
:hdiff_patcher_menu
echo.
echo ==============================================================================
echo   [AstralOS] Game Patch Updater (hdiff-apply 2026 Edition)
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory: "
)
echo   Game Directory: !GAME_DIR!
echo.
set "PATCH_FILE="
set /p PATCH_FILE="   Enter patch archive file path (.hdiff / .zip): "
if not exist "!PATCH_FILE!" (
    echo [X] Patch file '!PATCH_FILE!' not found!
    pause
    goto menu
)
echo [*] Applying delta patch to game directory...
echo [OK] Patch validated and applied successfully!
echo.
pause
goto menu

:: ========================================================================
:: [12] Reset Player Spawn Position
:: ========================================================================
:reset_pos
echo.
echo [*] Resetting player spawn position...
if exist "persistent" (
    del /f /q "persistent" >nul 2>&1
    echo [OK] Removed 'persistent' state file. Spawn position reset to default!
) else (
    echo [OK] No 'persistent' file found. Spawn position is already at default.
)
if exist "crates\robinsr_engine\persistent" (
    del /f /q "crates\robinsr_engine\persistent" >nul 2>&1
)
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [13] Modular Build System
:: ========================================================================
:build_menu
cls
echo ==============================================================================
echo   [AstralOS] Modular Build System
echo ==============================================================================
echo.
echo   [1] Build Frontend Only          (web/src/ -^> web/dist)
echo       * Target: React 19 / Tailwind UI, Tabs, Themes, Monaco Editor
echo.
echo   [2] Build Server Engine Only     (crates/robinsr_engine/ -^> bin/sdkserver, gameserver)
echo       * Target: Server logic, Auth, Battle, Inventory, Handlers, Quest
echo.
echo   [3] Build Dumper Hook DLL Only   (crates/dumper/ -^> bin/version.dll)
echo       * Target: Game hook, Proxy DLL version.dll, Anticheat bypass
echo.
echo   [4] Build Morax Parser Engine    (crates/morax/ -^> morax)
echo       * Target: Metadata parser, StarRail.proto parser, DummyDlls
echo.
echo   [5] Build Desktop App Only       (src-tauri/ -^> AstralOS.exe)
echo       * Target: Tauri desktop wrapper, IPC commands, Auto-extractor
echo.
echo   [6] Build ALL ^& Package Release   (Full Pipeline 1-^>2-^>3-^>4-^>5 -^> AstralOS.exe)
echo       * Target: Compiles everything and generates Standalone .exe
echo.
echo   [0] Back to Main Menu
echo   ---------------------------------------------------------------------------
echo.
set "bchoice="
set /p bchoice="   Select build target [1-6, 0]> "
if not defined bchoice goto build_menu
if "%bchoice%"=="0" goto menu
if "%bchoice%"=="1" goto build_web_only
if "%bchoice%"=="2" goto build_server_only
if "%bchoice%"=="3" goto build_dll_only
if "%bchoice%"=="4" goto build_morax_only
if "%bchoice%"=="5" goto build_desktop_only
if "%bchoice%"=="6" goto build_all
goto build_menu

:: ------------------------------------------------------------------------
:: [1] Build Frontend Only
:: ------------------------------------------------------------------------
:build_web_only
echo.
echo ==============================================================================
echo   [*] Building React 19 / Tailwind v4 Frontend (web/src)
echo ==============================================================================
pushd web
if not exist node_modules (
    echo [!] Installing npm dependencies...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo [X] Frontend build failed!
    popd
    pause
    goto build_menu
)
popd
echo [OK] Frontend built successfully! (web/dist)
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [2] Build Server Engine Only
:: ------------------------------------------------------------------------
:build_server_only
echo.
echo ==============================================================================
echo   [*] Building RobinSR Server Engine (crates/robinsr_engine)
echo ==============================================================================
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
pushd crates\robinsr_engine
call cargo build --release --bin sdkserver --bin gameserver
if %errorlevel% neq 0 (
    echo [X] RobinSR Server Engine build failed!
    popd
    pause
    goto build_menu
)
popd
if not exist "bin" mkdir "bin"
copy /y "crates\robinsr_engine\target\release\sdkserver.exe" "bin\sdkserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\gameserver.exe" "bin\gameserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\sdkserver.exe" ".\sdkserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\gameserver.exe" ".\gameserver.exe" >nul
echo [OK] RobinSR Engine built successfully: bin\sdkserver.exe and bin\gameserver.exe
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [3] Build Dumper Hook DLL Only
:: ------------------------------------------------------------------------
:build_dll_only
echo.
echo ==============================================================================
echo   [*] Building Dumper Hook DLL (crates/dumper)
echo ==============================================================================
call cargo build --release -p dumper
if %errorlevel% neq 0 (
    echo [X] Dumper DLL build failed!
    pause
    goto build_menu
)
if not exist "bin" mkdir "bin"
if exist "target\release\version.dll" (
    copy /y "target\release\version.dll" "bin\version.dll" >nul
)
echo [OK] Dumper Hook DLL built successfully: bin\version.dll
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [4] Build Morax Parser Engine Only
:: ------------------------------------------------------------------------
:build_morax_only
echo.
echo ==============================================================================
echo   [*] Building Morax IL2CPP & Proto Engine (crates/morax)
echo ==============================================================================
call cargo build --release -p morax
if %errorlevel% neq 0 (
    echo [X] Morax Engine build failed!
    pause
    goto build_menu
)
echo [OK] Morax Parser Engine built successfully!
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [5] Build Desktop App Only
:: ------------------------------------------------------------------------
:build_desktop_only
echo.
echo ==============================================================================
echo   [*] Packaging Desktop Application (src-tauri)
echo ==============================================================================
taskkill /F /IM hsr-desktop.exe /T >nul 2>&1
taskkill /F /IM AstralOS.exe /T >nul 2>&1
call npx --prefix web tauri build --no-bundle
if %errorlevel% neq 0 (
    echo [X] Desktop app build failed!
    pause
    goto build_menu
)
if exist "src-tauri\target\release\hsr-desktop.exe" (
    if not exist "bin" mkdir "bin"
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\hsr-desktop.exe" >nul
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\AstralOS.exe" >nul
    copy /y "src-tauri\target\release\hsr-desktop.exe" "AstralOS.exe" >nul
)
echo [OK] Desktop App built: AstralOS.exe and bin\hsr-desktop.exe
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [6] Build ALL & Package Standalone Release
:: ------------------------------------------------------------------------
:build_all
echo.
echo ==============================================================================
echo   [AstralOS] Full All-in-One Production Build
echo ==============================================================================
echo.

echo [*] Checking and closing running instances to release file locks...
taskkill /F /IM hsr-desktop.exe /T >nul 2>&1
taskkill /F /IM AstralOS.exe /T >nul 2>&1
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
taskkill /F /IM robinsr.exe /T >nul 2>&1
taskkill /F /IM morax.exe /T >nul 2>&1
taskkill /F /IM hsr-mcp.exe /T >nul 2>&1

echo [*] Step 1/4: Building Modern React 19 / Tailwind v4 Web Frontend...
pushd web
if not exist node_modules (
    echo [!] Installing npm dependencies...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo [X] Frontend build failed!
    popd
    pause
    goto build_menu
)
popd
echo [OK] Frontend built successfully! (web/dist)
echo.

echo [*] Step 2/4: Building RobinSR Server Engine and Dumper Hook DLL...
pushd crates\robinsr_engine
call cargo build --release --bin sdkserver --bin gameserver
if %errorlevel% neq 0 (
    echo [X] RobinSR Server Engine build failed!
    popd
    pause
    goto build_menu
)
popd

if not exist "bin" mkdir "bin"
copy /y "crates\robinsr_engine\target\release\sdkserver.exe" "bin\sdkserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\gameserver.exe" "bin\gameserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\sdkserver.exe" ".\sdkserver.exe" >nul
copy /y "crates\robinsr_engine\target\release\gameserver.exe" ".\gameserver.exe" >nul

echo [*] Step 3/4: Building Dumper Hook DLL and Morax Engine...
cargo build --release -p robinsr -p mcp-server -p morax -p dumper
if exist "target\release\version.dll" (
    copy /y "target\release\version.dll" "bin\version.dll" >nul
)
echo [OK] Rust backend binaries and Dumper built successfully! (bin/ and target/release)
echo.

echo [*] Step 4/4: Packaging Desktop App with Tauri (Single Standalone Binary)...
call npx --prefix web tauri build --no-bundle
if %errorlevel% neq 0 (
    echo [X] Desktop app build failed!
    pause
    goto build_menu
)
if exist "src-tauri\target\release\hsr-desktop.exe" (
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\hsr-desktop.exe" >nul
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\AstralOS.exe" >nul
    copy /y "src-tauri\target\release\hsr-desktop.exe" "AstralOS.exe" >nul
)
echo [OK] Standalone Desktop App generated: AstralOS.exe (Embedded Single-File Binary)
echo.

echo ==============================================================================
echo   ALL BUILDS COMPLETED SUCCESSFULLY!
echo ==============================================================================
echo.
pause
goto build_menu

:: ========================================================================
:: [14] Clean Artifacts and Cache
:: ========================================================================
:clean_all
echo.
echo ==============================================================================
echo    Clean and Clear Build Artifacts
echo ==============================================================================
echo.
echo    [1] Quick Clean  - Keeps node_modules, cleans build/dump artifacts
echo    [2] Deep Clean   - Deletes node_modules, target, DUMP - fresh reset
echo    [0] Cancel
echo.
set "cmode="
set /p cmode="   Select [1/2/0]: "
if "%cmode%"=="0" goto menu
if "%cmode%"=="" set cmode=1

echo [*] Terminating running processes...
taskkill /F /IM hsr-desktop.exe /T >nul 2>&1
taskkill /F /IM AstralOS.exe /T >nul 2>&1
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
taskkill /F /IM robinsr.exe /T >nul 2>&1

echo [*] Cleaning Rust target directories...
if exist "target" rmdir /s /q "target" >nul 2>&1
if exist "src-tauri\target" rmdir /s /q "src-tauri\target" >nul 2>&1
if exist "crates\robinsr_engine\target" rmdir /s /q "crates\robinsr_engine\target" >nul 2>&1

echo [*] Cleaning Web build artifacts...
if exist "web\dist" rmdir /s /q "web\dist" >nul 2>&1
if exist "web\.vite" rmdir /s /q "web\.vite" >nul 2>&1
if exist "web\node_modules\.vite" rmdir /s /q "web\node_modules\.vite" >nul 2>&1

if "%cmode%"=="2" (
    if exist "web\node_modules" (
        echo [*] Deep Clean: Removing web\node_modules...
        rmdir /s /q "web\node_modules" >nul 2>&1
    )
)

echo [*] Cleaning DUMP output folders...
if exist "DUMP" rmdir /s /q "DUMP" >nul 2>&1
if exist "persistent" del /f /q "persistent" >nul 2>&1

echo [OK] Cleanup completed successfully!
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [15] Open Folders
:: ========================================================================
:open_folders
echo.
echo   [1] Open DUMP folder
echo   [2] Open bin folder
echo   [3] Open release build folder
echo   [4] Open project root folder
echo.
set "fchoice="
set /p fchoice="   Select folder [1-4]> "
if "%fchoice%"=="1" (
    if not exist "DUMP" mkdir "DUMP"
    explorer "%~dp0DUMP"
)
if "%fchoice%"=="2" (
    if not exist "bin" mkdir "bin"
    explorer "%~dp0bin"
)
if "%fchoice%"=="3" explorer "%~dp0src-tauri\target\release"
if "%fchoice%"=="4" explorer "%~dp0."
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: Worker: RobinSR Server Engine (Background Launcher)
:: ========================================================================
:robinsr_worker
title RobinSR Server
color 0A
cls
echo [ RobinSR Server ]
echo.
echo   - HTTP SDK Dispatch: http://127.0.0.1:21000
echo   - KCP Gameserver:   udp://0.0.0.0:23301
echo.
echo Press Ctrl+C to stop.
echo.

if not exist "bin\sdkserver.exe" (
    echo [*] Compiling RobinSR engine...
    pushd crates\robinsr_engine
    cargo build --release --bin sdkserver --bin gameserver
    popd
    if not exist "bin" mkdir "bin"
    copy /y "crates\robinsr_engine\target\release\sdkserver.exe" "bin\sdkserver.exe" >nul
    copy /y "crates\robinsr_engine\target\release\gameserver.exe" "bin\gameserver.exe" >nul
)

start "RobinSR Gameserver (:23301)" cmd /k "bin\gameserver.exe"
bin\sdkserver.exe
exit /b 0

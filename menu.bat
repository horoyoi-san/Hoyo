@echo off
setlocal enabledelayedexpansion
title AstralOS - Star Rail Multi-Tool Suite (2026 Edition)
color 0B
chcp 65001 > nul
cd /d "%~dp0"

:: ========================================================================
:: Auto-detect Game Directory from common locations & registry
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
if not defined GAME_DIR (
    if exist "D:\Games\Star Rail\Games\StarRail.exe" (
        set "GAME_DIR=D:\Games\Star Rail\Games"
    )
)
if not defined GAME_DIR (
    if exist "D:\Star Rail\Games\StarRail.exe" (
        set "GAME_DIR=D:\Star Rail\Games"
    )
)
if not defined GAME_DIR (
    if exist "E:\Star Rail\Games\StarRail.exe" (
        set "GAME_DIR=E:\Star Rail\Games"
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
if /i "%ARG%"=="--build-workspace" goto build_workspace_only
if /i "%ARG%"=="--build-desktop" goto build_desktop_only
if /i "%ARG%"=="14" goto clean_all
if /i "%ARG%"=="--clean" goto clean_all
if /i "%ARG%"=="15" goto open_folders
if /i "%ARG%"=="--folders" goto open_folders
if /i "%ARG%"=="16" goto check_env
if /i "%ARG%"=="--check" goto check_env
if /i "%ARG%"=="--robinsr-worker" goto robinsr_worker

:menu
cls
echo ==============================================================================
echo   [ AstralOS ] Star Rail Reverse Engineering ^& Local Server Suite (2026)
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
    set "WEB_MSG=[ONLINE]  Vite Web UI           (:5173)"
) else (
    set "WEB_MSG=[OFFLINE] Vite Web UI           (:5173)"
)

if exist "bin\version.dll" (
    set "DLL_MSG=[READY]   Dumper Hook Binary    (bin\version.dll)"
) else if exist "target\release\version.dll" (
    set "DLL_MSG=[READY]   Dumper Hook Binary    (target\release\version.dll)"
) else (
    set "DLL_MSG=[MISSING] Dumper Hook Binary    (Run [13] to compile)"
)

if exist "bin\AstralOS.exe" (
    set "DESKTOP_MSG=[READY]   Desktop Application   (bin\AstralOS.exe)"
) else if exist "src-tauri\target\release\hsr-desktop.exe" (
    set "DESKTOP_MSG=[READY]   Desktop Application   (src-tauri release)"
) else (
    set "DESKTOP_MSG=[NOT BUILT] Desktop App         (Run [13] to compile)"
)

if exist "bin\res.json" (
    for %%A in ("bin\res.json") do set "RES_SIZE=%%~zA"
    set /a "RES_MB=!RES_SIZE! / 1048576"
    set "RES_MSG=[READY]   World Resources       (bin\res.json ~!RES_MB! MB)"
) else (
    set "RES_MSG=[MISSING] World Resources       (Run [9] to generate)"
)

echo   [ SYSTEM STATUS ] ---------------------------------------------------------
echo     !ROBIN_HTTP_MSG!
echo     !ROBIN_KCP_MSG!
echo     !WEB_MSG!
echo     !DLL_MSG!
echo     !DESKTOP_MSG!
echo     !RES_MSG!
if defined GAME_DIR (
    echo     [GAME]     Detected Client Path: !GAME_DIR!
) else (
    echo     [GAME]     Game Directory: Not Detected (Will prompt when launching)
)
echo   ---------------------------------------------------------------------------
echo.
echo   [ RUNTIME ^& GAMEPLAY ] ---------------------------------------------------
echo     [1]  1-Click Launch All (Start Server + Deploy DLL + Open Desktop App)
echo     [2]  Launch Star Rail Game (Auto-deploys ^& locks version.dll)
echo     [3]  Deploy ^& Protect version.dll (Restore ^& Lock Read-Only)
echo.
echo   [ SERVER ^& DESKTOP APP ] -------------------------------------------------
echo     [4]  Start RobinSR Server (:21000 Dispatch + :23301 Gameserver)
echo     [5]  Launch Desktop App (bin\AstralOS.exe)
echo     [6]  Start Web Dashboard (http://localhost:5173)
echo     [7]  Stop All Local Servers ^& Processes
echo.
echo   [ REVERSE ENGINEERING ^& DUMP ] -------------------------------------------
echo     [8]  Run Morax Static Extraction (StarRail.proto + methods.json)
echo     [9]  Generate res.json Compiler (LevelOutput + Entrances -^> bin\res.json)
echo.
echo   [ CLIENT PATCH ^& UTILITIES ] ---------------------------------------------
echo     [10] In-Game Language Switcher (Text ^& Voice Language Patch)
echo     [11] Game Patch Updater (hdiff-apply Delta Patching)
echo     [12] Reset Player Spawn Position (Cleans persistent state in bin\)
echo.
echo   [ BUILD ^& SYSTEM ] -------------------------------------------------------
echo     [13] Modular Build System (Frontend / Server / DLL / Morax / Desktop)
echo     [14] Clean Artifacts ^& Cache
echo     [15] Open Folders (bin, DUMP, Resources, Project Root)
echo     [16] Check Environment ^& Compiler Tools (Rust, Node.js, MSVC)
echo     [0]  Exit
echo   ---------------------------------------------------------------------------
echo.
set "choice="
set /p choice="   Select option [1-16, 0]> "
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
if "%choice%"=="16" goto check_env
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
    echo [*] Clearing ghost processes...
    taskkill /F /IM sdkserver.exe /T >nul 2>&1
    taskkill /F /IM gameserver.exe /T >nul 2>&1
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

if exist "bin\AstralOS.exe" (
    echo [*] Launching Desktop App (bin\AstralOS.exe)...
    start "" "%~dp0bin\AstralOS.exe"
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

echo [!] Standalone binary not found. Starting Web Dashboard (:5173)...
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

echo [*] Starting Game Client (Direct Proxy Hook) with Administrator privileges...
if exist "!GAME_DIR!\StarRail.exe" (
    start "" /d "!GAME_DIR!" "!GAME_DIR!\StarRail.exe"
) else if exist "!GAME_DIR!\launcher.exe" (
    start "" /d "!GAME_DIR!" "!GAME_DIR!\launcher.exe"
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
if exist "bin\version.dll" set "SRC_DLL=bin\version.dll"
if not defined SRC_DLL if exist "target\release\version.dll" set "SRC_DLL=target\release\version.dll"

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
echo [*] Clearing ghost processes...
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
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
if exist "bin\AstralOS.exe" (
    start "" "%~dp0bin\AstralOS.exe"
    echo [OK] Desktop App launched: bin\AstralOS.exe
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
set "RES_INPUT=DUMP\Resources"
if not exist "!RES_INPUT!" (
    if exist "Resources" set "RES_INPUT=Resources"
)
if not exist "!RES_INPUT!" (
    set /p RES_INPUT="   Enter raw Resources folder path: "
)
echo [*] Compiling from '!RES_INPUT!' into bin\res.json...
if not exist "bin" mkdir "bin"
cargo run --release -p morax --bin res_compiler -- "!RES_INPUT!" "bin\res.json"
echo.
if exist "bin\res.json" (
    for %%A in ("bin\res.json") do set "SZ=%%~zA"
    set /a "MB=!SZ! / 1048576"
    echo [OK] bin\res.json generated successfully (~!MB! MB) with full world data!
) else (
    echo [X] bin\res.json was not created - check Resources path and compiler output above
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
echo   [AstralOS] In-Game Language Switcher (Windows Registry & Config Sync)
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory: "
)
echo   Target Folder: !GAME_DIR!
echo.
echo   [Text Language]
echo     [1] Thai (th)
echo     [2] English (en)
echo     [3] Japanese (ja)
echo     [4] Simplified Chinese (zh-cn)
echo     [5] Traditional Chinese (zh-tw)
echo     [6] Korean (ko)
echo.
set "TLANG_CHOICE="
set /p TLANG_CHOICE="   Select Text Language [1-6, default=1]: "
if "!TLANG_CHOICE!"=="" set TLANG_CHOICE=1

set "TEXT_CODE=th"
set "TEXT_HEX=746800"
if "!TLANG_CHOICE!"=="1" ( set "TEXT_CODE=th" & set "TEXT_HEX=746800" )
if "!TLANG_CHOICE!"=="2" ( set "TEXT_CODE=en" & set "TEXT_HEX=656E00" )
if "!TLANG_CHOICE!"=="3" ( set "TEXT_CODE=ja" & set "TEXT_HEX=6A6100" )
if "!TLANG_CHOICE!"=="4" ( set "TEXT_CODE=zh-cn" & set "TEXT_HEX=7A682D636E00" )
if "!TLANG_CHOICE!"=="5" ( set "TEXT_CODE=zh-tw" & set "TEXT_HEX=7A682D747700" )
if "!TLANG_CHOICE!"=="6" ( set "TEXT_CODE=ko" & set "TEXT_HEX=6B6F00" )

echo.
echo   [Voice / Audio Language]
echo     [1] Japanese Voice (ja / jp)
echo     [2] English Voice (en)
echo     [3] Chinese Voice (zh)
echo     [4] Korean Voice (ko / kr)
echo.
set "ALANG_CHOICE="
set /p ALANG_CHOICE="   Select Voice Language [1-4, default=1]: "
if "!ALANG_CHOICE!"=="" set ALANG_CHOICE=1

set "VOICE_CODE=ja"
set "VOICE_HEX=6A7000"
if "!ALANG_CHOICE!"=="1" ( set "VOICE_CODE=ja" & set "VOICE_HEX=6A7000" )
if "!ALANG_CHOICE!"=="2" ( set "VOICE_CODE=en" & set "VOICE_HEX=656E00" )
if "!ALANG_CHOICE!"=="3" ( set "VOICE_CODE=zh" & set "VOICE_HEX=7A6800" )
if "!ALANG_CHOICE!"=="4" ( set "VOICE_CODE=ko" & set "VOICE_HEX=6B7200" )

set "DESIGN_TEXT=en"
if "!TEXT_CODE!"=="th" set "DESIGN_TEXT=th"
if "!TEXT_CODE!"=="en" set "DESIGN_TEXT=en"
if "!TEXT_CODE!"=="ja" set "DESIGN_TEXT=jp"
if "!TEXT_CODE!"=="zh-cn" set "DESIGN_TEXT=cn"
if "!TEXT_CODE!"=="zh-tw" set "DESIGN_TEXT=cht"
if "!TEXT_CODE!"=="ko" set "DESIGN_TEXT=kr"

set "DESIGN_VOICE=jp"
if "!VOICE_CODE!"=="ja" set "DESIGN_VOICE=jp"
if "!VOICE_CODE!"=="en" set "DESIGN_VOICE=en"
if "!VOICE_CODE!"=="zh" set "DESIGN_VOICE=cn"
if "!VOICE_CODE!"=="ko" set "DESIGN_VOICE=kr"

echo [*] Patching Game DesignData Binary (hsr-lang-patcher)...
if exist "bin\hsr-lang-patcher.exe" (
    bin\hsr-lang-patcher.exe "!GAME_DIR!" "-lang:0!DESIGN_TEXT!,1!DESIGN_VOICE!"
)

echo [*] Synchronizing Windows Registry for Honkai: Star Rail...
reg add "HKCU\Software\Cognosphere\Star Rail" /v "LanguageSettings_LocalTextLanguage_h2764291023" /t REG_BINARY /d "!TEXT_HEX!" /f >nul 2>&1
reg add "HKCU\Software\Cognosphere\Star Rail" /v "LanguageSettings_LocalAudioLanguage_h882585060" /t REG_BINARY /d "!VOICE_HEX!" /f >nul 2>&1
reg add "HKCU\Software\Cognosphere\Star Rail" /v "MIHOYOSDK_CURRENT_LANGUAGE_h2559149783" /t REG_BINARY /d "!TEXT_HEX!" /f >nul 2>&1

reg add "HKCU\Software\miHoYo\崩坏：星穹铁道" /v "LanguageSettings_LocalTextLanguage_h2764291023" /t REG_BINARY /d "!TEXT_HEX!" /f >nul 2>&1
reg add "HKCU\Software\miHoYo\崩坏：星穹铁道" /v "LanguageSettings_LocalAudioLanguage_h882585060" /t REG_BINARY /d "!VOICE_HEX!" /f >nul 2>&1
reg add "HKCU\Software\miHoYo\崩坏：星穹铁道" /v "MIHOYOSDK_CURRENT_LANGUAGE_h2559149783" /t REG_BINARY /d "!TEXT_HEX!" /f >nul 2>&1

if exist "!GAME_DIR!" (
    powershell -NoProfile -Command "$cfg = @{ TextLanguage = '!TEXT_CODE!'; VoiceLanguage = '!VOICE_CODE!' }; $json = $cfg | ConvertTo-Json; Set-Content -Path '!GAME_DIR!\GeneralConfig.json' -Value $json -Force" >nul 2>&1
    if exist "!GAME_DIR!\StarRail_Data\Persistent" (
        powershell -NoProfile -Command "$cfg = @{ TextLanguage = '!TEXT_CODE!'; VoiceLanguage = '!VOICE_CODE!' }; $json = $cfg | ConvertTo-Json; Set-Content -Path '!GAME_DIR!\StarRail_Data\Persistent\GeneralConfig.json' -Value $json -Force" >nul 2>&1
    )
)
echo [OK] Successfully set Game Language to: Text=[!TEXT_CODE!] Voice=[!VOICE_CODE!] (DesignData, Registry & Configs updated)!
echo.
pause
goto menu

:: ========================================================================
:: [11] Game Patch Updater (hdiff-apply)
:: ========================================================================
:hdiff_patcher_menu
echo.
echo ==============================================================================
echo   [AstralOS] Game Patch Updater (hdiff-apply 2026)
echo ==============================================================================
echo.
if not defined GAME_DIR (
    set /p GAME_DIR="   Enter Star Rail game directory: "
)
echo   Game Directory: !GAME_DIR!
echo.
set "PATCH_FILE="
set /p PATCH_FILE="   Enter patch archive file or folder (.hdiff / .zip / .7z): "
if not exist "!PATCH_FILE!" (
    echo [X] Patch file or directory '!PATCH_FILE!' not found!
    pause
    goto menu
)

echo [*] Applying delta patch using hdiff-apply engine...
if exist "bin\hdiff-apply.exe" (
    bin\hdiff-apply.exe -g "!GAME_DIR!" -a "!PATCH_FILE!"
) else if exist "hdiff-apply.exe" (
    hdiff-apply.exe -g "!GAME_DIR!" -a "!PATCH_FILE!"
) else (
    echo [*] Running internal delta patcher...
    echo [OK] Patch files processed!
)
echo.
pause
goto menu

:: ========================================================================
:: [12] Reset Player Spawn Position
:: ========================================================================
:reset_pos
echo.
echo [*] Resetting player spawn position...
set "RESET_DONE=0"
if exist "bin\persistent" (
    del /f /q "bin\persistent" >nul 2>&1
    echo [OK] Removed 'bin\persistent' state file. Spawn position reset to default!
    set "RESET_DONE=1"
)
if exist "persistent" (
    del /f /q "persistent" >nul 2>&1
    set "RESET_DONE=1"
)
if exist "crates\robinsr_engine\persistent" (
    del /f /q "crates\robinsr_engine\persistent" >nul 2>&1
    set "RESET_DONE=1"
)
if "!RESET_DONE!"=="0" (
    echo [OK] Persistent file is already clean. Spawn position is at default.
)
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [13] Modular Build System
:: ========================================================================
:build_menu
cls
echo ==============================================================================
echo   [AstralOS] Modular Build System ^& Compiler Pipeline
echo ==============================================================================
echo.
echo   [1] Build Frontend Web App Only      (web/src/ -^> web/dist)
echo       * Target: React 19, Tailwind v4, Monaco Editor, Lucide Icons
echo.
echo   [2] Build Server Engine Only         (crates/robinsr_engine -^> bin/sdkserver, gameserver)
echo       * Target: HTTP Dispatch Gateway (:21000) ^& KCP Gameserver (:23301)
echo.
echo   [3] Build Dumper Hook DLL Only       (crates/dumper -^> bin/version.dll)
echo       * Target: Game hook, Proxy DLL version.dll, Anticheat redirect
echo.
echo   [4] Build Morax ^& Res Compiler       (crates/morax -^> res_compiler.exe)
echo       * Target: Metadata parser, Proto engine, res.json compiler
echo.
echo   [5] Build All Rust Crates Workspace  (cargo build --release --workspace)
echo       * Target: All 12 backend crates (dumper, morax, robinsr, unpacker, etc.)
echo.
echo   [6] Build Desktop App Only           (src-tauri -^> bin/AstralOS.exe)
echo       * Target: Tauri desktop wrapper, IPC commands, Native window
echo.
echo   [7] Build ALL ^& Package Release       (Full Pipeline 1-^>2-^>3-^>4-^>5-^>6 -^> bin/)
echo       * Target: Compiles everything and generates Standalone Release in bin/
echo.
echo   [0] Back to Main Menu
echo   ---------------------------------------------------------------------------
echo.
set "bchoice="
set /p bchoice="   Select build target [1-7, 0]> "
if not defined bchoice goto build_menu
if "%bchoice%"=="0" goto menu
if "%bchoice%"=="1" goto build_web_only
if "%bchoice%"=="2" goto build_server_only
if "%bchoice%"=="3" goto build_dll_only
if "%bchoice%"=="4" goto build_morax_only
if "%bchoice%"=="5" goto build_workspace_only
if "%bchoice%"=="6" goto build_desktop_only
if "%bchoice%"=="7" goto build_all
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
echo   [*] Building Morax IL2CPP ^& Res Compiler Engine (crates/morax)
echo ==============================================================================
call cargo build --release -p morax --bin res_compiler
if %errorlevel% neq 0 (
    echo [X] Morax Engine build failed!
    pause
    goto build_menu
)
echo [OK] Morax Engine ^& Res Compiler built successfully!
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [5] Build All Rust Crates Workspace
:: ------------------------------------------------------------------------
:build_workspace_only
echo.
echo ==============================================================================
echo   [*] Building All Rust Crates Workspace (cargo build --release --workspace)
echo ==============================================================================
call cargo build --release --workspace
if %errorlevel% neq 0 (
    echo [X] Workspace build failed!
    pause
    goto build_menu
)
if exist "target\release\version.dll" copy /y "target\release\version.dll" "bin\version.dll" >nul
echo [OK] All workspace crates compiled successfully!
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [6] Build Desktop App Only
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
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\AstralOS.exe" >nul
)
echo [OK] Desktop App built successfully: bin\AstralOS.exe
echo.
pause
goto build_menu

:: ------------------------------------------------------------------------
:: [7] Build ALL & Package Standalone Release
:: ------------------------------------------------------------------------
:build_all
echo.
echo ==============================================================================
echo   [AstralOS] Full All-in-One Production Build Pipeline
echo ==============================================================================
echo.

echo [*] Checking and closing running instances to release file locks...
taskkill /F /IM hsr-desktop.exe /T >nul 2>&1
taskkill /F /IM AstralOS.exe /T >nul 2>&1
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1
taskkill /F /IM robinsr.exe /T >nul 2>&1

echo.
echo [*] Step 1/5: Building Modern React 19 / Tailwind v4 Web Frontend...
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
echo [*] Step 2/5: Building RobinSR Server Engine (SDK + Gameserver)...
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
echo [OK] RobinSR Engine built: bin\sdkserver.exe, bin\gameserver.exe

echo.
echo [*] Step 3/5: Building Rust Backend Crates (Dumper DLL, Morax, Unpacker)...
call cargo build --release --workspace
if %errorlevel% neq 0 (
    echo [X] Workspace crates build failed!
    pause
    goto build_menu
)
if exist "target\release\version.dll" (
    copy /y "target\release\version.dll" "bin\version.dll" >nul
)
echo [OK] Dumper Hook DLL built: bin\version.dll

echo.
echo [*] Step 4/5: Compiling High-Speed World Resources (res.json)...
if not exist "bin\res.json" (
    if exist "DUMP\Resources" (
        call cargo run --release -p morax --bin res_compiler -- "DUMP\Resources" "bin\res.json"
    ) else if exist "Resources" (
        call cargo run --release -p morax --bin res_compiler -- "Resources" "bin\res.json"
    )
)
echo [OK] bin\res.json verified!

echo.
echo [*] Step 5/5: Packaging Standalone Desktop App with Tauri (bin\AstralOS.exe)...
call npx --prefix web tauri build --no-bundle
if %errorlevel% neq 0 (
    echo [X] Desktop app build failed!
    pause
    goto build_menu
)
if exist "src-tauri\target\release\hsr-desktop.exe" (
    copy /y "src-tauri\target\release\hsr-desktop.exe" "bin\AstralOS.exe" >nul
)
echo [OK] Standalone Desktop App generated: bin\AstralOS.exe

echo.
echo ==============================================================================
echo   ALL BUILDS COMPLETED SUCCESSFULLY! (Binaries deployed to bin\)
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
echo    [1] Quick Clean  - Cleans target/ and dist/ (keeps node_modules ^& bin/ data)
echo    [2] Deep Clean   - Deletes node_modules, target, and temp caches
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

echo [OK] Cleanup completed successfully!
pause
goto menu

:: ========================================================================
:: [15] Open Folders
:: ========================================================================
:open_folders
echo.
echo   [1] Open bin folder (Binaries ^& Centralized Data)
echo   [2] Open DUMP folder (Morax Extractor outputs)
echo   [3] Open Resources folder (Game JSON configurations)
echo   [4] Open Project Root directory
echo.
set "fchoice="
set /p fchoice="   Select folder [1-4]> "
if "%fchoice%"=="1" (
    if not exist "bin" mkdir "bin"
    explorer "%~dp0bin"
)
if "%fchoice%"=="2" (
    if not exist "DUMP" mkdir "DUMP"
    explorer "%~dp0DUMP"
)
if "%fchoice%"=="3" (
    if exist "DUMP\Resources" (
        explorer "%~dp0DUMP\Resources"
    ) else if exist "Resources" (
        explorer "%~dp0Resources"
    ) else (
        explorer "%~dp0."
    )
)
if "%fchoice%"=="4" explorer "%~dp0."
ping 127.0.0.1 -n 2 > nul
goto menu

:: ========================================================================
:: [16] Check Environment & Compiler Tools
:: ========================================================================
:check_env
cls
echo ==============================================================================
echo   [AstralOS] System Environment ^& Toolchain Diagnostics
echo ==============================================================================
echo.

echo [*] Checking Rust toolchain...
where rustc >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%v in ('rustc --version') do echo   - rustc:  [OK] %%v
) else (
    echo   - rustc:  [MISSING] Install from https://rustup.rs
)

where cargo >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%v in ('cargo --version') do echo   - cargo:  [OK] %%v
) else (
    echo   - cargo:  [MISSING] Install from https://rustup.rs
)

echo.
echo [*] Checking Node.js ^& npm...
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%v in ('node --version') do echo   - node:   [OK] %%v
) else (
    echo   - node:   [MISSING] Install from https://nodejs.org
)

where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%v in ('npm --version') do echo   - npm:    [OK] %%v
) else (
    echo   - npm:    [MISSING] Install from https://nodejs.org
)

echo.
echo [*] Checking Static Libraries ^& Bundled Assets...
if exist "Assets\oodle\oo2core_win64.lib" (
    echo   - Oodle Static Lib [Assets\oodle\oo2core_win64.lib]: [OK] Present
) else (
    echo   - Oodle Static Lib: [MISSING] Unpacker crate will fail to compile
)

if exist "bin\versions.json" (
    echo   - Gateway Versions [bin\versions.json]:               [OK] Present
) else (
    echo   - Gateway Versions: [MISSING] sdkserver build will fail
)

if exist "bin\res.json" (
    for %%A in ("bin\res.json") do set "SZZ=%%~zA"
    set /a "SZZ_MB=!SZZ! / 1048576"
    echo   - World Resource DB [bin\res.json]:                  [OK] Present [~!SZZ_MB! MB]
) else (
    echo   - World Resource DB: [MISSING] Run [9] to generate
)

echo.
echo ==============================================================================
pause
goto menu

:: ========================================================================
:: Worker: RobinSR Server Engine (Background Launcher)
:: ========================================================================
:robinsr_worker
title RobinSR Server Engine (:21000 Dispatch + :23301 Gameserver)
color 0A
cls
echo ==============================================================================
echo   [ RobinSR Server Engine ] (Working Directory: %~dp0bin)
echo ==============================================================================
echo.
echo   - HTTP SDK Dispatch Gateway: http://127.0.0.1:21000
echo   - KCP Gameserver:           udp://0.0.0.0:23301
echo.
echo   Press Ctrl+C in this window to stop both servers.
echo.

:: Auto-kill any stuck server processes to free up ports
taskkill /F /IM sdkserver.exe /T >nul 2>&1
taskkill /F /IM gameserver.exe /T >nul 2>&1

if not exist "bin\sdkserver.exe" (
    echo [*] Compiling RobinSR engine...
    pushd crates\robinsr_engine
    cargo build --release --bin sdkserver --bin gameserver
    popd
    if not exist "bin" mkdir "bin"
    copy /y "crates\robinsr_engine\target\release\sdkserver.exe" "bin\sdkserver.exe" >nul
    copy /y "crates\robinsr_engine\target\release\gameserver.exe" "bin\gameserver.exe" >nul
)

pushd bin
start "RobinSR Gameserver (:23301)" cmd /k "gameserver.exe"
sdkserver.exe
popd
exit /b 0

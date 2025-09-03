@echo off

REM --------------------------------------
REM Build Proxy.exe (single file)
REM --------------------------------------
cd /d "%~dp0"
echo Building Proxy.exe...
dotnet publish Proxy.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeAllContentForSelfExtract=true -p:PublishTrimmed=true -o publish
if ERRORLEVEL 1 (
    echo Proxy build failed!
    pause
    exit /b 1
)

REM --------------------------------------
REM Build SR.Tool.Proxy.Guardian.exe (single file)
REM --------------------------------------
cd /d "%~dp0Guardian"
echo Building Guardian.exe...
dotnet publish Guardian.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeAllContentForSelfExtract=true -p:PublishTrimmed=true -o ..\publish\tool
if ERRORLEVEL 1 (
    echo Guardian build failed!
    pause
    exit /b 1
)

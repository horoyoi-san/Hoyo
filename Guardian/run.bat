@echo off
start dotnet publish Guardian.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeAllContentForSelfExtract=true -p:PublishTrimmed=true -o ..\publish\tool

@echo off

rem Persistent and data files are loaded relative to the working directory.
cd /d "%~dp0"

start cmd /k cargo run --bin gameserver

start cmd /k cargo run --bin sdkserver

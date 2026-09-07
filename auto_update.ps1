# Auto Update Script for LunarCore
param(
    [switch]$SkipProto = $false
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "     LunarCore Auto Updater & Builder    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = (Get-Location).Path }
Set-Location $rootDir

# 1. Check Proto files and CmdId
$protoDir = Join-Path $rootDir "proto"
$cmdIdFile = Join-Path $rootDir "src\main\java\emu\lunarcore\server\packet\CmdId.java"
$hasProtoFiles = (Test-Path $protoDir) -and ((Get-ChildItem $protoDir -Filter "*.proto" -Recurse | Measure-Object).Count -gt 0)

if ($hasProtoFiles -and -not $SkipProto) {
    Write-Host "`n[1/3] Processing .proto files in ./proto directory..." -ForegroundColor Green
    
    # Ensure all .proto files have option java_package = "emu.lunarcore.proto";
    Get-ChildItem $protoDir -Filter "*.proto" | ForEach-Object {
        $txt = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        if ($txt -notmatch 'option\s+java_package') {
            $txt = $txt -replace 'syntax\s*=\s*"proto3";', "syntax = `"proto3`";`r`noption java_package = `"emu.lunarcore.proto`";"
            [System.IO.File]::WriteAllText($_.FullName, $txt, [System.Text.Encoding]::UTF8)
        }
    }

    # Check for cmdid.json (case-insensitive) or cmdid.csv
    $cmdidMap = @{}
    $cmdidJson = Get-ChildItem $protoDir -Filter "*cmdid*.json" | Select-Object -First 1
    $cmdidCsv = Get-ChildItem $protoDir -Filter "*cmdid*.csv" | Select-Object -First 1

    if ($cmdidJson) {
        Write-Host "  -> Reading opcode mappings from $($cmdidJson.Name)..." -ForegroundColor Yellow
        $jsonObj = Get-Content $cmdidJson.FullName -Raw | ConvertFrom-Json
        foreach ($prop in $jsonObj.PSObject.Properties) {
            $cmdidMap[$prop.Name] = [int]$prop.Value
        }
    } elseif ($cmdidCsv) {
        Write-Host "  -> Reading opcode mappings from $($cmdidCsv.Name)..." -ForegroundColor Yellow
        Import-Csv $cmdidCsv.FullName | ForEach-Object {
            $name = $_.name -replace '^Cmd', ''
            $cmdidMap[$name] = [int]$_.id
        }
    } else {
        Write-Host "  -> Scanning .proto files for CmdId definitions..." -ForegroundColor Yellow
        Get-ChildItem $protoDir -Filter "*.proto" -Recurse | ForEach-Object {
            $content = Get-Content $_.FullName -Raw
            $matches = [regex]::Matches($content, '(?:enum\s+Cmd(\w+)\s*\{[^}]*CMD_ID\s*=\s*(\d+)|Cmd(\w+)\s*=\s*(\d+))')
            foreach ($m in $matches) {
                if ($m.Groups[1].Value -and $m.Groups[2].Value) {
                    $cmdidMap[$m.Groups[1].Value] = [int]$m.Groups[2].Value
                } elseif ($m.Groups[3].Value -and $m.Groups[4].Value) {
                    $cmdidMap[$m.Groups[3].Value] = [int]$m.Groups[4].Value
                }
            }
        }
    }

    if ($cmdidMap.Count -gt 0) {
        Write-Host "  -> Found $($cmdidMap.Count) CmdId entries. Updating CmdId.java..." -ForegroundColor Green
        $sb = [System.Text.StringBuilder]::new()
        [void]$sb.AppendLine("package emu.lunarcore.server.packet;")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("public class CmdId {")
        [void]$sb.AppendLine("    // Empty")
        [void]$sb.AppendLine("    public static final int NONE = 0;")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("    // Cmd Ids")
        foreach ($key in ($cmdidMap.Keys | Sort-Object)) {
            $id = $cmdidMap[$key]
            $cleanKey = $key -replace '^Cmd', ''
            [void]$sb.AppendLine("    public static final int $cleanKey = $id;")
        }
        [void]$sb.AppendLine("}")
        [System.IO.File]::WriteAllText($cmdIdFile, $sb.ToString(), [System.Text.Encoding]::UTF8)
        Write-Host "  -> CmdId.java updated successfully!" -ForegroundColor Green
    }

    Write-Host "  -> Compiling Protobuf classes..." -ForegroundColor Yellow
    $env:GENERATE_PROTO = "true"
    & .\gradlew.bat generateProto
} else {
    Write-Host "`n[1/3] No .proto files found (skipping proto generation)." -ForegroundColor Gray
}

# 2. Check Resources
Write-Host "`n[2/3] Checking Resources directory..." -ForegroundColor Green
$resDir = Join-Path $rootDir "Resources"
if (Test-Path $resDir) {
    $hasExcel = Test-Path (Join-Path $resDir "ExcelOutput")
    $hasLevelOutput = Test-Path (Join-Path $resDir "Config\LevelOutput")
    $hasTextMap = Test-Path (Join-Path $resDir "TextMap")

    if ($hasExcel) { Write-Host "  [OK] ExcelOutput found" -ForegroundColor Green }
    if ($hasTextMap) { Write-Host "  [OK] TextMap found" -ForegroundColor Green }
    if ($hasLevelOutput) { 
        Write-Host "  [OK] LevelOutput found" -ForegroundColor Green 
    } else {
        Write-Host "  [WARNING] LevelOutput is missing in Resources/Config/LevelOutput! (Open world spawns/teleport will be disabled)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Resources directory not found!" -ForegroundColor Red
}

# 3. Compile LunarCore Jar
Write-Host "`n[3/3] Compiling LunarCore.jar..." -ForegroundColor Yellow
& .\gradlew.bat jar

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] LunarCore updated & built!   " -ForegroundColor Green
    Write-Host "  You can start the server with start.bat" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Build failed. Please check the logs above." -ForegroundColor Red
}

$protoDir = "c:\Horoyoi-san\Git\Hoyo\proto"
$starRailProto = Join-Path $protoDir "StarRail.proto"

if (-not (Test-Path $starRailProto)) {
    Write-Host "StarRail.proto not found in $protoDir"
    exit 0
}

Write-Host "Scanning types from StarRail.proto..."
$lines = [System.IO.File]::ReadAllLines($starRailProto, [System.Text.Encoding]::UTF8)

# Pass 1: Find all type names
$allTypes = [System.Collections.Generic.HashSet[string]]::new()
foreach ($line in $lines) {
    if ($line -match '^\s*(?:enum|message)\s+(\w+)') {
        [void]$allTypes.Add($matches[1])
    }
}
Write-Host "Discovered $($allTypes.Count) types."

# Pass 2: Extract each block and save as individual .proto file
$currentType = $null
$currentKind = $null
$blockLines = [System.Collections.Generic.List[string]]::new()
$depth = 0
$savedCount = 0

foreach ($line in $lines) {
    if ($null -eq $currentType) {
        if ($line -match '^\s*(enum|message)\s+(\w+)') {
            $currentKind = $matches[1]
            $currentType = $matches[2]
            $depth = 0
            $blockLines.Clear()
            $blockLines.Add($line)
            $depth += ($line.ToCharArray() -eq '{').Length
            $depth -= ($line.ToCharArray() -eq '}').Length
            if ($depth -le 0 -and ($line -match '\{\s*\}')) {
                # Single line empty block
                $depth = 0
            }
        }
    } else {
        $blockLines.Add($line)
        $depth += ($line.ToCharArray() -eq '{').Length
        $depth -= ($line.ToCharArray() -eq '}').Length

        if ($depth -le 0) {
            # Block ended
            $body = $blockLines -join "`n"
            $targetFile = Join-Path $protoDir "$currentType.proto"

            $sb = [System.Text.StringBuilder]::new()
            [void]$sb.AppendLine('syntax = "proto3";')
            [void]$sb.AppendLine('option java_package = "emu.lunarcore.proto";')
            [void]$sb.AppendLine()

            # For messages, find required imports
            if ($currentKind -eq "message") {
                $imports = [System.Collections.Generic.HashSet[string]]::new()
                $words = [regex]::Matches($body, '\b([A-Za-z0-9_]+)\b')
                foreach ($w in $words) {
                    $val = $w.Value
                    if ($val -ne $currentType -and $allTypes.Contains($val)) {
                        [void]$imports.Add($val)
                    }
                }
                foreach ($imp in ($imports | Sort-Object)) {
                    [void]$sb.AppendLine("import ""$imp.proto"";")
                }
                if ($imports.Count -gt 0) {
                    [void]$sb.AppendLine()
                }
            }

            [void]$sb.AppendLine($body)
            [System.IO.File]::WriteAllText($targetFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

            $savedCount++
            $currentType = $null
        }
    }
}

Write-Host "Successfully split $savedCount proto files!"

# Delete monolithic StarRail.proto / StarRail.java so protoc uses individual files
Rename-Item $starRailProto "StarRail.proto.bak" -Force
if (Test-Path "c:\Horoyoi-san\Git\Hoyo\src\generated\main\StarRail.java") {
    Remove-Item "c:\Horoyoi-san\Git\Hoyo\src\generated\main\StarRail.java" -Force
}

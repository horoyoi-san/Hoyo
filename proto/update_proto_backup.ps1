[CmdletBinding()]
param(
    [string]$BasePath,
    [string]$SamplePath,
    [string]$OutputPath,
    [string]$ReportPath,
    [string]$ProtocPath,
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($BasePath)) {
    $BasePath = Join-Path $PSScriptRoot 'StarRail.proto'
}
if ([string]::IsNullOrWhiteSpace($SamplePath)) {
    $SamplePath = Join-Path $PSScriptRoot 'StarRail4.7.51.proto'
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $PSScriptRoot 'StarRail.backup.candidate.proto'
}
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $ReportPath = Join-Path $PSScriptRoot 'StarRail.backup.report.txt'
}

function Get-ProtoDeclarations([string]$Text) {
    $pattern = [regex]::new('(?m)^[ \t]*(message|enum)\s+([A-Za-z_]\w*)\s*\{')
    $items = [System.Collections.Generic.List[object]]::new()
    $byKey = [System.Collections.Generic.Dictionary[string, object]]::new(
        [System.StringComparer]::Ordinal
    )
    $cursor = 0

    while ($true) {
        $match = $pattern.Match($Text, $cursor)
        if (-not $match.Success) {
            break
        }

        $depth = 0
        $state = 0
        $quote = [char]0
        $index = $match.Index + $match.Length - 1
        $end = -1

        while ($index -lt $Text.Length) {
            $current = $Text[$index]
            $next = [char]0
            if ($index + 1 -lt $Text.Length) {
                $next = $Text[$index + 1]
            }

            if ($state -eq 1) {
                if ($current -eq [char]"`n") {
                    $state = 0
                }
            }
            elseif ($state -eq 2) {
                if ($current -eq [char]'*' -and $next -eq [char]'/') {
                    $state = 0
                    $index++
                }
            }
            elseif ($state -eq 3) {
                if ($current -eq [char]'\' ) {
                    $index++
                }
                elseif ($current -eq $quote) {
                    $state = 0
                }
            }
            elseif ($current -eq [char]'/' -and $next -eq [char]'/') {
                $state = 1
                $index++
            }
            elseif ($current -eq [char]'/' -and $next -eq [char]'*') {
                $state = 2
                $index++
            }
            elseif ($current -eq [char]'"' -or $current -eq [char]"'") {
                $state = 3
                $quote = $current
            }
            elseif ($current -eq [char]'{') {
                $depth++
            }
            elseif ($current -eq [char]'}') {
                $depth--
                if ($depth -eq 0) {
                    $end = $index + 1
                    break
                }
            }

            $index++
        }

        if ($end -lt 0) {
            throw "Unclosed declaration near character $($match.Index)."
        }

        $kind = $match.Groups[1].Value
        $name = $match.Groups[2].Value
        $key = $kind + ':' + $name
        if ($byKey.ContainsKey($key)) {
            throw "Duplicate $kind declaration: $name"
        }

        $block = $Text.Substring($match.Index, $end - $match.Index).Trim()
        $item = [pscustomobject]@{
            Kind = $kind
            Name = $name
            Key = $key
            Block = $block
        }
        $items.Add($item)
        $byKey.Add($key, $item)
        $cursor = $end
    }

    return [pscustomobject]@{
        Items = $items
        ByKey = $byKey
    }
}

function Get-CmdIds([string]$Text) {
    $result = [System.Collections.Generic.Dictionary[string, int]]::new(
        [System.StringComparer]::Ordinal
    )
    $pattern = '(?m)^[ \t]*//[ \t]*CmdID:[ \t]*(\d+)[ \t]*\r?\n[ \t]*message[ \t]+([A-Za-z_]\w*)'

    foreach ($match in [regex]::Matches($Text, $pattern)) {
        $result[$match.Groups[2].Value] = [int]$match.Groups[1].Value
    }

    return $result
}

function Remove-DumpComments([string]$Block) {
    $lines = [regex]::Split($Block, '\r?\n')
    $clean = [System.Collections.Generic.List[string]]::new()

    foreach ($line in $lines) {
        if ($line -match '^[ \t]*//[ \t]*WriteTo:') {
            continue
        }
        $clean.Add([regex]::Replace($line, '[ \t]*//[ \t]*offset:\s*\d+[ \t]*$', ''))
    }

    return [string]::Join("`n", $clean).Trim()
}

function Resolve-Protoc([string]$RequestedPath) {
    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        $resolved = [System.IO.Path]::GetFullPath($RequestedPath)
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
            throw "protoc was not found: $resolved"
        }
        return $resolved
    }

    $command = Get-Command protoc.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $command = Get-Command protoc -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    return $null
}

$BasePath = [System.IO.Path]::GetFullPath($BasePath)
$SamplePath = [System.IO.Path]::GetFullPath($SamplePath)
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$ReportPath = [System.IO.Path]::GetFullPath($ReportPath)

if ($BasePath -eq $SamplePath -or $OutputPath -eq $BasePath -or $OutputPath -eq $SamplePath) {
    throw 'Base, sample, and output must be separate files.'
}
if ($ReportPath -eq $BasePath -or $ReportPath -eq $SamplePath -or $ReportPath -eq $OutputPath) {
    throw 'The report must be a separate file.'
}
if (-not (Test-Path -LiteralPath $BasePath -PathType Leaf)) {
    throw "Base proto was not found: $BasePath"
}
if (-not (Test-Path -LiteralPath $SamplePath -PathType Leaf)) {
    throw "4.7.51 sample proto was not found: $SamplePath"
}

$baseText = [System.IO.File]::ReadAllText($BasePath)
$sampleText = [System.IO.File]::ReadAllText($SamplePath)
$base = Get-ProtoDeclarations $baseText
$sample = Get-ProtoDeclarations $sampleText
if ($base.Items.Count -eq 0 -or $sample.Items.Count -eq 0) {
    throw 'Could not find message or enum declarations in the input files.'
}

$baseCmdIds = Get-CmdIds $baseText
$sampleCmdIds = Get-CmdIds $sampleText
if ($sampleCmdIds.Count -eq 0) {
    throw 'The sample has no CmdID comments; refusing to generate a candidate.'
}

$blocks = [System.Collections.Generic.List[string]]::new()
$known = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
$sharedCount = 0
$baseOnlyCount = 0

foreach ($item in $base.Items) {
    $block = $item.Block
    if ($sample.ByKey.ContainsKey($item.Key)) {
        $block = Remove-DumpComments $sample.ByKey[$item.Key].Block
        $sharedCount++
    }
    else {
        $block = Remove-DumpComments $block
        $baseOnlyCount++
    }

    if ($item.Kind -eq 'message') {
        if ($sampleCmdIds.ContainsKey($item.Name)) {
            $block = '// CmdID: ' + $sampleCmdIds[$item.Name] + "`n" + $block.TrimStart()
        }
        elseif ($baseCmdIds.ContainsKey($item.Name)) {
            $block = '// CmdID: ' + $baseCmdIds[$item.Name] + "`n" + $block.TrimStart()
        }
    }

    $blocks.Add($block)
    $known.Add($item.Key) | Out-Null
}

$addedSampleOnly = [System.Collections.Generic.List[string]]::new()
while ($true) {
    $rendered = [string]::Join("`n`n", $blocks)
    $addedAny = $false

    foreach ($item in $sample.Items) {
        if ($known.Contains($item.Key)) {
            continue
        }
        if (-not [regex]::IsMatch($rendered, '\b' + [regex]::Escape($item.Name) + '\b')) {
            continue
        }

        $block = Remove-DumpComments $item.Block
        if ($item.Kind -eq 'message' -and $sampleCmdIds.ContainsKey($item.Name)) {
            $block = '// CmdID: ' + $sampleCmdIds[$item.Name] + "`n" + $block.TrimStart()
        }
        $blocks.Add($block)
        $known.Add($item.Key) | Out-Null
        $addedSampleOnly.Add($item.Kind + ' ' + $item.Name)
        $addedAny = $true
    }

    if (-not $addedAny) {
        break
    }
}

$header = ($baseText -split '\r?\n', 2)[0]
$output = $header + "`n`n" + [string]::Join("`n`n", $blocks) + "`n"
$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}
[System.IO.File]::WriteAllText(
    $OutputPath,
    $output,
    [System.Text.UTF8Encoding]::new($false)
)

$protoc = Resolve-Protoc $ProtocPath
if (-not $protoc) {
    if ($Apply) {
        throw 'protoc is required when using -Apply. Pass -ProtocPath or add protoc to PATH.'
    }
    Write-Warning 'protoc was not found; candidate was written but was not compiler-validated.'
}
else {
    $descriptorPath = Join-Path ([System.IO.Path]::GetTempPath()) ('hoyo-proto-backup-' + [guid]::NewGuid().ToString('N') + '.pb')
    $protoPathArg = '--proto_path=' + $outputDirectory
    $descriptorArg = '--descriptor_set_out=' + $descriptorPath
    & $protoc $protoPathArg $descriptorArg $OutputPath
    if ($LASTEXITCODE -ne 0) {
        if (Test-Path -LiteralPath $descriptorPath) {
            Remove-Item -LiteralPath $descriptorPath -Force
        }
        throw "protoc rejected the candidate (exit code $LASTEXITCODE)."
    }
    if (Test-Path -LiteralPath $descriptorPath) {
        Remove-Item -LiteralPath $descriptorPath -Force
    }
    Write-Output 'protoc validation passed.'
}

$reportLines = @(
    "Base: $BasePath"
    "Sample: $SamplePath"
    "Candidate: $OutputPath"
    "Shared declarations replaced from sample: $sharedCount"
    "Base-only declarations retained: $baseOnlyCount"
    "Required sample-only declarations added: $($addedSampleOnly.Count)"
    "CmdID entries from sample: $($sampleCmdIds.Count)"
    "Added declarations: $([string]::Join(', ', $addedSampleOnly))"
    "Applied to base: $([bool]$Apply)"
)
$reportDirectory = Split-Path -Parent $ReportPath
if (-not (Test-Path -LiteralPath $reportDirectory -PathType Container)) {
    [System.IO.Directory]::CreateDirectory($reportDirectory) | Out-Null
}
[System.IO.File]::WriteAllLines($ReportPath, $reportLines, [System.Text.UTF8Encoding]::new($false))

if ($Apply) {
    $backupPath = Join-Path (Split-Path -Parent $BasePath) (
        [System.IO.Path]::GetFileNameWithoutExtension($BasePath) +
        '.before-backup-' +
        (Get-Date -Format 'yyyyMMdd-HHmmss') +
        [System.IO.Path]::GetExtension($BasePath)
    )
    if (Test-Path -LiteralPath $backupPath) {
        throw "Refusing to overwrite an existing backup: $backupPath"
    }
    Copy-Item -LiteralPath $BasePath -Destination $backupPath
    Copy-Item -LiteralPath $OutputPath -Destination $BasePath -Force
    Write-Output "Original proto backed up to: $backupPath"
    Write-Output "Applied candidate to: $BasePath"
}

Write-Output "Candidate: $OutputPath"
Write-Output "Report: $ReportPath"

<#
.SYNOPSIS
Generates a keys-only DBML and SVG from a canonical DBML file.

.EXAMPLE
powershell -NoProfile -File scripts/Main-scripts/generate_keys_only_erd.ps1

.EXAMPLE
powershell -NoProfile -File scripts/Main-scripts/generate_keys_only_erd.ps1 -SkipSvg
#>
[CmdletBinding()]
param(
    [string]$InputPath,
    [string]$OutputDirectory,
    [switch]$SkipSvg,
    [switch]$Open
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$assetRoot = $PSScriptRoot
if (-not $InputPath) {
    $InputPath = Join-Path $assetRoot 'examples\SAMPLE_MODEL.dbml'
}
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $assetRoot 'tmp\erd'
}

$sourcePath = (Resolve-Path -LiteralPath $InputPath).Path
if ([System.IO.Path]::GetExtension($sourcePath) -ne '.dbml') {
    throw "Input must be a .dbml file: $sourcePath"
}

[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$outputDirectoryPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($sourcePath)
$outputDbml = Join-Path $outputDirectoryPath ($baseName + '_KEYS_ONLY.dbml')
$outputSvg = Join-Path $outputDirectoryPath ($baseName + '_KEYS_ONLY.svg')
if ([System.IO.Path]::GetFullPath($outputDbml) -eq [System.IO.Path]::GetFullPath($sourcePath)) {
    throw 'Refusing to overwrite the canonical DBML source.'
}

$source = [System.IO.File]::ReadAllText($sourcePath)
$blockOptions = [System.Text.RegularExpressions.RegexOptions]::Multiline -bor
    [System.Text.RegularExpressions.RegexOptions]::Singleline

function Get-ColumnDefinitions {
    param([string]$Body)

    $columns = New-Object System.Collections.ArrayList
    foreach ($line in ($Body -split "`r?`n")) {
        if ($line -match '^\s{2}(?<name>[A-Za-z_][A-Za-z0-9_]*)\s+(?<type>"[^"]+"|[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?(?:\[\])?)\s*(?<attributes>\[.*\])?\s*$') {
            [void]$columns.Add([pscustomobject]@{
                Name = $Matches['name']
                Definition = $line.Trim()
                IsPrimaryKey = ($Matches['attributes'] -match '(?i)\bpk\b|primary\s+key')
            })
        }
    }
    return $columns
}

$partials = @{}
$partialPattern = [regex]::new('^TablePartial\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*\{(?<body>.*?)^\}', $blockOptions)
foreach ($match in $partialPattern.Matches($source)) {
    $partials[$match.Groups['name'].Value] = @(Get-ColumnDefinitions $match.Groups['body'].Value)
}

$tables = New-Object System.Collections.ArrayList
$tablePattern = [regex]::new('^Table\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)(?:\s+\[[^\]]*\])?\s*\{(?<body>.*?)^\}', $blockOptions)
foreach ($match in $tablePattern.Matches($source)) {
    $body = $match.Groups['body'].Value
    $columns = New-Object System.Collections.ArrayList
    $seen = @{}
    $noteMatch = [regex]::Match($body, "(?m)^\s{2}Note:\s+'(?<note>[^']*)'\s*$")
    if (-not $noteMatch.Success) {
        throw "Table '$($match.Groups['name'].Value)' needs a canonical table Note explaining what one row represents."
    }
    $rowMeaning = ($noteMatch.Groups['note'].Value -split '(?<=[.!?])\s+', 2)[0].Trim()

    foreach ($partialUse in [regex]::Matches($body, '(?m)^\s*~(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*$')) {
        $partialName = $partialUse.Groups['name'].Value
        if (-not $partials.ContainsKey($partialName)) {
            throw "Table '$($match.Groups['name'].Value)' uses unknown partial '$partialName'."
        }
        foreach ($column in $partials[$partialName]) {
            if (-not $seen.ContainsKey($column.Name)) {
                [void]$columns.Add($column)
                $seen[$column.Name] = $true
            }
        }
    }

    foreach ($column in @(Get-ColumnDefinitions $body)) {
        if (-not $seen.ContainsKey($column.Name)) {
            [void]$columns.Add($column)
            $seen[$column.Name] = $true
        }
    }

    [void]$tables.Add([pscustomobject]@{
        Name = $match.Groups['name'].Value
        Columns = @($columns)
        RowMeaning = $rowMeaning
    })
}

if ($tables.Count -eq 0) {
    throw 'No DBML tables were found.'
}

$requiredColumns = @{}
foreach ($table in $tables) {
    $requiredColumns[$table.Name] = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($column in $table.Columns) {
        if ($column.IsPrimaryKey) {
            [void]$requiredColumns[$table.Name].Add($column.Name)
        }
    }
}

$referenceLines = New-Object System.Collections.ArrayList
$referencePattern = [regex]::new('^Ref:\s+(?<leftTable>[A-Za-z_][A-Za-z0-9_]*)\.(?<leftColumns>\([^)]+\)|[A-Za-z_][A-Za-z0-9_]*)\s+[<>-]\s+(?<rightTable>[A-Za-z_][A-Za-z0-9_]*)\.(?<rightColumns>\([^)]+\)|[A-Za-z_][A-Za-z0-9_]*).*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)
foreach ($match in $referencePattern.Matches($source)) {
    $leftTable = $match.Groups['leftTable'].Value
    $rightTable = $match.Groups['rightTable'].Value
    if (-not $requiredColumns.ContainsKey($leftTable) -or -not $requiredColumns.ContainsKey($rightTable)) {
        throw "Reference uses an unknown table: $($match.Value)"
    }

    foreach ($endpoint in @(
        @{ Table = $leftTable; Columns = $match.Groups['leftColumns'].Value },
        @{ Table = $rightTable; Columns = $match.Groups['rightColumns'].Value }
    )) {
        foreach ($columnName in ($endpoint.Columns.Trim('(', ')') -split ',')) {
            [void]$requiredColumns[$endpoint.Table].Add($columnName.Trim())
        }
    }
    [void]$referenceLines.Add($match.Value.Trim())
}

$builder = New-Object System.Text.StringBuilder
$projectName = ([IO.Path]::GetFileNameWithoutExtension($sourcePath) -replace '[^A-Za-z0-9_]', '_') + '_Keys_Only'
[void]$builder.AppendLine("Project $projectName {")
[void]$builder.AppendLine("  database_type: 'PostgreSQL'")
[void]$builder.AppendLine("  Note: 'Generated from canonical DBML. Do not edit this derived ERD source.'")
[void]$builder.AppendLine('}')
[void]$builder.AppendLine()

$retainedColumnCount = 0
foreach ($table in $tables) {
    [void]$builder.AppendLine("Table $($table.Name) {")
    $available = @{}
    foreach ($column in $table.Columns) {
        $available[$column.Name] = $true
        if ($requiredColumns[$table.Name].Contains($column.Name)) {
            [void]$builder.AppendLine("  $($column.Definition)")
            $retainedColumnCount++
        }
    }

    foreach ($requiredName in $requiredColumns[$table.Name]) {
        if (-not $available.ContainsKey($requiredName)) {
            throw "Reference column '$($table.Name).$requiredName' was not found in its table definition."
        }
    }
    $escapedMeaning = $table.RowMeaning.Replace("'", "\'")
    [void]$builder.AppendLine("  Note: 'One row represents: $escapedMeaning'")
    [void]$builder.AppendLine('}')
    [void]$builder.AppendLine()
}

foreach ($referenceLine in $referenceLines) {
    [void]$builder.AppendLine($referenceLine)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputDbml, $builder.ToString(), $utf8NoBom)

if (-not $SkipSvg) {
    $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
    if (-not $npx) {
        throw "Generated $outputDbml, but Node.js/npx is required to render SVG. Re-run with -SkipSvg or install Node.js."
    }

    Write-Output 'Rendering with pinned dependency @softwaretechnik/dbml-renderer@1.0.31 (npx may download it on first run).'
    & $npx.Source --yes --package='@softwaretechnik/dbml-renderer@1.0.31' dbml-renderer -i $outputDbml -o $outputSvg
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputSvg)) {
        throw "DBML was generated, but SVG rendering failed with exit code $LASTEXITCODE."
    }
}

Write-Output "Generated keys-only DBML: $outputDbml"
if (-not $SkipSvg) {
    Write-Output "Generated keys-only SVG:  $outputSvg"
}
Write-Output "Included $($tables.Count) tables, $retainedColumnCount key columns, and $($referenceLines.Count) relationships."

if ($Open) {
    $openPath = if ($SkipSvg) { $outputDbml } else { $outputSvg }
    Start-Process -FilePath $openPath
}

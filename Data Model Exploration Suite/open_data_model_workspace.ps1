<#
.SYNOPSIS
Builds the reusable data-model workspace from a DBML file and opens it in a browser.
#>
[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [int]$Port = 5174,
    [string]$DbmlPath,
    [switch]$PublicMode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path (Join-Path $PSScriptRoot 'workspace')).Path
if (-not $DbmlPath) { $DbmlPath = Join-Path $PSScriptRoot 'examples\SAMPLE_MODEL.dbml' }
$env:DATA_MODEL_DBML_PATH = (Resolve-Path -LiteralPath $DbmlPath -ErrorAction Stop).Path

Push-Location $workspace
try {
    if (-not $SkipInstall -and -not (Test-Path 'node_modules')) { npm.cmd install --no-audit --no-fund }
    npx.cmd tsx scripts/build-all.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Model/layout build failed.' }

    $env:VITE_PUBLIC_MODE = if ($PublicMode) { '1' } else { '' }
    $url = "http://127.0.0.1:$Port"
    $process = Start-Process -PassThru -WindowStyle Hidden npx.cmd -ArgumentList @('vite', '--port', "$Port", '--host', '127.0.0.1')
    $ready = $false
    for ($i = 0; $i -lt 30 -and -not $ready; $i++) {
        try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 | Out-Null; $ready = $true } catch { Start-Sleep -Milliseconds 600 }
    }
    if (-not $ready) { throw "Vite did not become ready at $url" }
    Start-Process $url
    Write-Output "Workspace ready at $url (Ctrl+C to stop)."
    Wait-Process -Id $process.Id
} finally {
    Pop-Location
}

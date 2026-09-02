param([string]$Version = "0.5.1")
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "chrome-extension"
$Dist = Join-Path $Root "dist"
$Target = Join-Path $Dist "717study-typer-v$Version.zip"
if (-not (Test-Path (Join-Path $Source "manifest.json"))) { throw "manifest.json not found" }
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $Target) { Remove-Item -LiteralPath $Target }
Compress-Archive -Path (Join-Path $Source "*") -DestinationPath $Target -CompressionLevel Optimal
Write-Output $Target

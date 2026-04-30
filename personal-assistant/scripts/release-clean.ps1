param(
    [int]$Keep = 3,
    [switch]$All,
    [switch]$IncludeDist
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Yellow
}

function Remove-IfExists([string]$Path) {
    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
        Write-Host "Removed: $Path"
    }
}

if ($Keep -lt 0) {
    throw "Keep must be >= 0."
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $projectRoot "release"
$installerHistoryRoot = Join-Path $projectRoot "installer-history"

Set-Location $projectRoot

if ($All) {
    Write-Step "Removing all release/history artifacts"
    Remove-IfExists $releaseRoot
    Remove-IfExists $installerHistoryRoot

    if ($IncludeDist) {
        Remove-IfExists (Join-Path $projectRoot "dist")
    }

    Write-Host "Cleanup complete."
    exit 0
}

Write-Step "Pruning release folders (keep newest $Keep)"
if (Test-Path $releaseRoot) {
    $releaseDirs = Get-ChildItem -Path $releaseRoot -Directory | Sort-Object LastWriteTime -Descending
    if ($releaseDirs.Count -gt $Keep) {
        $releaseDirs | Select-Object -Skip $Keep | ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force
            Write-Host "Removed: $($_.FullName)"
        }
    }
}

Write-Step "Pruning installer-history folders (keep newest $Keep)"
if (Test-Path $installerHistoryRoot) {
    $historyDirs = Get-ChildItem -Path $installerHistoryRoot -Directory | Sort-Object LastWriteTime -Descending
    if ($historyDirs.Count -gt $Keep) {
        $historyDirs | Select-Object -Skip $Keep | ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force
            Write-Host "Removed: $($_.FullName)"
        }
    }
}

if ($IncludeDist) {
    Write-Step "Removing dist"
    Remove-IfExists (Join-Path $projectRoot "dist")
}

Write-Host ""
Write-Host "Cleanup complete."
Write-Host "Tip: run npm run release:build for next release."

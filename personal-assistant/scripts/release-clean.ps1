param(
    [int]$Keep = 3,
    [switch]$All,
    [switch]$IncludeDist,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Yellow
}

function Remove-IfExists([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        if ($DryRun) {
            Write-Host "Would remove: $Path"
        } else {
            Remove-Item -LiteralPath $Path -Recurse -Force
            Write-Host "Removed: $Path"
        }
    }
}

function Get-VersionDirectories([string]$RootPath) {
    if (-not (Test-Path -LiteralPath $RootPath)) {
        return @()
    }

    return @(Get-ChildItem -Path $RootPath -Directory | Where-Object {
        $_.Name -match '^v\d+\.\d+\.\d+([\-+][0-9A-Za-z\.-]+)?$'
    } | Sort-Object LastWriteTime -Descending)
}

function Prune-OlderDirectories([string]$RootPath, [int]$KeepCount) {
    $dirs = Get-VersionDirectories $RootPath
    if ($dirs.Count -le $KeepCount) {
        return
    }

    $dirs | Select-Object -Skip $KeepCount | ForEach-Object {
        if ($DryRun) {
            Write-Host "Would remove: $($_.FullName)"
        } else {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force
            Write-Host "Removed: $($_.FullName)"
        }
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
Prune-OlderDirectories $releaseRoot $Keep

Write-Step "Pruning installer-history folders (keep newest $Keep)"
Prune-OlderDirectories $installerHistoryRoot $Keep

if ($IncludeDist) {
    Write-Step "Removing dist"
    Remove-IfExists (Join-Path $projectRoot "dist")
}

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete."
} else {
    Write-Host "Cleanup complete."
}
Write-Host "Tip: run npm run release:build for next release."

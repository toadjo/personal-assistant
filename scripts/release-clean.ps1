param(
    [int]$Keep = 3,
    [switch]$All,
    [switch]$ConfirmAll,
    [switch]$IncludeDist,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Yellow
}

function Test-IsLockLikeError([System.Exception]$Error) {
    if ($null -eq $Error) {
        return $false
    }

    $message = $Error.ToString()
    return (
        $message -match 'being used by another process' -or
        $message -match 'The process cannot access the file' -or
        $message -match 'because it is being used by another process' -or
        $message -match 'Access to the path .* is denied'
    )
}

function Write-LockRecoveryGuidance([string]$Context) {
    Write-Host ""
    Write-Host "Lock recovery guidance ($Context):" -ForegroundColor DarkYellow
    Write-Host "  1) Close running app instances and Explorer windows in release/dist folders."
    Write-Host "  2) Retry standard cleanup: npm run release:clean"
    Write-Host "  3) Retry with dist      : npm run release:clean -- -IncludeDist"
    Write-Host "  4) Full reset           : npm run release:clean -- -All -ConfirmAll -IncludeDist"
}

function Invoke-WithRetry(
    [scriptblock]$Action,
    [string]$Description,
    [int]$MaxAttempts = 6,
    [int]$InitialDelayMs = 300
) {
    if ($MaxAttempts -lt 1) {
        throw "Invoke-WithRetry requires MaxAttempts >= 1."
    }

    $attempt = 1
    $delayMs = $InitialDelayMs

    while ($true) {
        try {
            & $Action
            return
        } catch {
            $isLastAttempt = ($attempt -ge $MaxAttempts)
            $lockLike = Test-IsLockLikeError $_.Exception
            if ($isLastAttempt -or (-not $lockLike)) {
                if ($lockLike) {
                    $guidance = @(
                        "Cleanup failed while $Description after $attempt attempt(s) due to a lock-like error.",
                        "Close running app instances, Explorer windows in release folders, and antivirus scans touching this repo.",
                        "Then retry cleanup: npm run release:clean",
                        "If needed for a full reset: npm run release:clean -- -All -ConfirmAll -IncludeDist"
                    ) -join " "
                    Write-LockRecoveryGuidance $Description
                    throw "$guidance Original error: $($_.Exception.Message)"
                }

                throw
            }

            Write-Host "Retrying $Description (attempt $($attempt + 1)/$MaxAttempts) after $delayMs ms due to file lock..." -ForegroundColor DarkYellow
            Start-Sleep -Milliseconds $delayMs
            $delayMs = [Math]::Min($delayMs * 2, 4000)
            $attempt++
        }
    }
}

function Remove-IfExists([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        if ($DryRun) {
            Write-Host "Would remove: $Path"
        } else {
            Invoke-WithRetry -Description "removing $Path" -Action {
                Remove-Item -LiteralPath $Path -Recurse -Force
            }
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

function Remove-OrphanedStagingDirectories([string]$RootPath) {
    if (-not (Test-Path -LiteralPath $RootPath)) {
        return
    }

    $stagingDirs = @(Get-ChildItem -Path $RootPath -Directory | Where-Object {
        $_.Name -match '^v\d+\.\d+\.\d+([\-+][0-9A-Za-z\.-]+)?\.__staging$'
    })

    foreach ($dir in $stagingDirs) {
        if ($DryRun) {
            Write-Host "Would remove stale staging folder: $($dir.FullName)"
        } else {
            $dirToRemove = $dir.FullName
            Invoke-WithRetry -Description "removing stale staging folder $dirToRemove" -Action {
                Remove-Item -LiteralPath $dirToRemove -Recurse -Force
            }
            Write-Host "Removed stale staging folder: $($dir.FullName)"
        }
    }
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
            $dirToRemove = $_.FullName
            Invoke-WithRetry -Description "pruning $dirToRemove" -Action {
                Remove-Item -LiteralPath $dirToRemove -Recurse -Force
            }
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
    if (-not $ConfirmAll) {
        throw "Refusing to run -All without -ConfirmAll. This protects against accidental full cleanup."
    }

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
Write-Step "Removing stale staging folders"
Remove-OrphanedStagingDirectories $releaseRoot

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

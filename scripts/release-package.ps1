param(
    [string]$Version,

    [switch]$SkipVersionBump,
    [switch]$SkipSmoke,
    [switch]$ReplaceExisting,
    [switch]$AllowDirtyGit
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-CommandExists([string]$CommandName) {
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' is not available in PATH."
    }
}

function Invoke-CheckedCommand([string]$FileName, [string[]]$Arguments) {
    & $FileName @Arguments
    if ($LASTEXITCODE -ne 0) {
        $joinedArgs = $Arguments -join " "
        throw "Command failed ($LASTEXITCODE): $FileName $joinedArgs"
    }
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
    Write-Host "  1) Close running app instances, Explorer windows, and AV scans touching this repo."
    Write-Host "  2) Retry cleanup        : npm run release:clean -- -IncludeDist"
    Write-Host "  3) Retry package build  : npm run release:build"
    Write-Host "  4) Full cleanup (nuclear): npm run release:clean -- -All -ConfirmAll -IncludeDist"
}

function Write-ArtifactSummary([string]$ReleaseOutputPath, [string]$HistoryPath) {
    $releaseFiles = @()
    $historyFiles = @()

    if (Test-Path -LiteralPath $ReleaseOutputPath) {
        $releaseFiles = @(Get-ChildItem -Path $ReleaseOutputPath -File | Select-Object -ExpandProperty Name)
    }

    if (Test-Path -LiteralPath $HistoryPath) {
        $historyFiles = @(Get-ChildItem -Path $HistoryPath -File | Select-Object -ExpandProperty Name)
    }

    Write-Host "Release output      : $ReleaseOutputPath"
    Write-Host "Installer history   : $HistoryPath"
    Write-Host "Release files ($($releaseFiles.Count))  : $(([string]::Join(', ', $releaseFiles)))"
    Write-Host "History files ($($historyFiles.Count))  : $(([string]::Join(', ', $historyFiles)))"
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
                        "Lock-related failure while $Description after $attempt attempt(s).",
                        "Close Explorer windows, antivirus scans, and any running app that may hold files in release/dist.",
                        "Then rerun: npm run release:clean -- -IncludeDist",
                        "After cleanup succeeds, rerun: npm run release:build"
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

function Test-IsGitRepo {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        return $false
    }

    & git rev-parse --is-inside-work-tree 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Assert-CleanGitTree {
    $statusOutput = & git status --porcelain --untracked-files=normal
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to determine git status. Re-run with -AllowDirtyGit to bypass this check."
    }

    if (-not [string]::IsNullOrWhiteSpace(($statusOutput -join "`n"))) {
        throw "Git working tree is not clean. Commit/stash changes or pass -AllowDirtyGit to continue."
    }
}

function Remove-IfExists([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Invoke-WithRetry -Description "removing $Path" -Action {
            Remove-Item -LiteralPath $Path -Recurse -Force
        }
        Write-Host "Removed: $Path"
    }
}

function Write-ReleaseState(
    [string]$StatePath,
    [string]$Stage,
    [string]$ReleaseTag,
    [string]$StagingOutput,
    [string]$VersionedOutput,
    [string]$InstallerHistoryVersion
) {
    $payload = [ordered]@{
        updatedAt = (Get-Date).ToString("o")
        stage = $Stage
        releaseTag = $ReleaseTag
        stagingOutput = $StagingOutput
        versionedOutput = $VersionedOutput
        installerHistoryVersion = $InstallerHistoryVersion
    }
    $payload | ConvertTo-Json | Set-Content -Path $StatePath -Encoding UTF8
}

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
$projectRoot = Get-Location

Assert-CommandExists "npm"
Assert-CommandExists "npx"

if ([string]::IsNullOrWhiteSpace($Version)) {
    $packageJsonPath = Join-Path $projectRoot "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        throw "package.json not found at $packageJsonPath. Pass -Version explicitly."
    }

    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $Version = $packageJson.version
    Write-Step "No -Version provided; using package.json version $Version"
}

if ($Version -notmatch '^v?\d+\.\d+\.\d+$') {
    throw "Version must look like 1.0.0 or v1.0.0."
}

$normalizedVersion = $Version.TrimStart('v')
$releaseTag = "v$normalizedVersion"
$releaseRoot = Join-Path $projectRoot "release"
$versionedOutput = Join-Path $releaseRoot $releaseTag
$stagingOutput = Join-Path $releaseRoot "$releaseTag.__staging"
$installerHistoryRoot = Join-Path $projectRoot "installer-history"
$installerHistoryVersion = Join-Path $installerHistoryRoot $releaseTag
$stateFile = Join-Path $releaseRoot ".release-package.state.json"

Write-Step "Starting release packaging for $releaseTag"

if (Test-Path -LiteralPath $stateFile) {
    try {
        $existingState = Get-Content -Path $stateFile -Raw | ConvertFrom-Json
        Write-Host "Detected previous incomplete packaging state (stage: $($existingState.stage), updated: $($existingState.updatedAt))." -ForegroundColor DarkYellow
        Write-Host "Previous staging path : $($existingState.stagingOutput)"
        Write-Host "Previous release path : $($existingState.versionedOutput)"
        Write-Host "Previous history path : $($existingState.installerHistoryVersion)"
        Write-Host "If this was from an interrupted run, cleanup first:"
        Write-Host "  npm run release:clean -- -IncludeDist"
    } catch {
        Write-Host "Detected previous state file but failed to parse it: $stateFile" -ForegroundColor DarkYellow
    }
}

try {
    New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $installerHistoryRoot -Force | Out-Null
    Write-ReleaseState -StatePath $stateFile -Stage "starting" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion

    if ((Test-Path -LiteralPath $versionedOutput) -or (Test-Path -LiteralPath $installerHistoryVersion)) {
        if (-not $ReplaceExisting) {
            throw "Release artifacts already exist for $releaseTag. Use -ReplaceExisting, pick a new version, or clean old artifacts first."
        }

        Write-Step "Replacing existing artifacts for $releaseTag"
        Write-ReleaseState -StatePath $stateFile -Stage "replacing-existing" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
        Remove-IfExists $versionedOutput
        Remove-IfExists $installerHistoryVersion
    }

    if (-not $AllowDirtyGit -and (Test-IsGitRepo)) {
        Write-Step "Validating clean git working tree"
        Assert-CleanGitTree
    } elseif ($AllowDirtyGit) {
        Write-Step "Skipping clean git validation (-AllowDirtyGit)"
    }

    if (-not $SkipVersionBump) {
        $packageJsonPath = Join-Path $projectRoot "package.json"
        $currentPackageVersion = (Get-Content $packageJsonPath -Raw | ConvertFrom-Json).version
        if ($currentPackageVersion -eq $normalizedVersion) {
            Write-Step "package.json already at $normalizedVersion"
        } else {
            Write-Step "Updating package.json to $normalizedVersion"
            Write-ReleaseState -StatePath $stateFile -Stage "version-bump" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
            Invoke-CheckedCommand "npm" @("version", $normalizedVersion, "--no-git-tag-version")
        }
    } else {
        Write-Step "Skipping package.json version update"
    }

    Remove-IfExists $stagingOutput

    Write-Step "Building app bundles"
    Write-ReleaseState -StatePath $stateFile -Stage "building-bundles" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
    Invoke-CheckedCommand "npm" @("run", "build")

    Write-Step "Preparing Windows icon assets"
    Write-ReleaseState -StatePath $stateFile -Stage "preparing-icons" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
    Invoke-CheckedCommand "npm" @("run", "icons:prepare")

    Write-Step "Building Windows installer"
    Write-ReleaseState -StatePath $stateFile -Stage "building-installer" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
    Invoke-CheckedCommand "npx" @("electron-builder", "--win", "nsis", "--publish", "never", "--config.directories.output=$stagingOutput")

    if (-not $SkipSmoke) {
        Write-Step "Running smoke check"
        Write-ReleaseState -StatePath $stateFile -Stage "smoke-test" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
        Invoke-CheckedCommand "npm" @("run", "test:smoke")
    } else {
        Write-Step "Skipping smoke check"
    }

    Write-Step "Copying installer artifacts"
    Write-ReleaseState -StatePath $stateFile -Stage "finalizing-artifacts" -ReleaseTag $releaseTag -StagingOutput $stagingOutput -VersionedOutput $versionedOutput -InstallerHistoryVersion $installerHistoryVersion
    if (-not (Test-Path -LiteralPath $stagingOutput)) {
        throw "Installer output folder was not created: $stagingOutput"
    }

    New-Item -ItemType Directory -Path $versionedOutput -Force | Out-Null
    $stagingItems = @(Get-ChildItem -Path $stagingOutput -Force)
    foreach ($item in $stagingItems) {
        $sourcePath = $item.FullName
        $targetPath = Join-Path $versionedOutput $item.Name
        Invoke-WithRetry -Description "copying $($item.Name) to release output" -Action {
            Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse -Force
        }
    }

    New-Item -ItemType Directory -Path $installerHistoryVersion -Force | Out-Null
    $copiedArtifacts = @(Get-ChildItem -Path $versionedOutput -File | Where-Object {
        $_.Name -match '\.(exe|blockmap|yml)$'
    } | ForEach-Object {
        $artifactPath = $_.FullName
        $artifactDestination = Join-Path $installerHistoryVersion $_.Name
        Invoke-WithRetry -Description "copying $($_.Name) to installer history" -Action {
            Copy-Item -Path $artifactPath -Destination $artifactDestination -Force
        }
        $_.Name
    })

    if ($copiedArtifacts.Count -eq 0) {
        throw "No installer artifacts (.exe/.blockmap/.yml) were found in $versionedOutput"
    }

    if (-not ($copiedArtifacts | Where-Object { $_ -match '\.exe$' })) {
        throw "Packaging produced no .exe installer in $versionedOutput"
    }

    try {
        Remove-IfExists $stagingOutput
    } catch {
        Write-Host "Warning: release artifacts are complete, but staging cleanup failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
        Write-Host "Cleanup later with: npm run release:clean -- -IncludeDist" -ForegroundColor DarkYellow
    }
    Remove-IfExists $stateFile

    Write-Step "Release complete"
    Write-ArtifactSummary -ReleaseOutputPath $versionedOutput -HistoryPath $installerHistoryVersion
    Write-Host "Next cleanup command: npm run release:clean"
} catch {
    Write-Host ""
    Write-Host "Release packaging failed. Recovery state is kept at:" -ForegroundColor Red
    Write-Host "  $stateFile"
    if (Test-IsLockLikeError $_.Exception) {
        Write-LockRecoveryGuidance "packaging failure"
    }
    throw
}

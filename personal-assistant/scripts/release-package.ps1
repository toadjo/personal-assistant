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
                        "Then rerun: npm run release:clean -IncludeDist",
                        "After cleanup succeeds, rerun: npm run release:build"
                    ) -join " "
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

Write-Step "Starting release packaging for $releaseTag"

if ((Test-Path -LiteralPath $versionedOutput) -or (Test-Path -LiteralPath $installerHistoryVersion)) {
    if (-not $ReplaceExisting) {
        throw "Release artifacts already exist for $releaseTag. Use -ReplaceExisting, pick a new version, or clean old artifacts first."
    }

    Write-Step "Replacing existing artifacts for $releaseTag"
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
    Write-Step "Updating package.json to $normalizedVersion"
    Invoke-CheckedCommand "npm" @("version", $normalizedVersion, "--no-git-tag-version")
} else {
    Write-Step "Skipping package.json version update"
}

Remove-IfExists $stagingOutput
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path $installerHistoryRoot -Force | Out-Null

Write-Step "Building app bundles"
Invoke-CheckedCommand "npm" @("run", "build")

Write-Step "Building Windows installer"
Invoke-CheckedCommand "npx" @("electron-builder", "--win", "nsis", "--config.directories.output=$stagingOutput")

if (-not $SkipSmoke) {
    Write-Step "Running smoke check"
    Invoke-CheckedCommand "npm" @("run", "test:smoke")
} else {
    Write-Step "Skipping smoke check"
}

Write-Step "Copying installer artifacts"
if (-not (Test-Path -LiteralPath $stagingOutput)) {
    throw "Installer output folder was not created: $stagingOutput"
}

New-Item -ItemType Directory -Path $versionedOutput -Force | Out-Null
Get-ChildItem -Path $stagingOutput -Force | ForEach-Object {
    $sourcePath = $_.FullName
    $targetName = $_.Name
    Invoke-WithRetry -Description "moving $targetName to release output" -Action {
        Move-Item -Path $sourcePath -Destination $versionedOutput -Force
    }
}
Remove-IfExists $stagingOutput

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

Write-Step "Release complete"
Write-Host "Release output      : $versionedOutput"
Write-Host "Installer history   : $installerHistoryVersion"
Write-Host "Next cleanup command: npm run release:clean"

param(
    [string]$Version,

    [switch]$SkipVersionBump,
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
$projectRoot = Get-Location

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
$installerHistoryRoot = Join-Path $projectRoot "installer-history"
$installerHistoryVersion = Join-Path $installerHistoryRoot $releaseTag

Write-Step "Starting release packaging for $releaseTag"

if (-not $SkipVersionBump) {
    Write-Step "Updating package.json to $normalizedVersion"
    npm version $normalizedVersion --no-git-tag-version | Out-Host
} else {
    Write-Step "Skipping package.json version update"
}

if ((Test-Path $versionedOutput) -or (Test-Path $installerHistoryVersion)) {
    throw "Release artifacts already exist for $releaseTag. Use a new version or clean old artifacts first."
}

Write-Step "Building app bundles"
npm run build | Out-Host

Write-Step "Building Windows installer"
npx electron-builder --win nsis --config.directories.output="$versionedOutput" | Out-Host

if (-not $SkipSmoke) {
    Write-Step "Running smoke check"
    npm run test:smoke | Out-Host
} else {
    Write-Step "Skipping smoke check"
}

Write-Step "Copying installer artifacts"
New-Item -ItemType Directory -Path $installerHistoryVersion -Force | Out-Null
Get-ChildItem -Path $versionedOutput -File | Where-Object {
    $_.Name -match '\.(exe|blockmap|yml)$'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $installerHistoryVersion $_.Name) -Force
}

Write-Step "Release complete"
Write-Host "Release output      : $versionedOutput"
Write-Host "Installer history   : $installerHistoryVersion"
Write-Host "Next cleanup command: npm run release:clean"

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [switch]$SkipVersionBump,
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if ($Version -notmatch '^v?\d+\.\d+\.\d+$') {
    throw "Version must be semver-like, e.g. 1.0.0 or v1.0.0."
}

$normalizedVersion = $Version.TrimStart('v')
$releaseTag = "v$normalizedVersion"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $projectRoot "release"
$versionedOutput = Join-Path $releaseRoot $releaseTag
$installerHistoryRoot = Join-Path $projectRoot "installer-history"
$installerHistoryVersion = Join-Path $installerHistoryRoot $releaseTag

Write-Step "Packaging Personal Assistant $releaseTag"
Set-Location $projectRoot

if (-not $SkipVersionBump) {
    Write-Step "Syncing package.json version to $normalizedVersion"
    npm version $normalizedVersion --no-git-tag-version | Out-Host
}

if ((Test-Path $versionedOutput) -or (Test-Path $installerHistoryVersion)) {
    throw "Release artifacts already exist for $releaseTag. Use a new version or clean old artifacts first."
}

Write-Step "Building application bundles"
npm run build | Out-Host

Write-Step "Creating Windows installer in $versionedOutput"
npx electron-builder --win nsis --config.directories.output="$versionedOutput" | Out-Host

if (-not $SkipSmoke) {
    Write-Step "Running smoke validation"
    npm run test:smoke | Out-Host
}

Write-Step "Collecting installer artifacts"
New-Item -ItemType Directory -Path $installerHistoryVersion -Force | Out-Null
Get-ChildItem -Path $versionedOutput -File | Where-Object {
    $_.Name -match '\.(exe|blockmap|yml)$'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $installerHistoryVersion $_.Name) -Force
}

Write-Step "Done"
Write-Host "Release output: $versionedOutput"
Write-Host "Installer history: $installerHistoryVersion"

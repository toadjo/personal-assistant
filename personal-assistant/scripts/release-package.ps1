param(
    [string]$Version,

    [switch]$SkipVersionBump,
    [switch]$SkipSmoke,
    [switch]$ReplaceExisting
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

function Remove-IfExists([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
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

if (-not $SkipVersionBump) {
    Write-Step "Updating package.json to $normalizedVersion"
    Invoke-CheckedCommand "npm" @("version", $normalizedVersion, "--no-git-tag-version")
} else {
    Write-Step "Skipping package.json version update"
}

if ((Test-Path -LiteralPath $versionedOutput) -or (Test-Path -LiteralPath $installerHistoryVersion)) {
    if (-not $ReplaceExisting) {
        throw "Release artifacts already exist for $releaseTag. Use -ReplaceExisting, pick a new version, or clean old artifacts first."
    }

    Write-Step "Replacing existing artifacts for $releaseTag"
    Remove-IfExists $versionedOutput
    Remove-IfExists $installerHistoryVersion
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
    Move-Item -Path $_.FullName -Destination $versionedOutput -Force
}
Remove-IfExists $stagingOutput

New-Item -ItemType Directory -Path $installerHistoryVersion -Force | Out-Null
$copiedArtifacts = @(Get-ChildItem -Path $versionedOutput -File | Where-Object {
    $_.Name -match '\.(exe|blockmap|yml)$'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $installerHistoryVersion $_.Name) -Force
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

---
description: Publish a manual Windows installer .exe release
---

# Publish Manual Windows Installer Release

Use this flow when publishing a Windows installer built locally. Build, push, tag, then upload only the `.exe` to the private release and public mirror.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- Node.js installed (`node --version` >= 22.12.0)
- Repo is on the release branch with the target commit checked out

## Build the Installer

1. Verify checks pass:

   ```powershell
   npm.cmd run check:preload-ipc
   npm.cmd run typecheck
   npm.cmd run lint
   npm.cmd test
   npm.cmd run build
   npm.cmd run test:smoke
   npm.cmd run test:preload-electron
   ```

2. Build the Windows installer:
   ```powershell
   npm.cmd run release:build -- -Version 1.5.5 -SkipVersionBump -ReplaceExisting
   ```

## Publish the Release

3. Push the branch:

   ```powershell
   git status --short --branch
   git push origin release/linux-appimage-audit
   ```

4. Create and push the tag:

   ```powershell
   $Version = "1.5.5"
   $Tag = "v$Version"
   $Sha = git rev-parse HEAD
   git tag $Tag $Sha
   git push origin $Tag
   ```

5. Create the private release:

   ```powershell
   $Installer = "installer-history\v1.5.5\PersonalAssistant Setup 1.5.5.exe"
   gh release create $Tag "$Installer" --repo toadjo/personal-assistant --target $Sha --title "Personal Assistant $Tag" --notes "Manual Windows installer release for Personal Assistant $Tag. Linux AppImage and macOS DMG/zip assets remain pending."
   ```

6. Create the public mirror release:
   ```powershell
   gh release create $Tag "$Installer" --repo toadjo/Personal-Assistant-R --title "Personal Assistant $Tag" --notes "Manual Windows installer release for Personal Assistant $Tag. Linux and macOS assets remain pending."
   ```

## Asset Rules

- **Upload only:** `PersonalAssistant Setup X.Y.Z.exe`
- **Do not upload:** `latest.yml`, `.blockmap`, `builder-debug.yml`

## If The Release Already Exists

Upload instead of create:

```powershell
gh release upload $Tag "$Installer" --repo toadjo/personal-assistant --clobber
gh release upload $Tag "$Installer" --repo toadjo/Personal-Assistant-R --clobber
```

## Final Verification

```powershell
gh release view $Tag --repo toadjo/personal-assistant --json tagName,targetCommitish,assets
gh release view $Tag --repo toadjo/Personal-Assistant-R --json tagName,assets
```

Confirm each release lists exactly one asset: the Windows `.exe`.

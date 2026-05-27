# Releasing

This document defines how Personal Assistant versions are bumped, tagged, and published. The goal is predictability and a readable history. v2.0.0 is the cutover point.

## Versioning rules (semver)

Personal Assistant follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html): `MAJOR.MINOR.PATCH`.

- **PATCH** (`x.y.Z`): bug fixes, dependency bumps with no behavior change, internal refactors, test/docs improvements, CI/release-tooling tweaks.
- **MINOR** (`x.Y.0`): new user-visible features, additive UX changes, additive IPC channels, new panels or commands. Must be backwards compatible.
- **MAJOR** (`X.0.0`): breaking changes to public app behavior, IPC contracts, persisted data shape, or installer compatibility. Reserve for genuine ecosystem-impacting changes.

Pre-release tags (`-alpha.N`, `-beta.N`, `-rc.N`) are allowed but the release-package workflow currently enforces strict `^[0-9]+\.[0-9]+\.[0-9]+$`. Loosen that regex first if you need pre-releases.

## Release cadence

- Avoid bumping more than one MINOR per day. If you previously shipped two minors back-to-back, a follow-up should be a PATCH.
- Avoid releasing without a CHANGELOG entry. Each shipped tag must have a corresponding section in `CHANGELOG.md`.

## Release flow (Windows-only manual)

When GitHub Actions budget is unavailable, releases ship Windows-only via local build and manual upload. macOS/Linux assets are omitted until budget is restored.

**Security Gate:** `npm audit --audit-level=high` must pass with zero high/critical vulnerabilities before any release. This is a hard gate enforced in CI and must be verified locally.

1. Run local verification:
   - `npm install`
   - `npm run rebuild:electron`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run check:preload-ipc`
   - `npm test`
   - `npm run test:preload-electron`
   - `npm audit --audit-level=high` (must pass with zero high/critical findings)
   - `npm run build`

2. Build Windows release assets (set calendar OAuth client IDs on the build machine when shipping connected calendar; see `docs/CONNECTED_CALENDAR_OAUTH.md`):
   - `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting`

3. Validate local outputs:
   - Confirm `release/vX.Y.Z` exists.
   - Confirm `installer-history/vX.Y.Z` exists.
   - Confirm the Windows `.exe`, `.blockmap`, and `yml` files exist.
   - Confirm generated release artifacts are not committed.
   - Compute SHA256 checksum of the installer.

4. GitHub manual upload:
   - Commit as `release: prepare vX.Y.Z`.
   - Tag `vX.Y.Z`.
   - Push `main` and the tag.
   - Create or edit the GitHub Release manually.
   - Upload only the Windows installer/update assets (`.exe`, `.blockmap`, `latest.yml`).
   - Release notes must state this is a Windows-only release and that macOS/Linux assets are omitted due to Actions budget constraints.
   - Include SHA256 checksum and verification commands in release notes.

## GitHub Actions release flow (future, when budget restored)

When GitHub Actions budget is restored, the automated multi-platform release flow can be used:

1. Open a `release/vX.Y.Z` branch off `main`.
2. Bump `package.json` to the target version.
3. Add a `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md` summarising the change set.
4. Open PR; CI must be green.
5. Merge to `main`.
6. Trigger the `Release package` workflow (`gh workflow run "Release package" --ref main -f version=X.Y.Z`).
7. The workflow creates a draft release, builds Windows / macOS / Linux artifacts on platform runners, attaches them to the draft, validates assets, then publishes the release.
8. Optional: public mirror push to `toadjo/Personal-Assistant-R` happens automatically when `PUBLIC_RELEASE_TOKEN` is set.

## Asset rules

- Windows manual releases upload only the `.exe`, `.blockmap`, and `latest.yml` files to GitHub Release assets. macOS/Linux assets are omitted.
- When GitHub Actions budget is restored, the automated workflow uploads installers and update manifests directly to GitHub Release assets, **not** via `actions/upload-artifact`. This keeps the Actions storage quota free.
- For Windows manual releases, only `latest.yml` and `.blockmap` are required for electron-updater clients on existing Windows installs.

## Auto-update considerations

- Each new release version must compare semver-greater than the previous to trigger auto-update.
- Once a tag has been distributed (download count > 0), do not delete or rename it; bump instead.
- `v2.1.8` was a stray internal test tag with zero downloads and was cleaned up before the v2.0.0 release. Any future stray tags should be treated the same way only if all assets show zero downloads.

## When something goes wrong

- For Windows manual releases: if the local build fails, check the error output and fix the issue before retrying. If the GitHub Release already exists, edit it manually instead of creating a new one.
- For GitHub Actions releases (when budget restored): the release workflow refuses to dispatch if `package.json` does not match the requested version, and refuses to overwrite an existing non-draft release.
- If a draft is left behind from a failed Actions run, delete it (`gh release delete vX.Y.Z --yes`) before re-running.
- If a non-draft release is broken, prefer publishing a follow-up PATCH instead of deleting the broken one (preserves user-visible history).

# Public Readiness Checklist

This checklist ensures the application is ready for public release, including security, usability, and documentation requirements.

## Security

- [ ] All high-severity security vulnerabilities addressed
- [ ] Corporate mode fail-closed behavior verified
- [ ] Encrypted backup export returns only metadata + `_encrypted` field
- [ ] Corporate mode blocks all public hosts when `allowedHosts` is empty
- [ ] Personal mode allows all hosts when `allowedHosts` is empty
- [ ] Secure secret storage required in corporate mode
- [ ] Backup import/export permissions enforced by policy
- [ ] SBOM generated for release
- [ ] Security audit passed

## Testing

- [ ] Unit tests pass (all 877+ tests)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed on Windows
- [ ] Corporate mode scenarios tested
- [ ] Personal mode scenarios tested
- [ ] Backup export/import tested (encrypted and plaintext)
- [ ] Policy enforcement tested

## Build & Release

- [ ] Build succeeds on Windows
- [ ] Code signing disabled (unsigned builds maintained)
- [ ] Release notes generated
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Release evidence generated
- [ ] Windows-only release workflow documented

## Documentation

- [ ] [`RELEASING.md`](./RELEASING.md) reflects Windows-only release path
- [ ] RELEASE_CHECKLIST.md up to date
- [ ] CORPORATE_MODE.md documents policy controls
- [ ] Data and asset inventory updated
- [ ] README.md accurate
- [ ] Installation instructions clear

## Code Quality

- [ ] Lint passes (ESLint)
- [ ] Typecheck passes (TypeScript)
- [ ] No console errors in production build
- [ ] No deprecated APIs used
- [ ] Code review completed for security fixes

## User Experience

- [ ] Onboarding flow works
- [ ] Empty states are helpful
- [ ] Error messages are clear
- [ ] Loading states are visible
- [ ] Keyboard shortcuts documented
- [ ] Accessibility audit passed (basic)

## Known Limitations

- Windows-only release (macOS/Linux omitted due to CI budget constraints)
- Unsigned Windows builds (by design for open-source transparency)
- Corporate mode requires Windows ProgramData policy file
- Team Projects requires external Supabase backend

## Pre-Release Verification

- [ ] Smoke test: Install fresh, create note, create reminder, export backup
- [ ] Corporate mode test: Set policy, verify restrictions
- [ ] Backup test: Export encrypted, import on fresh install
- [ ] Policy test: Empty allowedHosts blocks public hosts in corporate mode
- [ ] Release notes display correctly on version change

## Post-Release

- [ ] GitHub release created with Windows-only assets
- [ ] Release evidence archived
- [ ] Changelog published
- [ ] Known issues documented (if any)

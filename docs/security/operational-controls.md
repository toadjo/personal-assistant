# Operational Controls Checklist

This document outlines operational security controls for Personal Assistant. The application is **not ISO 27001 certified** - this is a readiness assessment only.

## Secure Release Process

### Pre-Release Verification

- [ ] Confirm clean git state (no uncommitted changes)
- [ ] Confirm `package.json` version matches intended release version
- [ ] Run `npm install` to ensure dependencies are up-to-date
- [ ] Run `npm run rebuild:electron` to rebuild better-sqlite3 for Electron
- [ ] Run `npm run lint` - ESLint passes with no errors
- [ ] Run `npm run typecheck` - TypeScript compilation passes
- [ ] Run `npm run check:preload-ipc` - preload IPC contract is valid
- [ ] Run `npm test` - all unit tests pass (832+ tests)
- [ ] Run `npm run test:preload-electron` - preload smoke test passes
- [ ] Run `npm audit --audit-level=high` - zero high/critical vulnerabilities
- [ ] Run `npm run build` - production build succeeds
- [ ] Run `npm run dist:win` - Windows installer builds successfully
- [ ] Compute SHA256 checksum of installer
- [ ] Manual smoke test: install, launch, configure AI, export backup
- [ ] Confirm backup export does not contain secrets
- [ ] Confirm backup import rejects secrets

### Release Tagging

- [ ] Tag release as `vX.Y.Z` matching `package.json` version
- [ ] Push tag to GitHub
- [ ] Create GitHub Release with release notes
- [ ] Upload installer artifact (`.exe`)
- [ ] Upload blockmap file (`.blockmap`)
- [ ] Upload update metadata (`.latest.yml`)
- [ ] Paste SHA256 checksum in release notes
- [ ] Paste verification commands in release notes

### Post-Release

- [ ] Update README.md with new version if applicable
- [ ] Archive release artifacts in `installer-history/vX.Y.Z/`
- [ ] Clean old release artifacts (keep newest 3 versions)

## Dependency Review

### Regular Dependency Updates

- [ ] Run `npm audit` monthly to check for new vulnerabilities
- [ ] Review Dependabot alerts weekly
- [ ] Update dependencies with high/critical vulnerabilities promptly
- [ ] Test application after dependency updates
- [ ] Run `npm audit --audit-level=high` after updates

### Dependency Upgrade Process

- [ ] Identify vulnerable dependency
- [ ] Check for compatible upgrade path
- [ ] Update `package.json` with new version
- [ ] Run `npm install` to update lockfile
- [ ] Run `npm run rebuild:electron` if native module changes
- [ ] Run full test suite
- [ ] Run `npm audit --audit-level=high`
- [ ] Commit upgrade with descriptive message
- [ ] Tag and release if breaking changes

### Electron Runtime Updates

- [ ] Monitor Electron release notes for security updates
- [ ] Test new Electron version with better-sqlite3 compatibility
- [ ] Update Electron version in `package.json`
- [ ] Update electron-builder if needed
- [ ] Update better-sqlite3 if needed for compatibility
- [ ] Run full verification (lint, typecheck, tests, build)
- [ ] Run preload smoke test
- [ ] Build and test installer
- [ ] Commit upgrade with security rationale

## Backup Handling

### Backup Export Controls

- [ ] Exclude AI API keys from backup export
- [ ] Exclude Home Assistant tokens from backup export
- [ ] Exclude Supabase session tokens from backup export
- [ ] Exclude Supabase anon key from backup export
- [ ] Include only local data (notes, tasks, reminders, rules, settings)
- [ ] Add warning that secrets must be re-entered after restore
- [ ] Validate backup JSON schema before export

### Backup Import Controls

- [ ] Validate backup JSON schema
- [ ] Reject backup if secret fields present
- [ ] Log rejection event
- [ ] Warn user that secrets are not restored
- [ ] Prompt user to re-enter secrets after import
- [ ] Provide preview of what will be imported

### Backup File Security

- [ ] No automatic backup upload to cloud
- [ ] User responsible for secure storage of backup files
- [ ] No automatic encryption of backup files
- [ ] Document user responsibility for backup security in README

## Incident Response

### Incident Categories

1. **Secret Leakage**: Secrets exposed in logs, backups, or error reports
2. **Data Loss**: Database corruption, accidental deletion
3. **Unauthorized Access**: Device compromise, malware
4. **Dependency Vulnerability**: High/critical npm advisory
5. **Supply Chain Attack**: Compromised dependency
6. **Cloud Provider Incident**: AI provider, Supabase, Home Assistant breach

### Incident Response Process

**Detection:**

- [ ] Monitor npm audit results
- [ ] Monitor Dependabot alerts
- [ ] Review user-reported issues
- [ ] Check GitHub security advisories

**Containment:**

- [ ] Identify affected versions
- [ ] Issue security advisory if public release
- [ ] Recommend mitigation steps to users
- [ ] Coordinate with cloud providers if applicable

**Eradication:**

- [ ] Fix vulnerability in code
- [ ] Update dependencies
- [ ] Add additional security controls if needed

**Recovery:**

- [ ] Release patched version
- [ ] Provide migration guide if needed
- [ ] Communicate remediation steps to users

**Lessons Learned:**

- [ ] Document root cause
- [ ] Update security controls if needed
- [ ] Update documentation
- [ ] Review and improve processes

**Note:** No formal incident response team or SLA exists (single developer).

## Access Review

### Application Access

- [ ] No multi-user access control (single-user desktop app)
- [ ] No role-based access control
- [ ] No authentication system
- [ ] User responsible for OS-level access controls

### Repository Access

- [ ] GitHub repository is public (read-only)
- [ ] Write access limited to repository owner
- [ ] No external contributors currently
- [ ] Review and approve pull requests before merge

### Cloud Provider Access

- [ ] AI provider accounts: user-managed
- [ ] Supabase: user-managed (team mode optional)
- [ ] Home Assistant: user-managed (optional)
- [ ] No centralized admin access to user cloud accounts

## Vendor Review

### AI Providers (OpenAI, Anthropic)

- [ ] Review provider security documentation
- [ ] Review provider data retention policies
- [ ] Review provider privacy policy
- [ ] Confirm HTTPS encryption in transit
- [ ] Confirm data minimization (count-only context)
- [ ] No formal vendor assessment (user choice)

### Supabase

- [ ] Review Supabase security documentation
- [ ] Review Supabase encryption at rest
- [ ] Review Supabase Row Level Security
- [ ] Confirm HTTPS encryption in transit
- [ ] No formal vendor assessment (user choice)

### Home Assistant

- [ ] Review Home Assistant security documentation
- [ ] Review HA API authentication
- [ ] Confirm HTTPS encryption in transit
- [ ] No formal vendor assessment (user choice)

### GitHub

- [ ] Review GitHub security features
- [ ] Enable 2FA for repository owner account
- [ ] Review Dependabot alerts
- [ ] Review GitHub security advisories

## Evidence Retention

### Release Evidence

- [ ] Git commit hash for each release
- [ ] Git tag for each release
- [ ] Release notes for each version
- [ ] SHA256 checksum for each installer
- [ ] Verification commands for each release
- [ ] npm audit result for each release
- [ ] Test results for each release
- [ ] Build logs for each release (archived in CI)

### Security Evidence

- [ ] npm audit results for each dependency update
- [ ] Security commits (hardening, fixes)
- [ ] Security documentation updates
- [ ] Vulnerability disclosures (if any)

### Retention Period

- [ ] Git history: indefinite
- [ ] Release artifacts: keep newest 3 versions
- [ ] CI logs: 90 days (GitHub Actions default)
- [ ] Security documentation: indefinite

### Evidence Location

- [ ] Git repository: commits, tags, documentation
- [ ] GitHub Releases: release notes, artifacts
- [ ] GitHub Actions: CI logs, build artifacts
- [ ] docs/security/: security documentation pack

## Operational Control Status

| Control Area           | Status      | Notes                                                           |
| ---------------------- | ----------- | --------------------------------------------------------------- |
| Secure Release Process | Implemented | Manual Windows-only release with verification checklist         |
| Dependency Review      | Partial     | npm audit gate, Dependabot enabled, no formal review schedule   |
| Backup Handling        | Implemented | Secrets excluded from export/import                             |
| Incident Response      | Partial     | No formal team, no SLA, documented process for single developer |
| Access Review          | Partial     | No app-level access, repository access limited to owner         |
| Vendor Review          | Partial     | No formal assessments, user choice for cloud providers          |
| Evidence Retention     | Implemented | Git history, release artifacts, security documentation          |

## Gap Analysis

**Missing Controls:**

1. **Formal dependency review schedule:** No monthly/quarterly review process (ad-hoc only)
2. **Incident response team:** No formal team or SLA (single developer)
3. **Formal vendor assessments:** No documented vendor risk assessments
4. **Automated backup:** No automatic backup or retention (user-managed only)
5. **Access logging:** No audit logging for access events
6. **Security monitoring:** No continuous security monitoring beyond npm audit
7. **Formal training:** No security awareness training (single developer)

**Justification for Gaps:**

- Single-user desktop application does not require enterprise-grade access controls
- Local-first design minimizes cloud provider dependencies
- No organizational ISMS scope (personal project, not organizational)
- User responsibility for device security and backup management
- Resource constraints (single developer, no budget for formal assessments)

**Recommendations for Improvement:**

1. Establish monthly dependency review schedule
2. Document incident response procedures more formally
3. Consider automated backup option for users
4. Add security logging for critical events (secret storage failures)
5. Implement continuous dependency monitoring (e.g., Snyk, Dependabot Pro)

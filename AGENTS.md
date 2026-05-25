# Agent Development Guide

This document contains project-specific information for AI agents working on this codebase.

## Project Overview

Personal Assistant is a cross-platform desktop application built with Electron, React, and SQLite. It provides task management, note-taking, reminders, Home Assistant integration, and team collaboration features.

## Build Commands

### Core Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run all tests (Vitest for Node, Vitest for renderer)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:smoke` - Run smoke tests on built application

### Release Commands

- `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting` - Build Windows installer
- `npm run dist:win` - Build Windows distribution
- `npm run dist:mac` - Build macOS distribution
- `npm run dist:linux` - Build Linux distribution

### Security Commands

- `npm run security:audit` - Run security audit
- `npm run security:sbom` - Generate Software Bill of Materials
- `npm run security:release-evidence` - Generate release evidence

## Architecture

### Main Process

- `src/main/` - Electron main process code
- `src/main/db.ts` - SQLite database initialization with retry logic
- `src/main/services/` - Business logic services (backup, dbHealth, etc.)
- `src/main/ipc/` - IPC handlers and channel registration
- `src/main/security/` - Security policy and corporate mode enforcement

### Renderer Process

- `src/renderer/` - React frontend code
- `src/renderer/components/` - React components
- `src/renderer/hooks/` - Custom React hooks
- `src/renderer/lib/` - Utility libraries and API helpers
- `src/renderer/lib/assistantApi.ts` - Typed API wrapper for preload bridge

### Shared Code

- `src/shared/` - Types and constants shared between main and renderer
- `src/shared/ipc-channels.ts` - IPC channel definitions (auto-generates preload code)

### Database

- SQLite with better-sqlite3
- Migrations in `src/main/db/migrations/`
- WAL mode enabled for performance
- Tables: notes, reminders, tasks, automation_rules, app_settings, devices_cache, execution_logs, renderer_errors

## Key Patterns

### IPC Communication

- All IPC channels defined in `src/shared/ipc-channels.ts`
- Main process handlers in `src/main/ipc/handlers/`
- Renderer uses `requireAssistantApi()` from `src/renderer/lib/assistantApi.ts`
- Preload script auto-generated from channel definitions

### Security

- Corporate mode via policy file at `%ProgramData%\PersonalAssistant\policy.json` (Windows)
- Outbound guard enforces network restrictions
- Secret storage via Electron safeStorage
- Backup encryption in corporate mode
- CSP generation based on security policy

### Testing

- Main process tests use `createMemoryDatabase()` from `src/main/test/memoryDb.ts`
- Renderer tests use React Testing Library
- E2E tests via Electron (when CI budget available)
- Test utilities in `src/main/test/` and `src/renderer/test/`

## Release Process

1. Complete feature implementation and testing
2. Run `npm run lint`, `npm run typecheck`, `npm test`
3. Update CHANGELOG.md with version notes
4. Bump version in package.json
5. Build and test locally: `npm run build` && `npm run test:smoke`
6. Build Windows installer: `npm run release:build -- -Version X.Y.Z -SkipVersionBump -ReplaceExisting`
7. Test installed application manually
8. Tag release in Git
9. Upload assets to GitHub release

## Current Release (v2.9.0 - Reliability and Recovery)

### Features Implemented

- Backup preview with counts and validation before destructive import
- SQLite data health diagnostics (integrity, schema, data, performance checks)
- Database optimization (WAL checkpoint, VACUUM, optimize)

### Files Modified

- `src/main/services/backup.ts` - Added previewBackup function
- `src/main/services/dbHealth.ts` - New health check service
- `src/shared/ipc-channels.ts` - Added dbHealthCheck, dbOptimize channels
- `src/main/ipc/handlers/backup.handlers.ts` - Registered health check handlers
- `src/renderer/lib/assistantApi.ts` - Added health check API types
- `src/renderer/vite-env.d.ts` - Added health check type definitions
- `src/main/preload.ts` - Added health check preload bindings
- `src/main/test/memoryDb.ts` - Enabled WAL mode for test databases

### Testing

- All backup tests passing (26 tests)
- All dbHealth tests passing (8 tests)
- Full test suite: 1031 tests passing

## Known Issues

- GitHub Actions budget exhausted - Windows-only manual releases
- Linux tray support varies by desktop environment
- macOS and Linux builds skipped in current release process

## Development Notes

- Always run `npm test` after changes to verify test suite
- Use `createMemoryDatabase()` for main process service tests
- Update IPC channels in `src/shared/ipc-channels.ts` to auto-generate preload code
- Follow existing patterns for new IPC handlers
- Security policy changes require testing in corporate mode

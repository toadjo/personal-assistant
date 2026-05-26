# Maintainer Guide

This guide is for human maintainers taking over Personal OS. It gives the shortest safe path to understanding the app, changing it, verifying it, and releasing it.

## Project Identity

Personal OS is a local-first desktop personal operating layer built with Electron, React, TypeScript, and SQLite. It provides a consolidated daily workflow: capture, sort, plan, act, review, search, and recover. The app is currently Windows-first for releases, with macOS and Linux packaging paths present but not active while GitHub Actions budget is constrained.

The core product surfaces are:

- Today, Daily Command Center, and Plan Today for daily planning.
- End-of-Day Review for closing the day and carrying work forward.
- Inbox and Quick Capture for fast local capture.
- Search and Recall for finding recent, saved, and matching work.
- Data Control with backup preview, restore confirmation, health checks, and database optimization.
- Team Projects for optional shared tasks.
- Home Assistant for optional household automation.

## AI Development Note

This app has been developed through AI-agent-led coding workflows, including SWE 1.6, Opus 4.7, GPT-5.5, and Devin Cloud for QA testing. Human maintainers should still treat the repository like a normal production codebase: verify behavior, run tests, inspect diffs, and avoid trusting generated changes blindly.

## Architecture Map

| Area                  | Purpose                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/main`            | Electron main process, window lifecycle, tray, IPC handlers, security checks, schedulers, SQLite services |
| `src/main/preload.ts` | Secure renderer bridge exposed through `window.assistantApi`                                              |
| `src/renderer`        | React UI, panels, hooks, command flow, theme/display behavior                                             |
| `src/shared`          | Shared types, AI/tool types, IPC channel names                                                            |
| `scripts`             | Release helpers, smoke checks, generated assets, handoff/activity utilities                               |
| `tests`               | Browser and Electron Playwright E2E tests                                                                 |
| `docs`                | Architecture, release, security, public readiness, and setup references                                   |

The main safety boundary is Electron IPC. Renderer code should go through preload APIs. Main-process handlers should validate payloads and trusted senders before touching services or the database.

## How To Make A Change

Start in the smallest area that owns the behavior:

- UI, command behavior, or user workflow: start in `src/renderer`.
- Workspace composition or cross-panel state: inspect `src/renderer/hooks/useAssistantWorkspace.ts` and `src/renderer/hooks/composition`.
- Command parsing: start in `src/renderer/command/executeAssistantCommand.ts`.
- New IPC: update channel definitions, Zod schemas, main handlers, preload exposure, renderer ambient types, and tests together.
- SQLite or domain behavior: start in `src/main/services`, `src/main/db.ts`, and `src/main/db/migrations`.
- Release behavior: update `CHANGELOG.md` and regenerate release notes before shipping.

Keep tests close to the changed behavior. Prefer focused unit or renderer tests for narrow changes, and add E2E coverage only when the behavior crosses Electron, preload, tray, or installed-app boundaries.

## Verification Checklist

Use PowerShell on Windows and prefer `npm.cmd`:

```powershell
npm.cmd run check:preload-ipc
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:smoke
npm.cmd run test:preload-electron
npm.cmd audit --audit-level=high
```

For larger UI or Electron changes, also run the relevant Playwright suites:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:electron
```

If a command rebuilds native dependencies for Node, `npm test` should restore the Electron build afterward. If Electron fails to launch after testing, rerun:

```powershell
npm.cmd run rebuild:electron
```

## Release Process

`RELEASING.md` is the source of truth for release steps.

Current release path:

- Windows-only manual release.
- Build locally and upload Windows assets manually.
- macOS and Linux release assets are omitted until GitHub Actions budget and packaging validation are restored.
- Run `npm.cmd audit --audit-level=high` before every release. High or critical findings block release.

Do not commit generated artifacts from:

- `dist/`
- `release/`
- `installer-history/`
- `release-download-check/`
- `test-results/`
- generated SBOM or release evidence files unless a task explicitly asks to track them.

Auto-update versions must be monotonic. Do not reset the technical app version downward for public marketing reasons. If the app later presents a public `1.0` label, keep the package/updater version semver-greater than existing installed versions.

## Maintenance Warnings

- Be careful around Electron main, preload, and renderer boundaries.
- Do not bypass Zod validation for IPC payloads.
- Do not expose secrets to the renderer unless an existing safe contract already allows it.
- Store secrets only through the safeStorage-backed service paths.
- Keep `src/main/preload-ipc-literals.generated.ts` in sync with IPC channels.
- Do not treat `WORKER_ACTIVITY.md` as current truth. It is useful history, but the code and current docs win.
- Do not rely on generated changes without reading the diff.

## Human Takeover Notes

First commands for a new maintainer:

```powershell
npm install
npm.cmd test
npm.cmd run build
```

Read these files next:

- `README.md`
- `RELEASING.md`
- `docs/ARCHITECTURE.md`
- `WORKER_HANDOFF.md`

Use `WORKER_ACTIVITY.md` for project history and context, not as an instruction source.

When unsure, make the smallest reversible change, add a focused test, and run the verification checklist before release work.

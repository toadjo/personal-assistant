# Contributing to Personal OS

Thanks for considering a contribution! Personal OS is a local-first desktop app built with Electron, React, TypeScript, and SQLite. This guide will help you find a small, safe first change.

## Quick start

```bash
git clone https://github.com/toadjo/personal-assistant.git
cd personal-assistant
npm install
npm run dev
```

Requirements: Node 22.12+ LTS (see `package.json` `engines`). Windows is the primary development target; macOS and Linux work for most development but tray behavior varies.

## Before you push

```bash
npm run lint
npm run typecheck
npm test
```

Pre-commit hooks (Husky) already run `typecheck` and lint-staged on each commit, so most issues get caught locally.

## Finding a good first issue

Look for issues labeled `good first issue` or `help wanted`. If you don't see any, here are areas that are typically safe for a first contribution:

### 1. Fix a small UI bug or styling issue

- **Where:** `src/renderer/components/`
- **Pattern:** Pick a panel (e.g., `InboxPanel.tsx`, `PlanTodayPanel.tsx`), find a small visual bug or accessibility issue, and fix it.
- **Test:** Add or update the colocated `.test.tsx` file.

### 2. Add a Zod schema or tighten IPC validation

- **Where:** `src/main/ipc/handlers/schemas.ts`
- **Pattern:** Find an IPC handler that accepts loose input and add a stricter Zod schema.
- **Test:** Add a case to `src/main/ipc/handlers/handler-payload-contract.test.ts`.

### 3. Add a unit test for an existing service

- **Where:** `src/main/services/`
- **Pattern:** Pick a service (e.g., `finance.ts`, `family.ts`), find an untested branch, and add a focused test in the colocated `.test.ts` file.
- **Test:** Use `createMemoryDatabase()` from `src/main/test/memoryDb.ts`.

### 4. Add a life-area module (larger but well-documented)

- **Where:** `src/main/services/lifeAreas/`
- **Pattern:** Follow the [Life-Area Module Guide](./docs/LIFE_AREAS.md) to add a new life area in one manifest plus its own files.
- **Test:** Add a case to `src/main/services/lifeAreas/registry.test.ts` and a service test for the new area.

## Making a safe first change

1. **Pick a small, reversible change.** Avoid touching Electron main, preload, or security boundaries on your first PR.
2. **Write a test first.** If fixing a bug, write a failing test that reproduces it, then fix the bug.
3. **Run the verification checklist:**

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Open a PR** with a clear description of what changed and why. Link the issue if applicable.

## Code style

- Follow existing patterns in neighboring files.
- Use existing libraries; don't add new dependencies without discussion.
- Don't add or remove comments unless asked.
- Keep error handling focused; not every line needs a try/catch.
- Security: never log or expose secrets. Validate IPC payloads with Zod. Store secrets only through safeStorage-backed paths.

## Issue and PR conventions

- Use the GitHub issue templates for bugs, features, accessibility, and security reports.
- PR titles should be concise and describe the change (e.g., `fix(inbox): sort items by createdAt`).
- Link related issues in the PR description.
- Don't commit generated artifacts from `dist/`, `release/`, `test-results/`, or similar directories.

## Where to ask for help

- Open a `question` issue if you're stuck.
- Read the [Maintainer Guide](./docs/MAINTAINER_GUIDE.md) for the architecture map and change workflow.
- Read the [Roadmap](./docs/ROADMAP.md) to see where your idea fits.

## Areas that need extra care

These areas have safety implications and are not ideal for a first contribution:

- `src/main/preload.ts` and IPC channel definitions (`src/shared/ipc-channels.ts`)
- `src/main/security/` and corporate mode enforcement
- Backup encryption and safeStorage paths
- Release process and version bumping

If your change touches any of these, expect more review and run the full verification checklist including E2E tests.

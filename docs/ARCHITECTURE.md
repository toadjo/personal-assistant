# PersonalAssistant Architecture

## Overview

Electron desktop app: **main** (Node/Electron) + **renderer** (React/Vite) + **SQLite** (local, `better-sqlite3`). Two windows: **Desk** (daily work) and **Household** (automation/HA). Optional **Team Projects** mode for shared task collaboration via Supabase.

## Directory Map

```
src/main          Electron main process: window, IPC handlers, security, DB services
src/main/team     Team Projects: Supabase client, workspaces, projects, tasks, realtime, config, session storage
src/renderer      React app: components, hooks, styles, pages
src/renderer/components/panels/ProjectsPanel.tsx  Team Projects renderer panel
src/shared        Types, IPC channels, Zod schemas used by both processes
scripts           Build/preload IPC generation helpers
tests             E2E tests (Playwright)
```

## IPC Contract

- **Invoke** (`IpcInvoke`): renderer requests, main responds. E.g., `app:openBugReport`
- **Push** (`IpcPush`): main broadcasts to renderer. E.g., `command`, `remindersUpdated`
- **Preload** (`src/main/preload.ts`): exposes safe subset to renderer via `window.assistantApi`
- **Validation**: every invoke channel has a Zod schema or is listed in `ZERO_ARG_INVOKE_CHANNELS`
- **Parity**: `npm run check:preload-ipc` ensures generated channel literals stay in sync

## Security Model

- `contextIsolation: true`, `nodeIntegration: false`
- Navigation blocked unless explicitly trusted (`src/main/security.ts`)
- External links opened only through fixed IPC handlers (`shell.openExternal`), never renderer `<a target="_blank">`
- CSP enforced via `Content-Security-Policy` header

## Data Flow

1. **Services** (`src/main/services/`) read/write SQLite via `better-sqlite3`
2. **Migrations** run on startup (`src/main/db/migrate.ts`)
3. **Renderer hooks** (`src/renderer/hooks/data/`) fetch via IPC and cache in React state
4. **Derived state** built in composition hooks (`useDeskDataState`, `useDeskHomeAssistantState`)

## Team Projects

Team Projects adds optional Supabase-based collaboration:

- **Backend modes**: Hosted (environment-configured Supabase) or manual self-hosted (user-provided Supabase URL/anon key)
- **Main-process services** (`src/main/team/`): Supabase client, workspace/project/task management, realtime subscriptions, config, session storage
- **Renderer panel** (`src/renderer/components/panels/ProjectsPanel.tsx`): UI for setup, workspace/project/task management, filters, editor
- **Security**: Supabase anon key never exposed to renderer; all team IPC handlers validate with Zod and trusted sender checks; session storage uses safeStorage when available

## UI Conventions

- **Panels**: self-contained sections with `PanelHeader` and close button
- **Hooks**: data hooks return `{ data, refresh, mutate }`; composition hooks assemble domain state
- **Theme tokens**: colors applied via CSS variables on `document.documentElement`
- **Preferences**: density, radius, shadows toggled via CSS classes + localStorage

## Testing

| Command                     | What it verifies                                          |
| --------------------------- | --------------------------------------------------------- |
| `npm run check:preload-ipc` | Generated IPC literals match `src/shared/ipc-channels.ts` |
| `npm run typecheck`         | No TypeScript errors                                      |
| `npm run lint`              | ESLint passes                                             |
| `npm test`                  | Unit + integration tests (Vitest)                         |

## Where To Work

| Task                   | File area                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Add IPC channel        | `src/shared/ipc-channels.ts`, handler in `src/main/ipc/handlers/`, `src/main/preload.ts`, `vite-env.d.ts` |
| Add DB table/model     | `src/main/db/migrate.ts`, `src/main/services/`                                                            |
| Add renderer component | `src/renderer/components/`                                                                                |
| Add data hook          | `src/renderer/hooks/data/`                                                                                |
| Add command            | `src/renderer/lib/commands/commandRegistry.ts`                                                            |
| Change theme           | `src/renderer/styles.css`, theme token utilities                                                          |
| Fix window behavior    | `src/main/window.ts`, `src/main/ipc/handlers/appWindow.handlers.ts`                                       |
| Security policy        | `src/main/security.ts`, `src/main/window.ts`                                                              |

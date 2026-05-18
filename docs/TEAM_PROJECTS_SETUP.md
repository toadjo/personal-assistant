# Team Projects Setup Guide

Team Projects lets multiple people share workspaces, projects, and project tasks. Personal notes, reminders, local tasks, automations, and Home Assistant settings remain local-first in SQLite.

The app supports two backend modes:

- Hosted backend: Supabase URL and anon key are provided by the build environment. Users only enter a display name.
- Advanced self-hosted backend: users provide their own Supabase URL and anon key in the app.

## User Setup

### Hosted backend build

Use this path when Team Projects is available in the app without entering Supabase credentials.

1. Open **Team Projects**.
2. Select **Continue**.
3. Enter your display name.
4. Create a workspace, or join one with a 16-character invite code.
5. Create projects and tasks inside the active workspace.

The display name is shown to other workspace members. It must be 1 to 60 characters.

### Advanced self-hosted backend

Use this path only when you want the app to connect to your own Supabase project.

1. Open **Team Projects**.
2. Select **Advanced self-hosted backend**.
3. Enter the Supabase project URL. It must use `https://` and must not end with a trailing slash.
4. Enter the Supabase anon key.
5. Enter your display name.
6. Save the setup.
7. Create a workspace, or join one with a 16-character invite code.

Manual credentials are stored in main-process settings. The Supabase anon key is not returned to the renderer.

## Hosted Build Configuration

Hosted mode is enabled when both environment variables are present at runtime or build time:

```powershell
$env:TEAM_PROJECTS_SUPABASE_URL="https://your-project.supabase.co"
$env:TEAM_PROJECTS_SUPABASE_ANON_KEY="your-anon-key"
```

If both hosted values are present and the user has no manual credentials saved, Team Projects asks only for a display name. If manual credentials are saved, they take priority over hosted credentials.

If neither hosted nor manual credentials are available, the app shows Team Projects as unavailable in that build.

## Supabase Project Setup

Use this section for a hosted backend operator or an advanced self-hosted user.

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Create a new project.
3. Choose a database password and store it securely.
4. Select the region closest to the team.
5. Wait for provisioning to finish.
6. Open **Settings > API**.
7. Copy the **Project URL** and **anon public key**.
8. Open **SQL Editor**.
9. Run the full contents of `docs/TEAM_SCHEMA.sql`.

The schema creates:

- `team_workspaces`
- `team_workspace_members`
- `team_projects`
- `team_project_tasks`

It also creates RPC functions used by the app:

- `create_team_workspace(name, workspace_key, display_name)`
- `join_workspace_by_key(workspace_key, display_name)`

Row-level security keeps users scoped to workspaces they have joined. The RPC functions use `SECURITY DEFINER` for controlled workspace creation and joining.

## Workspace Flow

### Create a workspace

1. Open **Team Projects**.
2. Select **Create Workspace**.
3. Enter a workspace name.
4. Share the generated 16-character invite code with collaborators.

If there is no active workspace yet, the new workspace becomes active automatically.

### Join a workspace

1. Open **Team Projects**.
2. Select **Join Workspace**.
3. Enter the 16-character invite code.
4. Open the joined workspace from the workspace list if needed.

If there is no active workspace yet, the joined workspace becomes active automatically.

### Work with projects and tasks

1. Create a project in the active workspace.
2. Create tasks inside that project.
3. Optionally set due date, priority, recurrence, status, notes, and assignee display name.
4. Switch workspace when you need a different shared project area.

Realtime updates are best effort. When a Team Projects panel is open with an active workspace, the renderer starts a Supabase realtime subscription and debounces project/task refreshes.

## Data Model

### Workspaces

- `id`: UUID
- `name`: 1 to 120 characters
- `workspace_key`: 16-character invite code
- `created_by`: Supabase user ID of creator
- `created_at`: timestamp

### Members

- `workspace_id`: UUID reference to a workspace
- `user_id`: Supabase user ID
- `display_name`: 1 to 60 characters
- `joined_at`: timestamp

### Projects

- `id`: UUID
- `workspace_id`: UUID reference to a workspace
- `name`: 1 to 120 characters
- `created_by`: Supabase user ID of creator
- `created_at`: timestamp

### Tasks

- `id`: UUID
- `workspace_id`: UUID reference to a workspace
- `project_id`: UUID reference to a project
- `title`: 1 to 200 characters
- `notes`: optional, up to 5000 characters
- `due_at`: optional timestamp
- `priority`: `low`, `normal`, or `high`
- `status`: `open` or `done`
- `recurrence`: `none`, `daily`, `weekly`, or `monthly`
- `assignee_display_name`: optional member display name
- `created_by`: Supabase user ID of creator
- `created_at`: timestamp
- `updated_by`: Supabase user ID of last updater
- `updated_at`: timestamp

## Security Notes

- Authentication uses Supabase anonymous auth.
- Authorization uses row-level security.
- Team credentials stay in the main process.
- `teamGetConfig` never returns the Supabase anon key to the renderer.
- Team session storage uses Electron `safeStorage` when available.
- If OS encryption is unavailable, the session falls back to plaintext storage and logs a warning.
- Invite codes grant workspace access to anyone with the same backend configuration.

## Troubleshooting

### Team Projects is not available

The build does not have hosted backend credentials and no manual backend has been configured. Use a hosted build, or configure an advanced self-hosted backend.

### Display name is rejected

Use a non-empty name up to 60 characters.

### Supabase URL is rejected

Use an HTTPS project URL with no trailing slash, for example:

```text
https://your-project.supabase.co
```

### Invalid workspace key

Verify the code is exactly 16 characters and belongs to the same Supabase backend.

### Not authenticated

Check network access to Supabase and confirm the anon key belongs to the project URL.

### Data does not refresh between devices

Confirm both devices use the same backend, both have joined the same workspace, and the active workspace is open. Reopen the Team Projects panel if realtime appears stale.

## Resetting Team Projects

1. Open **Team Projects**.
2. Use the available reset or clear configuration action.
3. Reconfigure display name or backend credentials.

Clearing local configuration does not delete Supabase data.

## Manual Smoke Test Checklist

Use this checklist with a real Supabase project.

- [ ] Run `docs/TEAM_SCHEMA.sql` in a fresh Supabase project and confirm it completes.
- [ ] Start Profile A and configure hosted or self-hosted Team Projects with display name `Alice`.
- [ ] Create a workspace in Profile A and copy the invite code.
- [ ] Start Profile B with the same backend and display name `Bob`.
- [ ] Join Profile B to the workspace using the invite code.
- [ ] Create a project in Profile A and confirm it appears in Profile B.
- [ ] Create a task in Profile A and confirm it appears in Profile B.
- [ ] Update the task from Profile B and confirm Profile A sees the change.
- [ ] Switch active workspaces if multiple workspaces exist and confirm the task list changes.

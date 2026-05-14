# Team Projects V1 Setup Guide

This guide explains how to set up the Team Projects feature using Supabase as the backend.

## Overview

Team Projects V1 allows multiple users to collaborate on shared workspaces, projects, and tasks. The feature uses Supabase for:

- Anonymous authentication
- Refresh-bfs-dbased data upd(n( remltimpsp eh ye)
- Row-level security (RLS) for data isolation

## Prerequisites

1. A Supabase account (free tier is sufficient for testing)
2. The Personal Assistant Electron app built from source

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose a name (e.g., `personal-assistant-team`)
4. Choose a database password (store it securely)
5. Select a region closest to your users
6. Click "Create new project"

Wait for the project to be provisioned (typically 1-2 minutes).

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings > API**
2. Copy the **Project URL** (looks like `https://xyz.supabase.co`)
3. Copy the **anon public key** (looks like a long random string)
4. Keep these values handy for the next step

## Step 3: Set Up the Database Schema

1. In the Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `docs/TEAM_SCHEMA.sql` from this repository
4. Paste it into the SQL editor
5. Click **Run** to execute the schema creation

This will create the following tables:

- `team_workspaces` - Shared workspaces
- `team_workspace_members` - Workspace membership
- `team_projects` - Projects within workspaces
- `team_project_tasks` - Tasks within projects

The schema includes:

- Row Level Security (RLS) policies to ensure users can only access data from workspaces they are members of
- RPC functions for secure workspace operations:
  - `create_team_workspace(name, workspace_key, display_name)` - Creates a workspace and adds the creator as a member
  - `join_workspace_by_key(workspace_key, display_name)` - Joins a workspace using the invite key
- RPC functions use `SECURITY DEFINER` to bypass RLS for controlled operations

## Step 4: Configure the App

1. Launch the Personal Assistant app
2. Navigate to **Settings** (the gear icon in the top toolbar)
3. Find the **Team Mode** section
4. Enter your Supabase credentials:
   - **Supabase URL**: The Project URL from Step 2
   - **Supabase Anon Key**: The anon public key from Step 2
   - **Display Name**: Your name as shown to other workspace members
5. Click **Save**

The app will:

- Validate the Supabase URL and anon key format
- Store credentials securely in the main process settings
- Perform anonymous sign-in with Supabase
- Persist the session locally (encrypted or plaintext based on OS support)

## Step 5: Create a Workspace

After configuring team mode:

1. In the Team Mode section, click **Create Workspace**
2. Enter a workspace name (e.g., "Marketing Team")
3. The app will generate a 16-character workspace key
4. Share this workspace key with team members (they can join using this key)

## Step 6: Invite Team Members

To invite team members to your workspace:

1. Share the **workspace key** with them (16-character code)
2. Have them configure their app with the same Supabase credentials
3. Have them click **Join Workspace** and enter the workspace key
4. They will appear in the workspace member list

## Step 7: Create Projects and Tasks

Once you have a workspace with members:

1. Click **Create Project** to add a project to the workspace
2. Click **Create Task** to add tasks to a project
3. Tasks can be assigned to members using the **Assignee** field
4. Changes are automatically reflected in real-time across all connected clients when an active workspace is selected

## Data Model

### Workspaces

- **id**: UUID (auto-generated)
- **name**: 1-120 characters
- **workspace_key**: 16-character invite code (unique)
- **created_by**: Supabase user ID of creator
- **created_at**: Timestamp

### Members

- **workspace_id**: UUID (references workspaces)
- **user_id**: Supabase user ID
- **display_name**: 1-60 characters (shown to other members)
- **joined_at**: Timestamp

### Projects

- **id**: UUID (auto-generated)
- **workspace_id**: UUID (references workspaces)
- **name**: 1-120 characters
- **created_by**: Supabase user ID of creator
- **created_at**: Timestamp

### Tasks

- **id**: UUID (auto-generated)
- **workspace_id**: UUID (references workspaces)
- **project_id**: UUID (references projects)
- **title**: 1-200 characters
- **notes**: Optional, up to 5000 characters
- **due_at**: Optional timestamp
- **priority**: "low", "normal", or "high"
- **status**: "open" or "done"
- **recurrence**: "none", "daily", "weekly", or "monthly"
- **assignee_display_name**: Optional member name
- **created_by**: Supabase user ID of creator
- **created_at**: Timestamp
- **updated_by**: Supabase user ID of last updater
- **updated_at**: Timestamp

## Security

- **Authentication**: Anonymous Supabase auth (no user accounts required)
- **Authorization**: Row-level security ensures users only see data from workspaces they've joined
- **RPC Security**: Workspace creation and joining use RPC functions with `SECURITY DEFINER` to bypass RLS for controlled operations
- **Encryption**: Session tokens are encrypted using Electron's safeStorage (platform-dependent)
- **Fallback**: If encryption is unavailable, session is stored as plaintext (logged with warning)

## Troubleshooting

### "Team mode is not configured" error

- Ensure you've entered valid Supabase URL and anon key in settings
- Check that the Supabase project is active and accessible

### "Invalid workspace key" error

- Verify the workspace key is exactly 16 characters
- Ensure you're using a valid key from an existing workspace

### "Not authenticated" error

- Check that Supabase anonymous sign-in succeeded
- Verify your network connection to Supabase
- Check the main process logs for auth errors

### Data not refreshing between devices

- Ensure both devices are using the same Supabase project
- Verify both devices have joined the same workspace
- Check network connectivity

## Resetting Team Mode

To clear team mode configuration:

1. Go to **Settings > Team Mode**
2. Click **Clear Configuration**
3. This will:
   - Remove Supabase credentials from local storage
   - Delete the persisted session
   - Clear the active workspace selection

The Supabase data remains intact; you can reconfigure later.

## Limitations (V1)

- No user account management (anonymous auth only)
- No workspace permissions (all members have equal access)
- No file attachments or rich text in task notes
- No task comments or discussion threads

These may be addressed in future versions.

## Manual Smoke Test Checklist

Use this checklist to verify team mode works correctly with a real Supabase project:

### Prerequisites

- [ ] **Schema Smoke Test**: Open a fresh Supabase project SQL Editor and run the entire `docs/TEAM_SCHEMA.sql` file. Verify it completes without errors and creates all tables, indexes, and RPC functions.
- [ ] Supabase project created and schema applied (from Step 3)
- [ ] Two separate app profiles (e.g., separate user data directories or two different machines)

### Test Flow

- [ ] **Configure Supabase**: In Profile A, navigate to Settings > Team Mode and enter Supabase URL, anon key, and display name (e.g., "Alice"). Click Save.
- [ ] **Create Workspace**: In Profile A, click "Create Workspace" and enter a name (e.g., "Marketing Team"). Verify a 16-character workspace key is generated.
- [ ] **Join Workspace**: In Profile B, configure the same Supabase credentials with a different display name (e.g., "Bob"). Click "Join Workspace" and enter the workspace key from Profile A. Verify both users appear in the workspace.
- [ ] **Create Project**: In Profile A, click "Create Project" and add a project to the workspace (e.g., "Q1 Campaign"). Verify the project appears in the project list.
- [ ] **Create Task**: In Profile A, click "Create Task" and add a task to the project (e.g., "Design logo"). Verify the task appears in the task list.
- [ ] **Update Task from Profile B**: In Profile B, update the task (e.g., change status to "done" or add notes). Verify the change is visible in Profile A after a refresh.
- [ ] **Create Task from Profile B**: In Profile B, create another task. Verify it appears in Profile A.

### Expected Results

- Both profiles should see the same workspace, project, and tasks
- Changes made by one profile should be visible to the other
- Display names should correctly identify who created or modified items
- No authentication errors should occur after initial configuration

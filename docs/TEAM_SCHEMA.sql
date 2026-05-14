-- Supabase database schema for Team Projects V1
-- Run this SQL in the Supabase SQL Editor to set up the required tables.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces table
CREATE TABLE IF NOT EXISTS team_workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 120),
  workspace_key TEXT NOT NULL UNIQUE CHECK (char_length(workspace_key) = 16),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE IF NOT EXISTS team_workspace_members (
  workspace_id UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 60),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS team_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 120),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Project tasks table
CREATE TABLE IF NOT EXISTS team_project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES team_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  notes TEXT CHECK (char_length(notes) <= 5000),
  due_at TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL CHECK (status IN ('open', 'done')),
  recurrence TEXT NOT NULL CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  assignee_display_name TEXT CHECK (char_length(assignee_display_name) >= 1 AND char_length(assignee_display_name) <= 60),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_project_tasks ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
-- Users can only see workspaces they are members of
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON team_workspaces;
CREATE POLICY "Users can view workspaces they are members of"
  ON team_workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members policies
-- Users can see all members of their workspaces
DROP POLICY IF EXISTS "Users can view workspace members" ON team_workspace_members;
CREATE POLICY "Users can view workspace members"
  ON team_workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves as members (when joining via invite key)
DROP POLICY IF EXISTS "Users can insert themselves as members" ON team_workspace_members;
CREATE POLICY "Users can insert themselves as members"
  ON team_workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Projects policies
-- Users can only see projects in their workspaces
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON team_projects;
CREATE POLICY "Users can view projects in their workspaces"
  ON team_projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can create projects in their workspaces
DROP POLICY IF EXISTS "Users can create projects in their workspaces" ON team_projects;
CREATE POLICY "Users can create projects in their workspaces"
  ON team_projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Tasks policies
-- Users can only see tasks in their workspaces
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON team_project_tasks;
CREATE POLICY "Users can view tasks in their workspaces"
  ON team_project_tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can create tasks in their workspaces
DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON team_project_tasks;
CREATE POLICY "Users can create tasks in their workspaces"
  ON team_project_tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can update tasks in their workspaces
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON team_project_tasks;
CREATE POLICY "Users can update tasks in their workspaces"
  ON team_project_tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM team_workspace_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_workspaces_created_by ON team_workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_team_workspace_members_user_id ON team_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_workspace_id ON team_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_project_tasks_workspace_id ON team_project_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_project_tasks_project_id ON team_project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_team_project_tasks_status ON team_project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_project_tasks_due_at ON team_project_tasks(due_at);

-- RPC Functions for workspace operations
-- These functions use SECURITY DEFINER to bypass RLS for controlled operations

-- Create a workspace and automatically add the creator as a member
CREATE OR REPLACE FUNCTION create_team_workspace(
  p_name TEXT,
  p_workspace_key TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the workspace
  INSERT INTO team_workspaces (name, workspace_key, created_by)
  VALUES (p_name, p_workspace_key, v_user_id)
  RETURNING id INTO v_workspace_id;

  -- Add the creator as a member
  INSERT INTO team_workspace_members (workspace_id, user_id, display_name)
  VALUES (v_workspace_id, v_user_id, p_display_name);

  -- Return the created workspace
  SELECT json_build_object(
    'id', id,
    'name', name,
    'workspace_key', workspace_key,
    'created_by', created_by,
    'created_at', created_at
  ) INTO v_result
  FROM team_workspaces
  WHERE id = v_workspace_id;

  RETURN v_result;
END;
$$;

-- Join a workspace using the workspace key
CREATE OR REPLACE FUNCTION join_workspace_by_key(
  p_workspace_key TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the workspace by key
  SELECT id INTO v_workspace_id
  FROM team_workspaces
  WHERE workspace_key = p_workspace_key;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Invalid workspace key';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM team_workspace_members
    WHERE workspace_id = v_workspace_id AND user_id = v_user_id
  ) THEN
    -- Already a member, just return the workspace
    SELECT json_build_object(
      'id', id,
      'name', name,
      'workspace_key', workspace_key,
      'created_by', created_by,
      'created_at', created_at
    ) INTO v_result
    FROM team_workspaces
    WHERE id = v_workspace_id;

    RETURN v_result;
  END IF;

  -- Add as a member
  INSERT INTO team_workspace_members (workspace_id, user_id, display_name)
  VALUES (v_workspace_id, v_user_id, p_display_name);

  -- Return the workspace
  SELECT json_build_object(
    'id', id,
    'name', name,
    'workspace_key', workspace_key,
    'created_by', created_by,
    'created_at', created_at
  ) INTO v_result
  FROM team_workspaces
  WHERE id = v_workspace_id;

  RETURN v_result;
END;
$$;

-- Add tables to Supabase Realtime publication for live updates
-- This enables Postgres Changes subscriptions for team_projects and team_project_tasks
-- The DO block makes this idempotent: it checks pg_publication_tables before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_projects;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_project_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_project_tasks;
  END IF;
END $$;

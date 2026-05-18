/**
 * Projects panel for team mode.
 *
 * Shows team setup form, workspace controls, project list, and shared tasks.
 * Uses existing panel, button, select, and status banner patterns.
 */

import { useEffect, useState, useMemo } from "react";
import { Users, Plus, Key, Loader2, CheckCircle2, Circle, Pencil } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { StatusBanner } from "../layout/StatusBanner";
import { EmptyState } from "../ui/EmptyState";
import { useTeamState } from "../../hooks/team/useTeamState";
import { useTeamRealtime } from "../../hooks/team/useTeamRealtime";
import type { TeamProjectTask } from "../../../shared/team/types";
import type { TeamState } from "../../hooks/team/useTeamState";
import { validateWorkspaceKey } from "../../../shared/team/keyValidation";
import "./ProjectsPanel.css";

type Props = {
  team?: TeamState;
};

export function ProjectsPanel({ team: externalTeam }: Props = {}): JSX.Element {
  const internalTeam = useTeamState();
  const team = externalTeam ?? internalTeam;
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showJoinWorkspace, setShowJoinWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showSwitchWorkspace, setShowSwitchWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [projectName, setProjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskRecurrence, setTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [taskAssigneeDisplayName, setTaskAssigneeDisplayName] = useState("");
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"open" | "done" | "all">("open");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");
  const [editTaskDueAt, setEditTaskDueAt] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [editTaskRecurrence, setEditTaskRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [editTaskAssigneeDisplayName, setEditTaskAssigneeDisplayName] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<"open" | "done">("open");
  const [isSaving, setIsSaving] = useState(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  // Load config on mount (only if using internal team state)
  useEffect(() => {
    if (externalTeam) return;
    void team.loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTeam]);

  // Load workspaces when config is set (only if using internal team state)
  useEffect(() => {
    if (externalTeam) return;
    if (team.config?.configured) {
      void team.loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTeam, team.config?.configured]);

  // Load projects when active workspace is set (only if using internal team state)
  useEffect(() => {
    if (externalTeam) return;
    if (team.activeWorkspace) {
      void team.loadProjects();
      void team.loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTeam, team.activeWorkspace]);

  // Reset project filter if selected project no longer exists
  useEffect(() => {
    if (selectedProjectId !== "all" && !team.projects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.projects]);

  // Close editor if selected task no longer exists
  useEffect(() => {
    if (editingTaskId && !team.tasks.find(t => t.id === editingTaskId)) {
      setEditingTaskId(null);
      setEditValidationError(null);
    }
  }, [team.tasks, editingTaskId]);

  // Start realtime when using internal team state only (external team handles its own realtime)
  useTeamRealtime(team, { projects: true, tasks: true, enabled: !externalTeam });

  const handleSaveConfig = async () => {
    setValidationError(null);
    // Validate required fields
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim() || !displayName.trim()) {
      setValidationError("All fields are required");
      return;
    }
    try {
      await team.saveConfig({ supabaseUrl, supabaseAnonKey, displayName });
      setShowSetupForm(false);
      setSupabaseUrl("");
      setSupabaseAnonKey("");
      setDisplayName("");
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Failed to save config");
    }
  };

  const handleSaveDisplayName = async () => {
    setValidationError(null);
    if (!displayName.trim()) {
      setValidationError("Display name is required");
      return;
    }
    try {
      await window.assistantApi.teamSetDisplayName({ displayName });
      await team.loadConfig();
      setShowSetupForm(false);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Failed to save display name");
    }
  };

  const handleCreateWorkspace = async () => {
    setValidationError(null);
    // Validate required field
    if (!workspaceName.trim()) {
      setValidationError("Workspace name is required");
      return;
    }
    const result = await team.createWorkspace(workspaceName);
    if (result) {
      setWorkspaceName("");
      setShowCreateWorkspace(false);
    }
  };

  const handleJoinWorkspace = async () => {
    setValidationError(null);
    // Validate workspace key using shared validator
    const keyValidation = validateWorkspaceKey(workspaceKey);
    if (!keyValidation.ok) {
      setValidationError(keyValidation.reason);
      return;
    }
    const result = await team.joinWorkspace(workspaceKey);
    if (result) {
      setWorkspaceKey("");
      setShowJoinWorkspace(false);
    }
  };

  const handleCreateProject = async () => {
    setValidationError(null);
    if (!projectName.trim()) {
      setValidationError("Project name is required");
      return;
    }
    const result = await team.createProject(projectName);
    if (result) {
      setProjectName("");
      setShowCreateProject(false);
    }
  };

  const handleCreateTask = async () => {
    setValidationError(null);
    // Validate required fields
    if (!taskTitle.trim() || !taskProjectId) {
      setValidationError("Task title and project are required");
      return;
    }

    // Validate recurrence requires due date
    if (taskRecurrence !== "none" && !taskDueAt.trim()) {
      setValidationError("Recurring tasks require a due date");
      return;
    }

    // Convert datetime-local to ISO string if provided
    const dueAtIso = taskDueAt.trim() ? new Date(taskDueAt).toISOString() : null;

    const result = await team.createTask({
      projectId: taskProjectId,
      title: taskTitle,
      notes: taskNotes,
      dueAt: dueAtIso,
      priority: taskPriority,
      recurrence: taskRecurrence,
      assigneeDisplayName: taskAssigneeDisplayName || null
    });
    if (result) {
      setTaskTitle("");
      setTaskNotes("");
      setTaskProjectId("");
      setTaskDueAt("");
      setTaskPriority("normal");
      setTaskRecurrence("none");
      setTaskAssigneeDisplayName("");
      setShowCreateTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: TeamProjectTask) => {
    const newStatus = task.status === "open" ? "done" : "open";
    await team.updateTask({ ...task, status: newStatus });
  };

  const handleEditTask = (task: TeamProjectTask) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskNotes(task.notes || "");
    setEditTaskDueAt(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : "");
    setEditTaskPriority(task.priority);
    setEditTaskRecurrence(task.recurrence);
    setEditTaskAssigneeDisplayName(task.assigneeDisplayName || "");
    setEditTaskStatus(task.status);
    setEditValidationError(null);
  };

  const handleSaveEdit = async () => {
    setEditValidationError(null);
    const task = team.tasks.find(t => t.id === editingTaskId);
    if (!task) return;

    // Validate required fields
    if (!editTaskTitle.trim()) {
      setEditValidationError("Task title is required");
      return;
    }

    // Validate recurrence requires due date
    if (editTaskRecurrence !== "none" && !editTaskDueAt.trim()) {
      setEditValidationError("Recurring tasks require a due date");
      return;
    }

    // Convert datetime-local to ISO string if provided
    const dueAtIso = editTaskDueAt.trim() ? new Date(editTaskDueAt).toISOString() : null;

    setIsSaving(true);
    try {
      await team.updateTask({
        ...task,
        title: editTaskTitle,
        notes: editTaskNotes,
        dueAt: dueAtIso,
        priority: editTaskPriority,
        recurrence: editTaskRecurrence,
        assigneeDisplayName: editTaskAssigneeDisplayName || null,
        status: editTaskStatus
      });
      setEditingTaskId(null);
      setEditValidationError(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditValidationError(null);
  };

  // Filter tasks based on selected project and status
  const filteredTasks = useMemo(() => {
    return team.tasks.filter((task) => {
      const projectMatch = selectedProjectId === "all" || task.projectId === selectedProjectId;
      const statusMatch = selectedStatus === "all" || task.status === selectedStatus;
      return projectMatch && statusMatch;
    });
  }, [team.tasks, selectedProjectId, selectedStatus]);

  // Create project lookup map to avoid repeated find calls in task rendering
  const projectMap = useMemo(() => {
    return new Map(team.projects.map(p => [p.id, p]));
  }, [team.projects]);

  // Setup state: team mode not configured
  if (!team.config?.configured) {
    // Unavailable state: no backend config
    if (team.config?.backendMode === "unavailable") {
      return (
        <div className="panel">
          <PanelHeader icon={Users} title="Team Projects" />
          <div className="panelContent">
            <EmptyState
              icon={Users}
              title="Team Projects is not available in this build"
              description="Team Projects requires a hosted backend configuration."
            />
            {showAdvancedSetup && (
              <div className="panelContent">
                {validationError && <StatusBanner status="" error={validationError} />}
                <div className="formGroup">
                  <label htmlFor="supabaseUrl">Supabase URL</label>
                  <input
                    id="supabaseUrl"
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="supabaseAnonKey">Supabase Anon Key</label>
                  <input
                    id="supabaseAnonKey"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    placeholder="Your name (e.g., Alice)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formActions">
                  <button
                    type="button"
                    className="button buttonPrimary"
                    onClick={handleSaveConfig}
                    disabled={team.isLoadingConfig}
                  >
                    {team.isLoadingConfig ? <Loader2 size={16} className="spin" /> : "Save"}
                  </button>
                  <button
                    type="button"
                    className="button buttonSecondary"
                    onClick={() => {
                      setShowAdvancedSetup(false);
                      setShowSetupForm(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!showAdvancedSetup && (
              <button
                type="button"
                className="button buttonSecondary"
                onClick={() => {
                  setShowAdvancedSetup(true);
                  setShowSetupForm(true);
                }}
              >
                Advanced self-hosted backend
              </button>
            )}
          </div>
        </div>
      );
    }

    // Normal setup: display name only
    return (
      <div className="panel">
        <PanelHeader icon={Users} title="Team Projects" />
        <StatusBanner status="" error={team.configError || team.error || ""} />
        {showSetupForm ? (
          <div className="panelContent">
            {validationError && <StatusBanner status="" error={validationError} />}
            <div className="formGroup">
              <label htmlFor="displayName">Your display name</label>
              <input
                id="displayName"
                type="text"
                placeholder="Your name (e.g., Alice)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
              />
            </div>
            <div className="formActions">
              <button
                type="button"
                className="button buttonPrimary"
                onClick={handleSaveDisplayName}
                disabled={team.isLoadingConfig}
              >
                {team.isLoadingConfig ? <Loader2 size={16} className="spin" /> : "Continue"}
              </button>
              <button
                type="button"
                className="button buttonSecondary"
                onClick={() => setShowSetupForm(false)}
              >
                Cancel
              </button>
            </div>
            {showAdvancedSetup && (
              <>
                <div className="formGroup">
                  <label htmlFor="supabaseUrl">Supabase URL</label>
                  <input
                    id="supabaseUrl"
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="supabaseAnonKey">Supabase Anon Key</label>
                  <input
                    id="supabaseAnonKey"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formActions">
                  <button
                    type="button"
                    className="button buttonPrimary"
                    onClick={handleSaveConfig}
                    disabled={team.isLoadingConfig}
                  >
                    {team.isLoadingConfig ? <Loader2 size={16} className="spin" /> : "Save"}
                  </button>
                </div>
              </>
            )}
            {!showAdvancedSetup && (
              <button
                type="button"
                className="button buttonSecondary"
                onClick={() => setShowAdvancedSetup(true)}
              >
                Advanced self-hosted backend
              </button>
            )}
          </div>
        ) : (
          <div className="panelContent">
            <EmptyState
              icon={Users}
              title="Team Projects"
              description="Enter your display name to start collaborating on shared projects and tasks."
            />
            <button
              type="button"
              className="button buttonPrimary"
              onClick={() => setShowSetupForm(true)}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    );
  }

  // Workspace state: configured but no active workspace
  if (!team.activeWorkspace) {
    return (
      <div className="panel">
        <PanelHeader icon={Users} title="Team Projects" />
        <StatusBanner status="" error={team.error || ""} />
        <div className="panelContent">
          {team.workspaces.length > 0 ? (
            <div className="workspaceList">
              <h3>Your Workspaces</h3>
              {team.workspaces.map((workspace) => (
                <div key={workspace.id} className="workspaceItem">
                  <div className="workspaceInfo">
                    <div className="workspaceName">{workspace.name}</div>
                    <div className="workspaceKey">Invite code: {workspace.workspaceKey}</div>
                  </div>
                  <button
                    type="button"
                    className="button buttonSecondary"
                    onClick={() => void team.setWorkspaceActive(workspace.id)}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No Workspaces"
              description="Create a new workspace or join an existing one using a workspace key."
            />
          )}
          <div className="workspaceActions">
            {validationError && <StatusBanner status="" error={validationError} />}
            {showCreateWorkspace ? (
              <div className="formGroup">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="input"
                />
                <div className="formActions">
                  <button
                    type="button"
                    className="button buttonPrimary"
                    onClick={handleCreateWorkspace}
                    disabled={team.isLoadingWorkspaces}
                  >
                    {team.isLoadingWorkspaces ? <Loader2 size={16} className="spin" /> : "Create"}
                  </button>
                  <button
                    type="button"
                    className="button buttonSecondary"
                    onClick={() => setShowCreateWorkspace(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : showJoinWorkspace ? (
              <div className="formGroup">
                <input
                  type="text"
                  placeholder="Workspace key (16 characters)"
                  value={workspaceKey}
                  onChange={(e) => setWorkspaceKey(e.target.value)}
                  className="input"
                  maxLength={16}
                />
                <div className="formActions">
                  <button
                    type="button"
                    className="button buttonPrimary"
                    onClick={handleJoinWorkspace}
                    disabled={team.isLoadingWorkspaces}
                  >
                    {team.isLoadingWorkspaces ? <Loader2 size={16} className="spin" /> : "Join"}
                  </button>
                  <button
                    type="button"
                    className="button buttonSecondary"
                    onClick={() => setShowJoinWorkspace(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="formActions">
                <button
                  type="button"
                  className="button buttonPrimary"
                  onClick={() => setShowCreateWorkspace(true)}
                >
                  <Plus size={16} /> Create Workspace
                </button>
                <button
                  type="button"
                  className="button buttonSecondary"
                  onClick={() => setShowJoinWorkspace(true)}
                >
                  <Key size={16} /> Join Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Project state: active workspace but no projects
  if (team.projects.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Users} title={`Projects: ${team.activeWorkspace?.name || "Unknown"}`} />
        <StatusBanner status="" error={team.error || ""} />
        <div className="panelContent">
          <div className="workspaceContext">
            <div className="workspaceContextInfo">
              <span className="workspaceContextLabel">Workspace:</span>
              <span className="workspaceContextName">{team.activeWorkspace?.name}</span>
              <span className="workspaceContextKey">Invite code: {team.activeWorkspace?.workspaceKey}</span>
            </div>
            <button
              type="button"
              className="button buttonSecondary buttonSmall"
              onClick={() => setShowSwitchWorkspace(true)}
            >
              Switch Workspace
            </button>
          </div>
          {showSwitchWorkspace && (
            <div className="workspaceSwitchForm">
              <h4>Switch Workspace</h4>
              {team.workspaces.map((workspace) => (
                <div key={workspace.id} className="workspaceSwitchItem">
                  <div className="workspaceSwitchInfo">
                    <span className="workspaceSwitchName">{workspace.name}</span>
                    <span className="workspaceSwitchKey">{workspace.workspaceKey}</span>
                  </div>
                  {workspace.id !== team.activeWorkspace?.id && (
                    <button
                      type="button"
                      className="button buttonSecondary buttonSmall"
                      onClick={() => {
                        void team.setWorkspaceActive(workspace.id);
                        setShowSwitchWorkspace(false);
                      }}
                    >
                      Switch
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="button buttonSecondary buttonSmall"
                onClick={() => setShowSwitchWorkspace(false)}
              >
                Cancel
              </button>
            </div>
          )}
          {validationError && <StatusBanner status="" error={validationError} />}
          <EmptyState
            icon={Users}
            title="No Projects"
            description="Create a project to organize your team tasks."
          />
          {showCreateProject ? (
            <div className="formGroup">
              <input
                type="text"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="input"
              />
              <div className="formActions">
                <button
                  type="button"
                  className="button buttonPrimary"
                  onClick={handleCreateProject}
                  disabled={team.isLoadingProjects}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="button buttonSecondary"
                  onClick={() => setShowCreateProject(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button buttonPrimary"
              onClick={() => setShowCreateProject(true)}
            >
              Create Project
            </button>
          )}
        </div>
      </div>
    );
  }

  // Tasks state: projects and tasks exist
  return (
    <div className="panel">
      <PanelHeader icon={Users} title={`Projects: ${team.activeWorkspace?.name || "Unknown"}`} />
      <StatusBanner status="" error={team.error || ""} />
      <div className="panelContent">
        <div className="workspaceContext">
          <div className="workspaceContextInfo">
            <span className="workspaceContextLabel">Workspace:</span>
            <span className="workspaceContextName">{team.activeWorkspace?.name}</span>
            <span className="workspaceContextKey">Key: {team.activeWorkspace?.workspaceKey}</span>
          </div>
          <button
            type="button"
            className="button buttonSecondary buttonSmall"
            onClick={() => setShowSwitchWorkspace(true)}
          >
            Switch Workspace
          </button>
        </div>
        {showSwitchWorkspace && (
          <div className="workspaceSwitchForm">
            <h4>Switch Workspace</h4>
            {team.workspaces.map((workspace) => (
              <div key={workspace.id} className="workspaceSwitchItem">
                <div className="workspaceSwitchInfo">
                  <span className="workspaceSwitchName">{workspace.name}</span>
                  <span className="workspaceSwitchKey">{workspace.workspaceKey}</span>
                </div>
                {workspace.id !== team.activeWorkspace?.id && (
                  <button
                    type="button"
                    className="button buttonSecondary buttonSmall"
                    onClick={() => {
                      void team.setWorkspaceActive(workspace.id);
                      setShowSwitchWorkspace(false);
                    }}
                  >
                    Switch
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="button buttonSecondary buttonSmall"
              onClick={() => setShowSwitchWorkspace(false)}
            >
              Cancel
            </button>
          </div>
        )}
        <div className="projectList">
          <div className="projectListHeader">
            <h3>Projects</h3>
            <button
              type="button"
              className="button buttonSecondary"
              onClick={() => setShowCreateProject(true)}
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {team.projects.map((project) => (
            <div key={project.id} className="projectItem">
              <div className="projectName">{project.name}</div>
            </div>
          ))}
        </div>
        {showCreateProject && (
          <div className="formGroup">
            <input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="input"
            />
            <div className="formActions">
              <button
                type="button"
                className="button buttonPrimary"
                onClick={handleCreateProject}
                disabled={team.isLoadingProjects}
              >
                {team.isLoadingProjects ? <Loader2 size={16} className="spin" /> : "Create"}
              </button>
              <button
                type="button"
                className="button buttonSecondary"
                onClick={() => setShowCreateProject(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {validationError && <StatusBanner status="" error={validationError} />}
        <div className="teamTasks">
          <div className="teamTasksHeader">
            <h3>Shared Tasks</h3>
            <button
              type="button"
              className="button buttonSecondary buttonSmall"
              onClick={() => setShowCreateTask(true)}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
          {team.projects.length > 0 && (
            <div className="taskFilters">
              <div className="taskFilter">
                <label htmlFor="projectFilter">Project:</label>
                <select
                  id="projectFilter"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="input inputSmall"
                >
                  <option value="all">All projects</option>
                  {team.projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="taskFilter">
                <label htmlFor="statusFilter">Status:</label>
                <select
                  id="statusFilter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as "open" | "done" | "all")}
                  className="input inputSmall"
                >
                  <option value="open">Open</option>
                  <option value="done">Done</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          )}
          {editingTaskId && (
            <div className="taskEditForm">
              {editValidationError && <StatusBanner status="" error={editValidationError} />}
              <div className="formGroup">
                <label htmlFor="editTaskTitle">Title</label>
                <input
                  id="editTaskTitle"
                  type="text"
                  placeholder="Task title"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskNotes">Notes</label>
                <textarea
                  id="editTaskNotes"
                  placeholder="Task notes"
                  value={editTaskNotes}
                  onChange={(e) => setEditTaskNotes(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskDueAt">Due Date</label>
                <input
                  id="editTaskDueAt"
                  type="datetime-local"
                  value={editTaskDueAt}
                  onChange={(e) => setEditTaskDueAt(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskPriority">Priority</label>
                <select
                  id="editTaskPriority"
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value as "low" | "normal" | "high")}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskRecurrence">Recurrence</label>
                <select
                  id="editTaskRecurrence"
                  value={editTaskRecurrence}
                  onChange={(e) => setEditTaskRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
                  className="input"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskAssignee">Assignee</label>
                <input
                  id="editTaskAssignee"
                  type="text"
                  placeholder="Assignee name"
                  value={editTaskAssigneeDisplayName}
                  onChange={(e) => setEditTaskAssigneeDisplayName(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="editTaskStatus">Status</label>
                <select
                  id="editTaskStatus"
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value as "open" | "done")}
                  className="input"
                >
                  <option value="open">Open</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="formActions">
                <button
                  type="button"
                  className="button buttonPrimary"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="spin" /> : "Save"}
                </button>
                <button
                  type="button"
                  className="button buttonSecondary"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {showCreateTask && (
            <div className="taskCreateForm">
              <div className="formGroup">
                <label htmlFor="taskProject">Project</label>
                <select
                  id="taskProject"
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="input"
                >
                  <option value="">Select a project</option>
                  {team.projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="taskTitle">Title</label>
                <input
                  id="taskTitle"
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="taskNotes">Notes</label>
                <textarea
                  id="taskNotes"
                  placeholder="Task notes"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="taskDueAt">Due Date (optional)</label>
                <input
                  id="taskDueAt"
                  type="datetime-local"
                  value={taskDueAt}
                  onChange={(e) => setTaskDueAt(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formGroup">
                <label htmlFor="taskPriority">Priority</label>
                <select
                  id="taskPriority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as "low" | "normal" | "high")}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="taskRecurrence">Recurrence</label>
                <select
                  id="taskRecurrence"
                  value={taskRecurrence}
                  onChange={(e) => setTaskRecurrence(e.target.value as "none" | "daily" | "weekly" | "monthly")}
                  className="input"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="taskAssigneeDisplayName">Assignee (optional)</label>
                <input
                  id="taskAssigneeDisplayName"
                  type="text"
                  placeholder="Assignee display name"
                  value={taskAssigneeDisplayName}
                  onChange={(e) => setTaskAssigneeDisplayName(e.target.value)}
                  className="input"
                />
              </div>
              <div className="formActions">
                <button
                  type="button"
                  className="button buttonPrimary"
                  onClick={handleCreateTask}
                  disabled={team.isLoadingTasks}
                >
                  {team.isLoadingTasks ? <Loader2 size={16} className="spin" /> : "Create Task"}
                </button>
                <button
                  type="button"
                  className="button buttonSecondary"
                  onClick={() => setShowCreateTask(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={Users}
              title={team.tasks.length === 0 ? "No Tasks" : "No Tasks Match Filters"}
              description={team.tasks.length === 0 ? "Create tasks to collaborate with your team." : "No tasks match these filters."}
            />
          ) : (
            <div className="teamTaskList">
              {filteredTasks.map((task) => {
                const project = projectMap.get(task.projectId);
                return (
                  <div key={task.id} className="teamTaskItem">
                    <div className="taskInfo">
                      <div className="taskTitle">{task.title}</div>
                      <div className="taskMeta">
                        {project && <span className="taskProject">{project.name}</span>}
                        {task.assigneeDisplayName && <span className="taskAssignee">{task.assigneeDisplayName}</span>}
                        <span className={`taskPriority ${task.priority}`}>{task.priority}</span>
                        {task.dueAt && <span className="taskDue">{new Date(task.dueAt).toLocaleDateString()}</span>}
                        <span className={`taskStatus ${task.status}`}>{task.status}</span>
                      </div>
                    </div>
                    <div className="taskActions">
                      <button
                        type="button"
                        className="button buttonSecondary buttonSmall"
                        onClick={() => handleEditTask(task)}
                        title="Edit task"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="button buttonSecondary buttonSmall"
                        onClick={() => void handleToggleTaskStatus(task)}
                        title={task.status === "open" ? "Mark as done" : "Mark as open"}
                      >
                        {task.status === "open" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

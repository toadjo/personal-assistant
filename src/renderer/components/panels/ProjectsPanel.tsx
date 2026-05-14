/**
 * Projects panel for team mode.
 *
 * Shows team setup form, workspace controls, project list, and shared tasks.
 * Uses existing panel, button, select, and status banner patterns.
 */

import { useEffect, useRef, useState } from "react";
import { Users, Plus, Key, Loader2, CheckCircle2, Circle } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { StatusBanner } from "../layout/StatusBanner";
import { EmptyState } from "../ui/EmptyState";
import { useTeamState } from "../../hooks/team/useTeamState";
import type { TeamProjectTask } from "../../../shared/team/types";
import { validateWorkspaceKey } from "../../../shared/team/keyValidation";

export function ProjectsPanel(): JSX.Element {
  const team = useTeamState();
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
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    void team.loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load workspaces when config is set
  useEffect(() => {
    if (team.config?.configured) {
      void team.loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.config?.configured]);

  // Load projects when active workspace is set
  useEffect(() => {
    if (team.activeWorkspace) {
      void team.loadProjects();
      void team.loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace]);

  // Start realtime when an active workspace is visible; debounce refreshes and stop on unmount.
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimePendingTablesRef = useRef<Set<"projects" | "tasks">>(new Set());
  useEffect(() => {
    const activeId = team.activeWorkspace?.id ?? null;
    if (!activeId) {
      return;
    }
    let cancelled = false;
    void window.assistantApi.teamRealtimeStart().catch(() => {
      // realtime is best-effort; silent failure keeps the panel functional
    });
    const off = window.assistantApi.onTeamDataUpdated((_event, payload) => {
      if (cancelled) return;
      if (payload.workspaceId !== activeId) return;
      // Accumulate tables during debounce window
      payload.tables.forEach((table) => realtimePendingTablesRef.current.add(table as "projects" | "tasks"));
      // Reset debounce timer
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null;
        const tablesToRefresh = realtimePendingTablesRef.current;
        realtimePendingTablesRef.current = new Set();
        if (tablesToRefresh.has("projects")) {
          void team.loadProjects();
        }
        if (tablesToRefresh.has("tasks")) {
          void team.loadTasks();
        }
      }, 200);
    });
    return () => {
      cancelled = true;
      off();
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = null;
      }
      realtimePendingTablesRef.current.clear();
      void window.assistantApi.teamRealtimeStop().catch(() => {
        /* best-effort */
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace?.id]);

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
    } catch {
      // Error handled by team.error
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

  // Setup state: team mode not configured
  if (!team.config?.configured) {
    return (
      <div className="panel">
        <PanelHeader icon={Users} title="Team Projects" />
        <StatusBanner status="" error={team.configError || team.error || ""} />
        {showSetupForm ? (
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
                onClick={() => setShowSetupForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="panelContent">
            <EmptyState
              icon={Users}
              title="Team Projects Not Configured"
              description="Configure Supabase credentials to enable team collaboration on projects and tasks."
            />
            <button
              type="button"
              className="button buttonPrimary"
              onClick={() => setShowSetupForm(true)}
            >
              Configure Team Mode
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
                    <div className="workspaceKey">Key: {workspace.workspaceKey}</div>
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
          {team.tasks.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Tasks"
              description="Create tasks to collaborate with your team."
            />
          ) : (
            <div className="teamTaskList">
              {team.tasks.map((task) => (
                <div key={task.id} className="teamTaskItem">
                  <div className="taskInfo">
                    <div className="taskTitle">{task.title}</div>
                    <div className="taskMeta">
                      {task.projectId && <span className="taskProject">Project: {team.projects.find(p => p.id === task.projectId)?.name}</span>}
                      {task.assigneeDisplayName && <span className="taskAssignee">Assignee: {task.assigneeDisplayName}</span>}
                      <span className={`taskStatus ${task.status}`}>{task.status}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button buttonSecondary buttonSmall"
                    onClick={() => void handleToggleTaskStatus(task)}
                    title={task.status === "open" ? "Mark as done" : "Mark as open"}
                  >
                    {task.status === "open" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

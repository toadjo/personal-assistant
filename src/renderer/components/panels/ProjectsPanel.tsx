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
import { requireAssistantApi } from "../../lib/assistantApi";
import { TaskEditor } from "../team/TaskEditor";
import { TaskCreateForm } from "../team/TaskCreateForm";
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
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"open" | "done" | "all">("open");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

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
    if (selectedProjectId !== "all" && !team.projects.find((p) => p.id === selectedProjectId)) {
      setSelectedProjectId("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.projects]);

  // Close editor if selected task no longer exists
  useEffect(() => {
    if (editingTaskId && !team.tasks.find((t) => t.id === editingTaskId)) {
      setEditingTaskId(null);
    }
  }, [team.tasks, editingTaskId]);

  // Start realtime when using internal team state only (external team handles its own realtime)
  useTeamRealtime(team, { projects: true, tasks: true, enabled: !externalTeam });

  const handleSaveConfig = async () => {
    setValidationError(null);
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim() || !displayName.trim()) {
      setValidationError("Enter your name, team service URL, and public key.");
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
      const api = requireAssistantApi();
      await api.teamSetDisplayName({ displayName });
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

  const handleToggleTaskStatus = async (task: TeamProjectTask) => {
    const newStatus = task.status === "open" ? "done" : "open";
    await team.updateTask({ ...task, status: newStatus });
  };

  const handleEditTask = (task: TeamProjectTask) => {
    setEditingTaskId(task.id);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
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
    return new Map(team.projects.map((p) => [p.id, p]));
  }, [team.projects]);

  // Setup state: team mode not configured
  if (!team.config?.configured) {
    if (team.config?.backendMode === "unavailable") {
      return (
        <div className="panel">
          <PanelHeader icon={Users} title="Team Projects" />
          <StatusBanner status="" error={team.configError || team.error || ""} />
          <div className="panelContent">
            {showSetupForm ? (
              <div className="teamSetupGuide">
                <EmptyState
                  icon={Users}
                  title="Connect Team Projects"
                  description="Enter your name and the shared team service details. Ask the person who created the team space for these two connection values."
                />
                {validationError && <StatusBanner status="" error={validationError} />}
                <div className="formGroup">
                  <label htmlFor="displayName">Your display name</label>
                  <input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="supabaseUrl">Team service URL</label>
                  <input
                    id="supabaseUrl"
                    type="text"
                    placeholder="https://your-team-service.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="input"
                  />
                  <p className="formHelp">This is the shared team service address.</p>
                </div>
                <div className="formGroup">
                  <label htmlFor="supabaseAnonKey">Team service public key</label>
                  <input
                    id="supabaseAnonKey"
                    type="password"
                    placeholder="Paste the public key from your team service"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="input"
                  />
                  <p className="formHelp">This is safe for app users to enter. It is not an admin password.</p>
                </div>
                <div className="formActions">
                  <button
                    type="button"
                    className="button buttonPrimary"
                    onClick={handleSaveConfig}
                    disabled={team.isLoadingConfig}
                  >
                    {team.isLoadingConfig ? <Loader2 size={16} className="spin" /> : "Save and continue"}
                  </button>
                  <button
                    type="button"
                    className="button buttonSecondary"
                    onClick={() => {
                      setShowSetupForm(false);
                      setValidationError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <details className="teamSetupDetails">
                  <summary>Setting up a new team service</summary>
                  <ol>
                    <li>Create a free Supabase project.</li>
                    <li>Run the Team Projects schema from the app documentation.</li>
                    <li>Paste the project URL and public anon key here.</li>
                    <li>Create a workspace, then share its invite code with your team.</li>
                  </ol>
                </details>
              </div>
            ) : (
              <>
                <EmptyState
                  icon={Users}
                  title="Set up Team Projects"
                  description="Create and join shared workspaces from this app. You will need your name and your team's shared service details."
                />
                <div className="teamSetupSteps" aria-label="Team Projects setup steps">
                  <div className="teamSetupStep">
                    <span className="teamSetupStepNumber">1</span>
                    <span>Enter your display name.</span>
                  </div>
                  <div className="teamSetupStep">
                    <span className="teamSetupStepNumber">2</span>
                    <span>Paste the team service URL and public key from your team owner.</span>
                  </div>
                  <div className="teamSetupStep">
                    <span className="teamSetupStepNumber">3</span>
                    <span>Create a workspace or join one with an invite code.</span>
                  </div>
                </div>
                <button type="button" className="button buttonPrimary" onClick={() => setShowSetupForm(true)}>
                  Start setup
                </button>
              </>
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
              <button type="button" className="button buttonSecondary" onClick={() => setShowSetupForm(false)}>
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
              <button type="button" className="button buttonSecondary" onClick={() => setShowAdvancedSetup(true)}>
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
            <button type="button" className="button buttonPrimary" onClick={() => setShowSetupForm(true)}>
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
                  <button type="button" className="button buttonSecondary" onClick={() => setShowJoinWorkspace(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="formActions">
                <button type="button" className="button buttonPrimary" onClick={() => setShowCreateWorkspace(true)}>
                  <Plus size={16} /> Create Workspace
                </button>
                <button type="button" className="button buttonSecondary" onClick={() => setShowJoinWorkspace(true)}>
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
          <EmptyState icon={Users} title="No Projects" description="Create a project to organize your team tasks." />
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
                <button type="button" className="button buttonSecondary" onClick={() => setShowCreateProject(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="button buttonPrimary" onClick={() => setShowCreateProject(true)}>
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
            <button type="button" className="button buttonSecondary" onClick={() => setShowCreateProject(true)}>
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
              <button type="button" className="button buttonSecondary" onClick={() => setShowCreateProject(false)}>
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
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
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
            <TaskEditor
              task={team.tasks.find((t) => t.id === editingTaskId)!}
              team={team}
              onCancel={handleCancelEdit}
            />
          )}
          {showCreateTask && (
            <TaskCreateForm
              team={team}
              projects={team.projects}
              onCancel={() => setShowCreateTask(false)}
            />
          )}
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={Users}
              title={team.tasks.length === 0 ? "No Tasks" : "No Tasks Match Filters"}
              description={
                team.tasks.length === 0
                  ? "Create tasks to collaborate with your team."
                  : "No tasks match these filters."
              }
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

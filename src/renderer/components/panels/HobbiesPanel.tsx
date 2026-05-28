import { useEffect, useState, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Plus, Trash2, CheckCircle } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../life-areas/LoadingState";
import { SummaryCard } from "../life-areas/SummaryCard";
import { LifeAreaPanelProps } from "../life-areas/types";
import { formatDate } from "../../lib/dateFormat";
import { requireAssistantApi } from "../../lib/assistantApi";
import { workspaceQueryKeys } from "../../lib/query/keys";
import { fetchHobbiesAll } from "../../lib/query/lifeAreas";
import type { Hobby, HobbySession, HobbyProject, HobbyMilestone, HobbySupply, HobbySummary, HobbyStatus, HobbyProjectStatus } from "../../../shared/types";

export const HobbiesPanel = memo(function HobbiesPanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: LifeAreaPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showHobbyForm, setShowHobbyForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  
  const [hobbyForm, setHobbyForm] = useState({
    name: "",
    category: "",
    description: "",
    status: "active" as HobbyStatus
  });
  
  const [sessionForm, setSessionForm] = useState({
    hobbyId: "",
    date: new Date().toISOString().split('T')[0] || "",
    durationMinutes: 30,
    notes: "",
    mood: "",
    energy: null as number | null,
    progressRating: null as number | null
  });
  
  const [projectForm, setProjectForm] = useState({
    hobbyId: "",
    name: "",
    description: "",
    status: "active" as HobbyProjectStatus,
    targetDate: "",
    completedAt: null as string | null
  });
  
  const [milestoneForm, setMilestoneForm] = useState({
    projectId: "",
    name: "",
    description: "",
    targetDate: "",
    completedAt: null as string | null
  });
  
  const [supplyForm, setSupplyForm] = useState({
    hobbyId: "",
    projectId: null as string | null,
    name: "",
    type: "",
    cost: null as number | null,
    purchaseDate: "",
    source: "",
    notes: ""
  });

  const api = requireAssistantApi();
  const hobbiesAllQuery = useQuery({ queryKey: workspaceQueryKeys.hobbies.all(), queryFn: fetchHobbiesAll });
  const hobbies: Hobby[] = hobbiesAllQuery.data?.hobbies ?? [];
  const sessions: HobbySession[] = hobbiesAllQuery.data?.sessions ?? [];
  const projects: HobbyProject[] = hobbiesAllQuery.data?.projects ?? [];
  const milestones: HobbyMilestone[] = hobbiesAllQuery.data?.milestones ?? [];
  const supplies: HobbySupply[] = hobbiesAllQuery.data?.supplies ?? [];
  const summary: HobbySummary | null = hobbiesAllQuery.data?.summary ?? null;
  const isLoading = hobbiesAllQuery.isLoading;

  useEffect(() => {
    if (hobbiesAllQuery.error) {
      onError("Failed to load hobbies data");
    }
  }, [hobbiesAllQuery.error, onError]);

  async function handleCreateHobby() {
    if (!api) return;
    try {
      await api.createHobby(hobbyForm);
      setShowHobbyForm(false);
      setHobbyForm({ name: "", category: "", description: "", status: "active" });
      onShowSuccess?.("Hobby created successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to create hobby");
    }
  }

  async function handleDeleteHobby(id: string) {
    if (!api) return;
    try {
      await api.deleteHobby(id);
      onShowSuccess?.("Hobby deleted successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to delete hobby");
    }
  }

  async function handleCreateSession() {
    if (!api) return;
    try {
      await api.createHobbySession(sessionForm);
      setShowSessionForm(false);
      setSessionForm({
        hobbyId: "",
        date: new Date().toISOString().split('T')[0] || "",
        durationMinutes: 30,
        notes: "",
        mood: "",
        energy: null,
        progressRating: null
      });
      onShowSuccess?.("Session created successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to create session");
    }
  }

  async function handleDeleteSession(id: string) {
    if (!api) return;
    try {
      await api.deleteHobbySession(id);
      onShowSuccess?.("Session deleted successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to delete session");
    }
  }

  async function handleCreateProject() {
    if (!api) return;
    try {
      await api.createHobbyProject(projectForm);
      setShowProjectForm(false);
      setProjectForm({
        hobbyId: "",
        name: "",
        description: "",
        status: "active",
        targetDate: "",
        completedAt: null
      });
      onShowSuccess?.("Project created successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to create project");
    }
  }

  async function handleCompleteProject(id: string) {
    if (!api) return;
    try {
      await api.completeHobbyProject(id);
      onShowSuccess?.("Project completed successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to complete project");
    }
  }

  async function handleDeleteProject(id: string) {
    if (!api) return;
    try {
      await api.deleteHobbyProject(id);
      onShowSuccess?.("Project deleted successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to delete project");
    }
  }

  async function handleCreateMilestone() {
    if (!api) return;
    try {
      await api.createHobbyMilestone(milestoneForm);
      setShowMilestoneForm(false);
      setMilestoneForm({
        projectId: "",
        name: "",
        description: "",
        targetDate: "",
        completedAt: null
      });
      onShowSuccess?.("Milestone created successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to create milestone");
    }
  }

  async function handleCompleteMilestone(id: string) {
    if (!api) return;
    try {
      await api.completeHobbyMilestone(id);
      onShowSuccess?.("Milestone completed successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to complete milestone");
    }
  }

  async function handleDeleteMilestone(id: string) {
    if (!api) return;
    try {
      await api.deleteHobbyMilestone(id);
      onShowSuccess?.("Milestone deleted successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to delete milestone");
    }
  }

  async function handleCreateSupply() {
    if (!api) return;
    try {
      await api.createHobbySupply(supplyForm);
      setShowSupplyForm(false);
      setSupplyForm({
        hobbyId: "",
        projectId: null,
        name: "",
        type: "",
        cost: null,
        purchaseDate: "",
        source: "",
        notes: ""
      });
      onShowSuccess?.("Supply created successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to create supply");
    }
  }

  async function handleDeleteSupply(id: string) {
    if (!api) return;
    try {
      await api.deleteHobbySupply(id);
      onShowSuccess?.("Supply deleted successfully");
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.hobbies.root });
    } catch {
      onError("Failed to delete supply");
    }
  }

  if (isLoading) {
    return (
      <section className="panel" aria-labelledby="hobbies-panel-heading">
        <PanelHeader icon={Palette} title="Hobbies" />
        <div className="panelContent">
          <LoadingState message="Loading hobbies data..." />
        </div>
      </section>
    );
  }

  if (hobbies.length === 0) {
    return (
      <section className="panel" aria-labelledby="hobbies-panel-heading">
        <PanelHeader icon={Palette} title="Hobbies" />
        <div className="panelContent">
          <EmptyState
            icon={Palette}
            title="No hobbies yet"
            description="Start tracking your hobbies and personal progress"
          />
          <button onClick={() => setShowHobbyForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Create Hobby
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="hobbies-panel-heading">
      <PanelHeader icon={Palette} title="Hobbies" />
      <div className="panelContent">
        {summary && (
          <div className="summaryGrid">
            <SummaryCard label="Active Hobbies" value={summary.activeHobbies} />
            <SummaryCard label="Sessions This Month" value={summary.sessionsThisMonth} />
            <SummaryCard label="Open Projects" value={summary.openProjects} />
            <SummaryCard label="Open Milestones" value={summary.openMilestones} />
            <SummaryCard label="Recent Sessions" value={summary.recentSessions} />
          </div>
        )}

        <div className="sectionHeader">
          <h3>Hobbies</h3>
          <button onClick={() => setShowHobbyForm(true)} className="btn btn-sm btn-primary">
            <Plus className="w-4 h-4" /> Add Hobby
          </button>
        </div>

        <div className="list">
          {hobbies.map((hobby) => (
            <div key={hobby.id} className="listItem">
              <div className="listItemContent">
                <div className="listItemTitle">{hobby.name}</div>
                <div className="listItemSubtitle">{hobby.category} • {hobby.status}</div>
                {hobby.description && <div className="listItemDescription">{hobby.description}</div>}
              </div>
              <button onClick={() => handleDeleteHobby(hobby.id)} className="btn btn-sm btn-danger" aria-label="Delete hobby">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="sectionHeader">
          <h3>Recent Sessions</h3>
          <button onClick={() => setShowSessionForm(true)} className="btn btn-sm btn-primary">
            <Plus className="w-4 h-4" /> Log Session
          </button>
        </div>

        <div className="list">
          {sessions.slice(0, 10).map((session) => (
            <div key={session.id} className="listItem">
              <div className="listItemContent">
                <div className="listItemTitle">{formatDate(session.date)} • {session.durationMinutes} min</div>
                {session.mood && <div className="listItemSubtitle">Mood: {session.mood}</div>}
                {session.progressRating && <div className="listItemSubtitle">Progress: {session.progressRating}/5</div>}
                {session.notes && <div className="listItemDescription">{session.notes}</div>}
              </div>
              <button onClick={() => handleDeleteSession(session.id)} className="btn btn-sm btn-danger" aria-label="Delete session">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="sectionHeader">
          <h3>Projects</h3>
          <button onClick={() => setShowProjectForm(true)} className="btn btn-sm btn-primary">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        </div>

        <div className="list">
          {projects.map((project) => (
            <div key={project.id} className="listItem">
              <div className="listItemContent">
                <div className="listItemTitle">{project.name}</div>
                <div className="listItemSubtitle">{project.status}</div>
                {project.description && <div className="listItemDescription">{project.description}</div>}
                {project.targetDate && <div className="listItemSubtitle">Target: {formatDate(project.targetDate)}</div>}
              </div>
              <div className="listItemActions">
                {project.status === "active" && (
                  <button onClick={() => handleCompleteProject(project.id)} className="btn btn-sm btn-success">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDeleteProject(project.id)} className="btn btn-sm btn-danger" aria-label="Delete project">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="sectionHeader">
          <h3>Milestones</h3>
          <button onClick={() => setShowMilestoneForm(true)} className="btn btn-sm btn-primary">
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
        </div>

        <div className="list">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="listItem">
              <div className="listItemContent">
                <div className="listItemTitle">{milestone.name}</div>
                {milestone.targetDate && <div className="listItemSubtitle">Target: {formatDate(milestone.targetDate)}</div>}
                {milestone.description && <div className="listItemDescription">{milestone.description}</div>}
              </div>
              <div className="listItemActions">
                {!milestone.completedAt && (
                  <button onClick={() => handleCompleteMilestone(milestone.id)} className="btn btn-sm btn-success">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDeleteMilestone(milestone.id)} className="btn btn-sm btn-danger" aria-label="Delete milestone">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="sectionHeader">
          <h3>Supplies & Resources</h3>
          <button onClick={() => setShowSupplyForm(true)} className="btn btn-sm btn-primary">
            <Plus className="w-4 h-4" /> Add Supply
          </button>
        </div>

        <div className="list">
          {supplies.map((supply) => (
            <div key={supply.id} className="listItem">
              <div className="listItemContent">
                <div className="listItemTitle">{supply.name}</div>
                <div className="listItemSubtitle">{supply.type}</div>
                {supply.cost && <div className="listItemSubtitle">Cost: ${(supply.cost / 100).toFixed(2)}</div>}
                {supply.source && <div className="listItemSubtitle">Source: {supply.source}</div>}
                {supply.notes && <div className="listItemDescription">{supply.notes}</div>}
              </div>
              <button onClick={() => handleDeleteSupply(supply.id)} className="btn btn-sm btn-danger" aria-label="Delete supply">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Hobby Form Modal */}
        {showHobbyForm && (
          <div className="modal">
            <div className="modalContent">
              <h3>Create Hobby</h3>
              <div className="formGroup">
                <label>Name</label>
                <input
                  type="text"
                  value={hobbyForm.name}
                  onChange={(e) => setHobbyForm({ ...hobbyForm, name: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Category</label>
                <input
                  type="text"
                  value={hobbyForm.category}
                  onChange={(e) => setHobbyForm({ ...hobbyForm, category: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Description</label>
                <textarea
                  value={hobbyForm.description}
                  onChange={(e) => setHobbyForm({ ...hobbyForm, description: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Status</label>
                <select
                  value={hobbyForm.status}
                  onChange={(e) => setHobbyForm({ ...hobbyForm, status: e.target.value as HobbyStatus })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="modalActions">
                <button onClick={() => setShowHobbyForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreateHobby} className="btn btn-primary">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Session Form Modal */}
        {showSessionForm && (
          <div className="modal">
            <div className="modalContent">
              <h3>Log Session</h3>
              <div className="formGroup">
                <label>Hobby</label>
                <select
                  value={sessionForm.hobbyId}
                  onChange={(e) => setSessionForm({ ...sessionForm, hobbyId: e.target.value })}
                >
                  <option value="">Select hobby</option>
                  {hobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>{hobby.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Date</label>
                <input
                  type="date"
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={sessionForm.durationMinutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, durationMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="formGroup">
                <label>Notes</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Mood</label>
                <input
                  type="text"
                  value={sessionForm.mood}
                  onChange={(e) => setSessionForm({ ...sessionForm, mood: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Energy (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={sessionForm.energy || ""}
                  onChange={(e) => setSessionForm({ ...sessionForm, energy: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="formGroup">
                <label>Progress Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={sessionForm.progressRating || ""}
                  onChange={(e) => setSessionForm({ ...sessionForm, progressRating: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="modalActions">
                <button onClick={() => setShowSessionForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreateSession} className="btn btn-primary">Log Session</button>
              </div>
            </div>
          </div>
        )}

        {/* Project Form Modal */}
        {showProjectForm && (
          <div className="modal">
            <div className="modalContent">
              <h3>Create Project</h3>
              <div className="formGroup">
                <label>Hobby</label>
                <select
                  value={projectForm.hobbyId}
                  onChange={(e) => setProjectForm({ ...projectForm, hobbyId: e.target.value })}
                >
                  <option value="">Select hobby</option>
                  {hobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>{hobby.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Name</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Status</label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as HobbyProjectStatus })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Target Date</label>
                <input
                  type="date"
                  value={projectForm.targetDate}
                  onChange={(e) => setProjectForm({ ...projectForm, targetDate: e.target.value })}
                />
              </div>
              <div className="modalActions">
                <button onClick={() => setShowProjectForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreateProject} className="btn btn-primary">Create Project</button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Form Modal */}
        {showMilestoneForm && (
          <div className="modal">
            <div className="modalContent">
              <h3>Create Milestone</h3>
              <div className="formGroup">
                <label>Project</label>
                <select
                  value={milestoneForm.projectId}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Name</label>
                <input
                  type="text"
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Description</label>
                <textarea
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Target Date</label>
                <input
                  type="date"
                  value={milestoneForm.targetDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                />
              </div>
              <div className="modalActions">
                <button onClick={() => setShowMilestoneForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreateMilestone} className="btn btn-primary">Create Milestone</button>
              </div>
            </div>
          </div>
        )}

        {/* Supply Form Modal */}
        {showSupplyForm && (
          <div className="modal">
            <div className="modalContent">
              <h3>Add Supply</h3>
              <div className="formGroup">
                <label>Hobby</label>
                <select
                  value={supplyForm.hobbyId}
                  onChange={(e) => setSupplyForm({ ...supplyForm, hobbyId: e.target.value })}
                >
                  <option value="">Select hobby</option>
                  {hobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>{hobby.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Project (optional)</label>
                <select
                  value={supplyForm.projectId || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, projectId: e.target.value || null })}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Name</label>
                <input
                  type="text"
                  value={supplyForm.name}
                  onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Type</label>
                <input
                  type="text"
                  value={supplyForm.type}
                  onChange={(e) => setSupplyForm({ ...supplyForm, type: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Cost (cents)</label>
                <input
                  type="number"
                  value={supplyForm.cost || ""}
                  onChange={(e) => setSupplyForm({ ...supplyForm, cost: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="formGroup">
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={supplyForm.purchaseDate}
                  onChange={(e) => setSupplyForm({ ...supplyForm, purchaseDate: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Source</label>
                <input
                  type="text"
                  value={supplyForm.source}
                  onChange={(e) => setSupplyForm({ ...supplyForm, source: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Notes</label>
                <textarea
                  value={supplyForm.notes}
                  onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
                />
              </div>
              <div className="modalActions">
                <button onClick={() => setShowSupplyForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreateSupply} className="btn btn-primary">Add Supply</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
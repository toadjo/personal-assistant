import { useState, useEffect, memo } from "react";
import { Users, Plus, Trash2, Calendar, CheckCircle, AlertCircle, Phone, Mail, Star } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../life-areas/LoadingState";
import { SummaryCard } from "../life-areas/SummaryCard";
import { LifeAreaPanelProps } from "../life-areas/types";
import { formatDate, formatDateTime } from "../../lib/dateFormat";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { FamilyMember, FamilyOccasion, FamilyObligation, FamilySummary, FamilyOccasionType, FamilyObligationType, FamilyPriority } from "../../../shared/types";

export const FamilyPanel = memo(function FamilyPanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: LifeAreaPanelProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [occasions, setOccasions] = useState<FamilyOccasion[]>([]);
  const [obligations, setObligations] = useState<FamilyObligation[]>([]);
  const [summary, setSummary] = useState<FamilySummary | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showOccasionForm, setShowOccasionForm] = useState(false);
  const [showObligationForm, setShowObligationForm] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    address: "",
    preferredContactMethod: "any",
    notes: "",
    isImportant: false
  });
  const [occasionForm, setOccasionForm] = useState({
    memberId: "",
    type: "birthday" as FamilyOccasionType,
    title: "",
    date: "",
    recurrence: "yearly",
    remindDaysBefore: "7",
    notes: ""
  });
  const [obligationForm, setObligationForm] = useState({
    memberId: "",
    occasionId: "",
    type: "call" as FamilyObligationType,
    title: "",
    dueAt: "",
    priority: "normal" as FamilyPriority,
    notes: ""
  });

  const api = requireAssistantApi();

  async function loadData() {
    setIsLoading(true);
    try {
      const [membersData, summaryData] = await Promise.all([
        api.listFamilyMembers(),
        api.getFamilySummary()
      ]);
      setMembers(membersData);
      setSummary(summaryData);
      if (membersData.length > 0 && !selectedMemberId) {
        setSelectedMemberId(membersData[0]?.id ?? null);
      }
    } catch {
      onError("Failed to load family data");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMemberData(memberId: string) {
    setIsLoading(true);
    try {
      const [occasionsData, obligationsData] = await Promise.all([
        api.listFamilyOccasions(memberId),
        api.listFamilyObligations(memberId)
      ]);
      setOccasions(occasionsData);
      setObligations(obligationsData);
    } catch {
      onError("Failed to load member data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      void loadMemberData(selectedMemberId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId]);

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createFamilyMember({
        name: memberForm.name,
        relationship: memberForm.relationship,
        phone: memberForm.phone || null,
        email: memberForm.email || null,
        address: memberForm.address || null,
        preferredContactMethod: memberForm.preferredContactMethod,
        notes: memberForm.notes,
        isImportant: memberForm.isImportant ? 1 : 0
      });
      setShowMemberForm(false);
      setMemberForm({
        name: "",
        relationship: "",
        phone: "",
        email: "",
        address: "",
        preferredContactMethod: "any",
        notes: "",
        isImportant: false
      });
      onShowSuccess?.("Family member added");
      void loadData();
    } catch {
      onError("Failed to add family member");
    }
  }

  async function handleDeleteMember(id: string) {
    try {
      await api.deleteFamilyMember(id);
      onShowSuccess?.("Family member deleted");
      if (selectedMemberId === id) {
        setSelectedMemberId(null);
      }
      void loadData();
    } catch {
      onError("Failed to delete family member");
    }
  }

  async function handleCreateOccasion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) return;
    try {
      await api.createFamilyOccasion({
        memberId: selectedMemberId,
        type: occasionForm.type,
        title: occasionForm.title,
        date: occasionForm.date,
        recurrence: occasionForm.recurrence,
        remindDaysBefore: parseInt(occasionForm.remindDaysBefore, 10),
        notes: occasionForm.notes
      });
      setShowOccasionForm(false);
      setOccasionForm({
        memberId: "",
        type: "birthday",
        title: "",
        date: "",
        recurrence: "yearly",
        remindDaysBefore: "7",
        notes: ""
      });
      onShowSuccess?.("Occasion added");
      void loadMemberData(selectedMemberId);
    } catch {
      onError("Failed to add occasion");
    }
  }

  async function handleDeleteOccasion(id: string) {
    try {
      await api.deleteFamilyOccasion(id);
      onShowSuccess?.("Occasion deleted");
      if (selectedMemberId) {
        void loadMemberData(selectedMemberId);
      }
    } catch {
      onError("Failed to delete occasion");
    }
  }

  async function handleCreateObligation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) return;
    try {
      await api.createFamilyObligation({
        memberId: selectedMemberId,
        occasionId: obligationForm.occasionId || null,
        type: obligationForm.type,
        title: obligationForm.title,
        dueAt: obligationForm.dueAt || null,
        status: "open",
        priority: obligationForm.priority,
        notes: obligationForm.notes
      });
      setShowObligationForm(false);
      setObligationForm({
        memberId: "",
        occasionId: "",
        type: "call",
        title: "",
        dueAt: "",
        priority: "normal",
        notes: ""
      });
      onShowSuccess?.("Obligation added");
      void loadMemberData(selectedMemberId);
    } catch {
      onError("Failed to add obligation");
    }
  }

  async function handleCompleteObligation(id: string) {
    try {
      await api.completeFamilyObligation(id);
      onShowSuccess?.("Obligation completed");
      if (selectedMemberId) {
        void loadMemberData(selectedMemberId);
      }
    } catch {
      onError("Failed to complete obligation");
    }
  }

  async function handleDeleteObligation(id: string) {
    try {
      await api.deleteFamilyObligation(id);
      onShowSuccess?.("Obligation deleted");
      if (selectedMemberId) {
        void loadMemberData(selectedMemberId);
      }
    } catch {
      onError("Failed to delete obligation");
    }
  }

  if (isLoading && members.length === 0) {
    return <LoadingState message="Loading family data..." />;
  }

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title="Family"
        icon={Users}
        actions={
          <button
            onClick={() => setShowMemberForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        }
      />

      {/* Summary Strip */}
      {summary && (
        <div className="summaryGrid">
          <SummaryCard label="Members" value={summary.totalMembers} />
          <SummaryCard label="Upcoming" value={summary.upcomingOccasions} />
          <SummaryCard label="Open Tasks" value={summary.openObligations} />
          <SummaryCard label="Overdue" value={summary.overdueObligations} />
        </div>
      )}

      {/* Member List */}
      <div className="flex-1 overflow-y-auto p-4">
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add your first family member to get started"
          />
        ) : (
          <div className="space-y-4">
            {/* Members */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Family Members</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMemberId === member.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.isImportant === 1 && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <div className="text-sm text-gray-500">{member.relationship}</div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </span>
                          )}
                          {member.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteMember(member.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Member Details */}
            {selectedMemberId && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Details</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowOccasionForm(true)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Occasion
                    </button>
                    <button
                      onClick={() => setShowObligationForm(true)}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Task
                    </button>
                  </div>
                </div>

                {/* Occasions */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Occasions</h4>
                  {occasions.length === 0 ? (
                    <div className="text-sm text-gray-400 italic">No occasions</div>
                  ) : (
                    <div className="space-y-1">
                      {occasions.map((occasion) => (
                        <div
                          key={occasion.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span>{occasion.title}</span>
                            <span className="text-gray-400 text-xs">{formatDate(occasion.date)}</span>
                          </div>
                          <button
                            onClick={() => void handleDeleteOccasion(occasion.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Obligations */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Obligations</h4>
                  {obligations.length === 0 ? (
                    <div className="text-sm text-gray-400 italic">No obligations</div>
                  ) : (
                    <div className="space-y-1">
                      {obligations.map((obligation) => (
                        <div
                          key={obligation.id}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            obligation.status === "done"
                              ? "bg-green-50"
                              : obligation.dueAt && new Date(obligation.dueAt) < new Date()
                              ? "bg-red-50"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {obligation.status === "done" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : obligation.dueAt && new Date(obligation.dueAt) < new Date() ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-4" />
                            )}
                            <span className={obligation.status === "done" ? "line-through text-gray-400" : ""}>
                              {obligation.title}
                            </span>
                            <span className="text-gray-400 text-xs">{formatDateTime(obligation.dueAt)}</span>
                          </div>
                          <div className="flex gap-1">
                            {obligation.status === "open" && (
                              <button
                                onClick={() => void handleCompleteObligation(obligation.id)}
                                className="p-1 text-gray-400 hover:text-green-600"
                                aria-label="Complete obligation"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => void handleDeleteObligation(obligation.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showMemberForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Family Member</h3>
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="member-name"
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="member-relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <input
                  id="member-relationship"
                  type="text"
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={memberForm.address}
                  onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isImportant"
                  checked={memberForm.isImportant}
                  onChange={(e) => setMemberForm({ ...memberForm, isImportant: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isImportant" className="text-sm text-gray-700">Mark as important</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={memberForm.notes}
                  onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowMemberForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Occasion Modal */}
      {showOccasionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Occasion</h3>
            <form onSubmit={handleCreateOccasion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={occasionForm.type}
                  onChange={(e) => setOccasionForm({ ...occasionForm, type: e.target.value as FamilyOccasionType })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="birthday">Birthday</option>
                  <option value="name_day">Name Day</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="memorial">Memorial</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={occasionForm.title}
                  onChange={(e) => setOccasionForm({ ...occasionForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={occasionForm.date}
                  onChange={(e) => setOccasionForm({ ...occasionForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={occasionForm.notes}
                  onChange={(e) => setOccasionForm({ ...occasionForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowOccasionForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Occasion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Obligation Modal */}
      {showObligationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Obligation</h3>
            <form onSubmit={handleCreateObligation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={obligationForm.type}
                  onChange={(e) => setObligationForm({ ...obligationForm, type: e.target.value as FamilyObligationType })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="call">Call</option>
                  <option value="visit">Visit</option>
                  <option value="message">Message</option>
                  <option value="gift">Gift</option>
                  <option value="paperwork">Paperwork</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={obligationForm.title}
                  onChange={(e) => setObligationForm({ ...obligationForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={obligationForm.dueAt}
                  onChange={(e) => setObligationForm({ ...obligationForm, dueAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={obligationForm.priority}
                  onChange={(e) => setObligationForm({ ...obligationForm, priority: e.target.value as FamilyPriority })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={obligationForm.notes}
                  onChange={(e) => setObligationForm({ ...obligationForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowObligationForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Obligation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

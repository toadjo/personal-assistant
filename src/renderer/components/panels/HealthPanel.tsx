import { useState, useEffect, useCallback, memo } from "react";
import { Heart, Plus, Trash2, Calendar, CheckCircle, AlertCircle, Pill, Activity, Scale } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../life-areas/LoadingState";
import { SummaryCard } from "../life-areas/SummaryCard";
import { LifeAreaPanelProps } from "../life-areas/types";
import { formatDate } from "../../lib/dateFormat";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { HealthAppointment, HealthMedication, HealthSymptom, HealthMeasurement, HealthObligation, HealthSummary, HealthAppointmentType, HealthMedicationStatus, HealthSymptomSeverity, HealthMeasurementType, HealthObligationType, HealthPriority } from "../../../shared/types";

export const HealthPanel = memo(function HealthPanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: LifeAreaPanelProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [medications, setMedications] = useState<HealthMedication[]>([]);
  const [symptoms, setSymptoms] = useState<HealthSymptom[]>([]);
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [obligations, setObligations] = useState<HealthObligation[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showObligationForm, setShowObligationForm] = useState(false);
  
  const [appointmentForm, setAppointmentForm] = useState({
    type: "checkup" as HealthAppointmentType,
    title: "",
    provider: "",
    location: "",
    date: "",
    time: "",
    duration: 30,
    status: "scheduled" as const,
    notes: ""
  });
  
  const [medicationForm, setMedicationForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    route: "oral",
    status: "active" as HealthMedicationStatus,
    startDate: "",
    endDate: "",
    prescriber: "",
    notes: ""
  });
  
  const [symptomForm, setSymptomForm] = useState({
    name: "",
    severity: "mild" as HealthSymptomSeverity,
    startDate: "",
    endDate: "",
    notes: ""
  });
  
  const [measurementForm, setMeasurementForm] = useState({
    type: "weight" as HealthMeasurementType,
    value: "",
    unit: "",
    date: "",
    notes: ""
  });
  
  const [obligationForm, setObligationForm] = useState({
    type: "refill" as HealthObligationType,
    title: "",
    dueAt: "",
    status: "open" as const,
    priority: "normal" as HealthPriority,
    notes: ""
  });

  const api = requireAssistantApi();

  const loadHealthData = useCallback(async () => {
    if (!api) return;
    setIsLoading(true);
    try {
      const [appointmentsData, medicationsData, symptomsData, measurementsData, obligationsData, summaryData] = await Promise.all([
        api.listHealthAppointments(),
        api.listHealthMedications(),
        api.listHealthSymptoms(),
        api.listHealthMeasurements(),
        api.listHealthObligations(),
        api.getHealthSummary()
      ]);
      setAppointments(appointmentsData);
      setMedications(medicationsData);
      setSymptoms(symptomsData);
      setMeasurements(measurementsData);
      setObligations(obligationsData);
      setSummary(summaryData);
    } catch {
      onError("Failed to load health data");
    } finally {
      setIsLoading(false);
    }
  }, [api, onError]);

  useEffect(() => {
    loadHealthData();
  }, [_isRefreshing, loadHealthData]);

  async function handleCreateAppointment() {
    if (!api) return;
    try {
      await api.createHealthAppointment(appointmentForm);
      setShowAppointmentForm(false);
      setAppointmentForm({
        type: "checkup",
        title: "",
        provider: "",
        location: "",
        date: "",
        time: "",
        duration: 30,
        status: "scheduled",
        notes: ""
      });
      await loadHealthData();
      onShowSuccess?.("Appointment created");
    } catch {
      onError("Failed to create appointment");
    }
  }

  async function handleCreateMedication() {
    if (!api) return;
    try {
      await api.createHealthMedication(medicationForm);
      setShowMedicationForm(false);
      setMedicationForm({
        name: "",
        dosage: "",
        frequency: "",
        route: "oral",
        status: "active",
        startDate: "",
        endDate: "",
        prescriber: "",
        notes: ""
      });
      await loadHealthData();
      onShowSuccess?.("Medication created");
    } catch {
      onError("Failed to create medication");
    }
  }

  async function handleCreateSymptom() {
    if (!api) return;
    try {
      await api.createHealthSymptom(symptomForm);
      setShowSymptomForm(false);
      setSymptomForm({
        name: "",
        severity: "mild",
        startDate: "",
        endDate: "",
        notes: ""
      });
      await loadHealthData();
      onShowSuccess?.("Symptom created");
    } catch {
      onError("Failed to create symptom");
    }
  }

  async function handleCreateMeasurement() {
    if (!api) return;
    try {
      await api.createHealthMeasurement(measurementForm);
      setShowMeasurementForm(false);
      setMeasurementForm({
        type: "weight",
        value: "",
        unit: "",
        date: "",
        notes: ""
      });
      await loadHealthData();
      onShowSuccess?.("Measurement created");
    } catch {
      onError("Failed to create measurement");
    }
  }

  async function handleCreateObligation() {
    if (!api) return;
    try {
      await api.createHealthObligation(obligationForm);
      setShowObligationForm(false);
      setObligationForm({
        type: "refill",
        title: "",
        dueAt: "",
        status: "open",
        priority: "normal",
        notes: ""
      });
      await loadHealthData();
      onShowSuccess?.("Obligation created");
    } catch {
      onError("Failed to create obligation");
    }
  }

  async function handleDeleteAppointment(id: string) {
    if (!api) return;
    if (!confirm("Delete this appointment?")) return;
    try {
      await api.deleteHealthAppointment(id);
      await loadHealthData();
      onShowSuccess?.("Appointment deleted");
    } catch {
      onError("Failed to delete appointment");
    }
  }

  async function handleDeleteMedication(id: string) {
    if (!api) return;
    if (!confirm("Delete this medication?")) return;
    try {
      await api.deleteHealthMedication(id);
      await loadHealthData();
      onShowSuccess?.("Medication deleted");
    } catch {
      onError("Failed to delete medication");
    }
  }

  async function handleDeleteSymptom(id: string) {
    if (!api) return;
    if (!confirm("Delete this symptom?")) return;
    try {
      await api.deleteHealthSymptom(id);
      await loadHealthData();
      onShowSuccess?.("Symptom deleted");
    } catch {
      onError("Failed to delete symptom");
    }
  }

  async function handleDeleteMeasurement(id: string) {
    if (!api) return;
    if (!confirm("Delete this measurement?")) return;
    try {
      await api.deleteHealthMeasurement(id);
      await loadHealthData();
      onShowSuccess?.("Measurement deleted");
    } catch {
      onError("Failed to delete measurement");
    }
  }

  async function handleCompleteObligation(id: string) {
    if (!api) return;
    try {
      await api.completeHealthObligation(id);
      await loadHealthData();
      onShowSuccess?.("Obligation completed");
    } catch {
      onError("Failed to complete obligation");
    }
  }

  async function handleDeleteObligation(id: string) {
    if (!api) return;
    if (!confirm("Delete this obligation?")) return;
    try {
      await api.deleteHealthObligation(id);
      await loadHealthData();
      onShowSuccess?.("Obligation deleted");
    } catch {
      onError("Failed to delete obligation");
    }
  }

  if (isLoading) {
    return (
      <section className="panel" aria-labelledby="health-panel-heading">
        <PanelHeader icon={Heart} title="Health" />
        <div className="panelContent">
          <LoadingState message="Loading health data..." />
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="health-panel-heading">
      <PanelHeader icon={Heart} title="Health" />
      <div className="panelContent">
        {summary && (
          <div className="summaryGrid">
            <SummaryCard label="Upcoming Appointments" value={summary.upcomingAppointments} />
            <SummaryCard label="Active Medications" value={summary.activeMedications} />
            <SummaryCard label="Active Symptoms" value={summary.activeSymptoms} />
            <SummaryCard label="Recent Measurements" value={summary.recentMeasurements} />
            <SummaryCard label="Open Obligations" value={summary.openObligations} />
            <SummaryCard label="Overdue" value={summary.overdueObligations} />
          </div>
        )}

        {/* Appointments Section */}
        <div className="healthSection">
          <div className="sectionHeader">
            <Calendar className="sectionIcon" />
            <h3>Appointments</h3>
            <button
              className="iconButton"
              onClick={() => setShowAppointmentForm(true)}
              aria-label="Add appointment"
            >
              <Plus />
            </button>
          </div>
          {appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments yet"
              description="Add your first appointment to get started"
            />
          ) : (
            <div className="healthList">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="healthItem">
                  <div className="healthInfo">
                    <div className="healthName">{appointment.title}</div>
                    <div className="healthMeta">
                      <span>{appointment.type}</span>
                      <span>{formatDate(appointment.date)}</span>
                      <span>{appointment.time}</span>
                      <span>{appointment.duration} min</span>
                    </div>
                  </div>
                  <button
                    className="iconButton"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    aria-label="Delete appointment"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medications Section */}
        <div className="healthSection">
          <div className="sectionHeader">
            <Pill className="sectionIcon" />
            <h3>Medications</h3>
            <button
              className="iconButton"
              onClick={() => setShowMedicationForm(true)}
              aria-label="Add medication"
            >
              <Plus />
            </button>
          </div>
          {medications.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No medications yet"
              description="Add your first medication to get started"
            />
          ) : (
            <div className="healthList">
              {medications.map((medication) => (
                <div key={medication.id} className="healthItem">
                  <div className="healthInfo">
                    <div className="healthName">{medication.name}</div>
                    <div className="healthMeta">
                      <span>{medication.dosage}</span>
                      <span>{medication.frequency}</span>
                      <span>{medication.route}</span>
                      <span>{medication.status}</span>
                    </div>
                  </div>
                  <button
                    className="iconButton"
                    onClick={() => handleDeleteMedication(medication.id)}
                    aria-label="Delete medication"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symptoms Section */}
        <div className="healthSection">
          <div className="sectionHeader">
            <Activity className="sectionIcon" />
            <h3>Symptoms</h3>
            <button
              className="iconButton"
              onClick={() => setShowSymptomForm(true)}
              aria-label="Add symptom"
            >
              <Plus />
            </button>
          </div>
          {symptoms.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No symptoms recorded"
              description="Track your health symptoms here"
            />
          ) : (
            <div className="healthList">
              {symptoms.map((symptom) => (
                <div key={symptom.id} className="healthItem">
                  <div className="healthInfo">
                    <div className="healthName">{symptom.name}</div>
                    <div className="healthMeta">
                      <span>{symptom.severity}</span>
                      <span>{formatDate(symptom.startDate)}</span>
                    </div>
                  </div>
                  <button
                    className="iconButton"
                    onClick={() => handleDeleteSymptom(symptom.id)}
                    aria-label="Delete symptom"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Measurements Section */}
        <div className="healthSection">
          <div className="sectionHeader">
            <Scale className="sectionIcon" />
            <h3>Measurements</h3>
            <button
              className="iconButton"
              onClick={() => setShowMeasurementForm(true)}
              aria-label="Add measurement"
            >
              <Plus />
            </button>
          </div>
          {measurements.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="No measurements recorded"
              description="Track your health measurements here"
            />
          ) : (
            <div className="healthList">
              {measurements.map((measurement) => (
                <div key={measurement.id} className="healthItem">
                  <div className="healthInfo">
                    <div className="healthName">{measurement.type}</div>
                    <div className="healthMeta">
                      <span>{measurement.value} {measurement.unit}</span>
                      <span>{formatDate(measurement.date)}</span>
                    </div>
                  </div>
                  <button
                    className="iconButton"
                    onClick={() => handleDeleteMeasurement(measurement.id)}
                    aria-label="Delete measurement"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Obligations Section */}
        <div className="healthSection">
          <div className="sectionHeader">
            <AlertCircle className="sectionIcon" />
            <h3>Obligations</h3>
            <button
              className="iconButton"
              onClick={() => setShowObligationForm(true)}
              aria-label="Add obligation"
            >
              <Plus />
            </button>
          </div>
          {obligations.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No obligations yet"
              description="Add your first health obligation to get started"
            />
          ) : (
            <div className="healthList">
              {obligations.map((obligation) => (
                <div key={obligation.id} className="healthItem">
                  <div className="healthInfo">
                    <div className="healthName">{obligation.title}</div>
                    <div className="healthMeta">
                      <span>{obligation.type}</span>
                      <span>{obligation.priority}</span>
                      <span>{obligation.status}</span>
                      {obligation.dueAt && <span>{formatDate(obligation.dueAt)}</span>}
                    </div>
                  </div>
                  <div className="healthActions">
                    {obligation.status === "open" && (
                      <button
                        className="iconButton"
                        onClick={() => handleCompleteObligation(obligation.id)}
                        aria-label="Complete obligation"
                      >
                        <CheckCircle />
                      </button>
                    )}
                    <button
                      className="iconButton"
                      onClick={() => handleDeleteObligation(obligation.id)}
                      aria-label="Delete obligation"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forms */}
        {showAppointmentForm && (
          <div className="modal">
            <div className="modalContent">
              <h2>Add Appointment</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateAppointment(); }}>
                <div className="formGroup">
                  <label>Type</label>
                  <select
                    value={appointmentForm.type}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value as HealthAppointmentType })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="checkup">Checkup</option>
                    <option value="specialist">Specialist</option>
                    <option value="emergency">Emergency</option>
                    <option value="followup">Follow-up</option>
                    <option value="procedure">Procedure</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Title</label>
                  <input
                    type="text"
                    value={appointmentForm.title}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Provider</label>
                  <input
                    type="text"
                    value={appointmentForm.provider}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Location</label>
                  <input
                    type="text"
                    value={appointmentForm.location}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Date</label>
                  <input
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Time</label>
                  <input
                    type="time"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={appointmentForm.duration}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Notes</label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formActions">
                  <button type="button" onClick={() => setShowAppointmentForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMedicationForm && (
          <div className="modal">
            <div className="modalContent">
              <h2>Add Medication</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateMedication(); }}>
                <div className="formGroup">
                  <label>Name</label>
                  <input
                    type="text"
                    value={medicationForm.name}
                    onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Dosage</label>
                  <input
                    type="text"
                    value={medicationForm.dosage}
                    onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Frequency</label>
                  <input
                    type="text"
                    value={medicationForm.frequency}
                    onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Route</label>
                  <input
                    type="text"
                    value={medicationForm.route}
                    onChange={(e) => setMedicationForm({ ...medicationForm, route: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={medicationForm.startDate}
                    onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={medicationForm.endDate}
                    onChange={(e) => setMedicationForm({ ...medicationForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Prescriber</label>
                  <input
                    type="text"
                    value={medicationForm.prescriber}
                    onChange={(e) => setMedicationForm({ ...medicationForm, prescriber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Notes</label>
                  <textarea
                    value={medicationForm.notes}
                    onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formActions">
                  <button type="button" onClick={() => setShowMedicationForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSymptomForm && (
          <div className="modal">
            <div className="modalContent">
              <h2>Add Symptom</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateSymptom(); }}>
                <div className="formGroup">
                  <label>Name</label>
                  <input
                    type="text"
                    value={symptomForm.name}
                    onChange={(e) => setSymptomForm({ ...symptomForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Severity</label>
                  <select
                    value={symptomForm.severity}
                    onChange={(e) => setSymptomForm({ ...symptomForm, severity: e.target.value as HealthSymptomSeverity })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={symptomForm.startDate}
                    onChange={(e) => setSymptomForm({ ...symptomForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={symptomForm.endDate}
                    onChange={(e) => setSymptomForm({ ...symptomForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Notes</label>
                  <textarea
                    value={symptomForm.notes}
                    onChange={(e) => setSymptomForm({ ...symptomForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formActions">
                  <button type="button" onClick={() => setShowSymptomForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMeasurementForm && (
          <div className="modal">
            <div className="modalContent">
              <h2>Add Measurement</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateMeasurement(); }}>
                <div className="formGroup">
                  <label>Type</label>
                  <select
                    value={measurementForm.type}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, type: e.target.value as HealthMeasurementType })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="weight">Weight</option>
                    <option value="blood_pressure">Blood Pressure</option>
                    <option value="heart_rate">Heart Rate</option>
                    <option value="temperature">Temperature</option>
                    <option value="blood_sugar">Blood Sugar</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Value</label>
                  <input
                    type="text"
                    value={measurementForm.value}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={measurementForm.unit}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Date</label>
                  <input
                    type="date"
                    value={measurementForm.date}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Notes</label>
                  <textarea
                    value={measurementForm.notes}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formActions">
                  <button type="button" onClick={() => setShowMeasurementForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showObligationForm && (
          <div className="modal">
            <div className="modalContent">
              <h2>Add Obligation</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateObligation(); }}>
                <div className="formGroup">
                  <label>Type</label>
                  <select
                    value={obligationForm.type}
                    onChange={(e) => setObligationForm({ ...obligationForm, type: e.target.value as HealthObligationType })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="refill">Refill</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="screening">Screening</option>
                    <option value="exercise">Exercise</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Title</label>
                  <input
                    type="text"
                    value={obligationForm.title}
                    onChange={(e) => setObligationForm({ ...obligationForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={obligationForm.dueAt}
                    onChange={(e) => setObligationForm({ ...obligationForm, dueAt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formGroup">
                  <label>Priority</label>
                  <select
                    value={obligationForm.priority}
                    onChange={(e) => setObligationForm({ ...obligationForm, priority: e.target.value as HealthPriority })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Notes</label>
                  <textarea
                    value={obligationForm.notes}
                    onChange={(e) => setObligationForm({ ...obligationForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="formActions">
                  <button type="button" onClick={() => setShowObligationForm(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
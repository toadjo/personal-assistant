import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  listHealthAppointments,
  createHealthAppointment,
  _updateHealthAppointment,
  _deleteHealthAppointment,
  listHealthMedications,
  createHealthMedication,
  _updateHealthMedication,
  _deleteHealthMedication,
  listHealthSymptoms,
  createHealthSymptom,
  _updateHealthSymptom,
  _deleteHealthSymptom,
  listHealthMeasurements,
  createHealthMeasurement,
  _updateHealthMeasurement,
  _deleteHealthMeasurement,
  listHealthObligations,
  createHealthObligation,
  _updateHealthObligation,
  completeHealthObligation,
  _deleteHealthObligation,
  getHealthSummary
} from "../../services/health";
import { registerInvoke } from "../invoke-handle";
import {
  healthAppointmentCreateSchema,
  healthAppointmentUpdateSchema,
  healthMedicationCreateSchema,
  healthMedicationUpdateSchema,
  healthSymptomCreateSchema,
  healthSymptomUpdateSchema,
  healthMeasurementCreateSchema,
  healthMeasurementUpdateSchema,
  healthObligationCreateSchema,
  healthObligationUpdateSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for health operations (appointments, medications, symptoms, measurements, obligations). */
export function registerHealthHandlers(assertSender: AssertSender): void {
  // Health appointments
  registerInvoke(IpcInvoke.healthAppointmentsList, assertSender, () => {
    return listHealthAppointments();
  });
  registerInvoke(IpcInvoke.healthAppointmentsCreate, assertSender, (_event, payload) => {
    return createHealthAppointment(healthAppointmentCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.healthAppointmentsUpdate, assertSender, (_event, payload) => {
    const parsed = healthAppointmentUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateHealthAppointment(id, updates);
  });
  registerInvoke(IpcInvoke.healthAppointmentsDelete, assertSender, (_event, id) => {
    _deleteHealthAppointment(uuidSchema.parse(id));
  });

  // Health medications
  registerInvoke(IpcInvoke.healthMedicationsList, assertSender, () => {
    return listHealthMedications();
  });
  registerInvoke(IpcInvoke.healthMedicationsCreate, assertSender, (_event, payload) => {
    return createHealthMedication(healthMedicationCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.healthMedicationsUpdate, assertSender, (_event, payload) => {
    const parsed = healthMedicationUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateHealthMedication(id, updates);
  });
  registerInvoke(IpcInvoke.healthMedicationsDelete, assertSender, (_event, id) => {
    _deleteHealthMedication(uuidSchema.parse(id));
  });

  // Health symptoms
  registerInvoke(IpcInvoke.healthSymptomsList, assertSender, () => {
    return listHealthSymptoms();
  });
  registerInvoke(IpcInvoke.healthSymptomsCreate, assertSender, (_event, payload) => {
    return createHealthSymptom(healthSymptomCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.healthSymptomsUpdate, assertSender, (_event, payload) => {
    const parsed = healthSymptomUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateHealthSymptom(id, updates);
  });
  registerInvoke(IpcInvoke.healthSymptomsDelete, assertSender, (_event, id) => {
    _deleteHealthSymptom(uuidSchema.parse(id));
  });

  // Health measurements
  registerInvoke(IpcInvoke.healthMeasurementsList, assertSender, () => {
    return listHealthMeasurements();
  });
  registerInvoke(IpcInvoke.healthMeasurementsCreate, assertSender, (_event, payload) => {
    return createHealthMeasurement(healthMeasurementCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.healthMeasurementsUpdate, assertSender, (_event, payload) => {
    const parsed = healthMeasurementUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateHealthMeasurement(id, updates);
  });
  registerInvoke(IpcInvoke.healthMeasurementsDelete, assertSender, (_event, id) => {
    _deleteHealthMeasurement(uuidSchema.parse(id));
  });

  // Health obligations
  registerInvoke(IpcInvoke.healthObligationsList, assertSender, () => {
    return listHealthObligations();
  });
  registerInvoke(IpcInvoke.healthObligationsCreate, assertSender, (_event, payload) => {
    return createHealthObligation(healthObligationCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.healthObligationsUpdate, assertSender, (_event, payload) => {
    const parsed = healthObligationUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateHealthObligation(id, updates);
  });
  registerInvoke(IpcInvoke.healthObligationsComplete, assertSender, (_event, id) => {
    return completeHealthObligation(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.healthObligationsDelete, assertSender, (_event, id) => {
    _deleteHealthObligation(uuidSchema.parse(id));
  });

  // Health summary
  registerInvoke(IpcInvoke.healthSummaryGet, assertSender, () => {
    return getHealthSummary();
  });
}
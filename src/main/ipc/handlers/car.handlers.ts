import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listFuelEntries,
  createFuelEntry,
  _updateFuelEntry,
  _deleteFuelEntry,
  _listMaintenance,
  createMaintenance,
  _updateMaintenance,
  _deleteMaintenance,
  _listRecurringBills,
  createRecurringBill,
  _updateRecurringBill,
  markRecurringBillPaid,
  _deleteRecurringBill,
  _listMileage,
  createMileage,
  _updateMileage,
  _deleteMileage,
  _listServiceReminders,
  createServiceReminder,
  _updateServiceReminder,
  completeServiceReminder,
  _deleteServiceReminder
} from "../../services/car";
import { registerInvoke, registerValidated } from "../invoke-handle";
import {
  carVehicleCreateSchema,
  carVehicleUpdateSchema,
  carFuelEntryCreateSchema,
  carFuelEntryUpdateSchema,
  carMaintenanceCreateSchema,
  carMaintenanceUpdateSchema,
  carRecurringBillCreateSchema,
  carRecurringBillUpdateSchema,
  carMileageCreateSchema,
  carMileageUpdateSchema,
  carServiceReminderCreateSchema,
  carServiceReminderUpdateSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for car operations (vehicles, fuel, maintenance, bills, mileage, reminders). */
export function registerCarHandlers(assertSender: AssertSender): void {
  // Vehicles
  registerInvoke(IpcInvoke.carVehiclesList, assertSender, () => {
    return listVehicles();
  });
  registerValidated(IpcInvoke.carVehiclesCreate, assertSender, carVehicleCreateSchema, (_event, payload) => {
    return createVehicle(payload);
  });
  registerInvoke(IpcInvoke.carVehiclesUpdate, assertSender, (_event, payload) => {
    const parsed = carVehicleUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateVehicle(id, updates);
  });
  registerValidated(IpcInvoke.carVehiclesDelete, assertSender, uuidSchema, (_event, id) => {
    deleteVehicle(id);
  });

  // Fuel entries
  registerInvoke(IpcInvoke.carFuelList, assertSender, (_event, vehicleId) => {
    return listFuelEntries(vehicleId as string | undefined);
  });
  registerInvoke(IpcInvoke.carFuelCreate, assertSender, (_event, payload) => {
    return createFuelEntry(carFuelEntryCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carFuelUpdate, assertSender, (_event, payload) => {
    const parsed = carFuelEntryUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateFuelEntry(id, updates);
  });
  registerValidated(IpcInvoke.carFuelDelete, assertSender, uuidSchema, (_event, id) => {
    _deleteFuelEntry(id);
  });

  // Maintenance
  registerInvoke(IpcInvoke.carMaintenanceList, assertSender, (_event, vehicleId) => {
    return _listMaintenance(vehicleId as string | undefined);
  });
  registerValidated(IpcInvoke.carMaintenanceCreate, assertSender, carMaintenanceCreateSchema, (_event, payload) => {
    return createMaintenance(payload);
  });
  registerInvoke(IpcInvoke.carMaintenanceUpdate, assertSender, (_event, payload) => {
    const parsed = carMaintenanceUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateMaintenance(id, updates);
  });
  registerValidated(IpcInvoke.carMaintenanceDelete, assertSender, uuidSchema, (_event, id) => {
    _deleteMaintenance(id);
  });

  // Recurring bills
  registerInvoke(IpcInvoke.carRecurringBillsList, assertSender, (_event, vehicleId) => {
    return _listRecurringBills(vehicleId as string | undefined);
  });
  registerInvoke(IpcInvoke.carRecurringBillsCreate, assertSender, (_event, payload) => {
    return createRecurringBill(carRecurringBillCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carRecurringBillsUpdate, assertSender, (_event, payload) => {
    const parsed = carRecurringBillUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateRecurringBill(id, updates);
  });
  registerValidated(IpcInvoke.carRecurringBillsMarkPaid, assertSender, uuidSchema, (_event, id) => {
    return markRecurringBillPaid(id);
  });
  registerValidated(IpcInvoke.carRecurringBillsDelete, assertSender, uuidSchema, (_event, id) => {
    _deleteRecurringBill(id);
  });

  // Mileage
  registerInvoke(IpcInvoke.carMileageList, assertSender, (_event, vehicleId) => {
    return _listMileage(vehicleId as string | undefined);
  });
  registerValidated(IpcInvoke.carMileageCreate, assertSender, carMileageCreateSchema, (_event, payload) => {
    return createMileage(payload);
  });
  registerInvoke(IpcInvoke.carMileageUpdate, assertSender, (_event, payload) => {
    const parsed = carMileageUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateMileage(id, updates);
  });
  registerValidated(IpcInvoke.carMileageDelete, assertSender, uuidSchema, (_event, id) => {
    _deleteMileage(id);
  });

  // Service reminders
  registerInvoke(IpcInvoke.carServiceRemindersList, assertSender, (_event, vehicleId) => {
    return _listServiceReminders(vehicleId as string | undefined);
  });
  registerInvoke(IpcInvoke.carServiceRemindersCreate, assertSender, (_event, payload) => {
    return createServiceReminder(carServiceReminderCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carServiceRemindersUpdate, assertSender, (_event, payload) => {
    const parsed = carServiceReminderUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateServiceReminder(id, updates);
  });
  registerValidated(IpcInvoke.carServiceRemindersComplete, assertSender, uuidSchema, (_event, id) => {
    return completeServiceReminder(id);
  });
  registerValidated(IpcInvoke.carServiceRemindersDelete, assertSender, uuidSchema, (_event, id) => {
    _deleteServiceReminder(id);
  });
}
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
import { registerInvoke } from "../invoke-handle";
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
  registerInvoke(IpcInvoke.carVehiclesCreate, assertSender, (_event, payload) => {
    return createVehicle(carVehicleCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carVehiclesUpdate, assertSender, (_event, payload) => {
    const parsed = carVehicleUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateVehicle(id, updates);
  });
  registerInvoke(IpcInvoke.carVehiclesDelete, assertSender, (_event, id) => {
    deleteVehicle(uuidSchema.parse(id));
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
  registerInvoke(IpcInvoke.carFuelDelete, assertSender, (_event, id) => {
    _deleteFuelEntry(uuidSchema.parse(id));
  });

  // Maintenance
  registerInvoke(IpcInvoke.carMaintenanceList, assertSender, (_event, vehicleId) => {
    return _listMaintenance(vehicleId as string | undefined);
  });
  registerInvoke(IpcInvoke.carMaintenanceCreate, assertSender, (_event, payload) => {
    return createMaintenance(carMaintenanceCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carMaintenanceUpdate, assertSender, (_event, payload) => {
    const parsed = carMaintenanceUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateMaintenance(id, updates);
  });
  registerInvoke(IpcInvoke.carMaintenanceDelete, assertSender, (_event, id) => {
    _deleteMaintenance(uuidSchema.parse(id));
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
  registerInvoke(IpcInvoke.carRecurringBillsMarkPaid, assertSender, (_event, id) => {
    return markRecurringBillPaid(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.carRecurringBillsDelete, assertSender, (_event, id) => {
    _deleteRecurringBill(uuidSchema.parse(id));
  });

  // Mileage
  registerInvoke(IpcInvoke.carMileageList, assertSender, (_event, vehicleId) => {
    return _listMileage(vehicleId as string | undefined);
  });
  registerInvoke(IpcInvoke.carMileageCreate, assertSender, (_event, payload) => {
    return createMileage(carMileageCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.carMileageUpdate, assertSender, (_event, payload) => {
    const parsed = carMileageUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateMileage(id, updates);
  });
  registerInvoke(IpcInvoke.carMileageDelete, assertSender, (_event, id) => {
    _deleteMileage(uuidSchema.parse(id));
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
  registerInvoke(IpcInvoke.carServiceRemindersComplete, assertSender, (_event, id) => {
    return completeServiceReminder(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.carServiceRemindersDelete, assertSender, (_event, id) => {
    _deleteServiceReminder(uuidSchema.parse(id));
  });
}
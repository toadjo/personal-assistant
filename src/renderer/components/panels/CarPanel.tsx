import { useState, useEffect, memo } from "react";
import { Car, Plus, Trash2, Calendar, Fuel, Wrench, Gauge, AlertCircle } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { CarVehicle, CarFuelEntry, CarMaintenance, CarRecurringBill, CarMileage, CarServiceReminder } from "../../../shared/types";

type Props = {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
};

function formatEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMileage(km: number): string {
  return `${km.toLocaleString()} km`;
}

export const CarPanel = memo(function CarPanel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: Props): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<CarVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [fuelEntries, setFuelEntries] = useState<CarFuelEntry[]>([]);
  const [maintenance, setMaintenance] = useState<CarMaintenance[]>([]);
  const [recurringBills, setRecurringBills] = useState<CarRecurringBill[]>([]);
  const [mileage, setMileage] = useState<CarMileage[]>([]);
  const [serviceReminders, setServiceReminders] = useState<CarServiceReminder[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    name: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    licensePlate: "",
    vin: "",
    color: "",
    purchaseDate: "",
    purchasePrice: "",
    currentMileage: "0",
    notes: ""
  });

  const api = requireAssistantApi();

  async function loadData() {
    setIsLoading(true);
    try {
      const vehiclesData = await api.listVehicles();
      setVehicles(vehiclesData);
      if (vehiclesData.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vehiclesData[0]?.id ?? null);
      }
    } catch {
      onError("Failed to load car data");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadVehicleData(vehicleId: string) {
    setIsLoading(true);
    try {
      const [fuelData, maintenanceData, billsData, mileageData, remindersData] = await Promise.all([
        api.listFuelEntries(vehicleId),
        api.listMaintenance(vehicleId),
        api.listRecurringBills(vehicleId),
        api.listMileage(vehicleId),
        api.listServiceReminders(vehicleId)
      ]);
      setFuelEntries(fuelData);
      setMaintenance(maintenanceData);
      setRecurringBills(billsData);
      setMileage(mileageData);
      setServiceReminders(remindersData);
    } catch {
      onError("Failed to load vehicle data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      void loadVehicleData(selectedVehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    try {
      const purchasePrice = vehicleForm.purchasePrice ? Math.round(parseFloat(vehicleForm.purchasePrice) * 100) : null;
      await api.createVehicle({
        name: vehicleForm.name,
        make: vehicleForm.make,
        model: vehicleForm.model,
        year: parseInt(vehicleForm.year),
        licensePlate: vehicleForm.licensePlate || null,
        vin: vehicleForm.vin || null,
        color: vehicleForm.color || null,
        purchaseDate: vehicleForm.purchaseDate ? new Date(vehicleForm.purchaseDate).toISOString() : null,
        purchasePrice,
        currentMileage: parseInt(vehicleForm.currentMileage),
        notes: vehicleForm.notes
      });
      setShowVehicleForm(false);
      setVehicleForm({ name: "", make: "", model: "", year: new Date().getFullYear().toString(), licensePlate: "", vin: "", color: "", purchaseDate: "", purchasePrice: "", currentMileage: "0", notes: "" });
      onShowSuccess?.("Vehicle created");
      await loadData();
    } catch {
      onError("Failed to create vehicle");
    }
  }

  async function handleDeleteVehicle(id: string) {
    if (!window.confirm("Delete this vehicle and all its data?")) return;
    try {
      await api.deleteVehicle(id);
      onShowSuccess?.("Vehicle deleted");
      if (selectedVehicleId === id) {
        setSelectedVehicleId(null);
      }
      await loadData();
    } catch {
      onError("Failed to delete vehicle");
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const pendingBills = recurringBills.filter(b => b.status === "pending");
  const pendingReminders = serviceReminders.filter(r => r.status === "pending");

  return (
    <section className="panel" aria-labelledby="car-panel-heading">
      <PanelHeader
        icon={Car}
        title="Car"
        actions={
          <div className="panelActions">
            <button
              type="button"
              className="iconButton"
              aria-label="Add vehicle"
              onClick={() => setShowVehicleForm(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        }
      />

      <div className="panelContent">
        {isLoading ? (
          <div className="loadingState">Loading car data...</div>
        ) : (
          <>
            {/* Vehicle Form */}
            {showVehicleForm && (
              <div className="formPanel">
                <h3>Add Vehicle</h3>
                <form onSubmit={handleCreateVehicle}>
                  <div className="formRow">
                    <label>
                      Name
                      <input
                        type="text"
                        value={vehicleForm.name}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Make
                      <input
                        type="text"
                        value={vehicleForm.make}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Model
                      <input
                        type="text"
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Year
                      <input
                        type="text"
                        value={vehicleForm.year}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Current Mileage (km)
                      <input
                        type="number"
                        value={vehicleForm.currentMileage}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, currentMileage: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      License Plate
                      <input
                        type="text"
                        value={vehicleForm.licensePlate}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      VIN
                      <input
                        type="text"
                        value={vehicleForm.vin}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Color
                      <input
                        type="text"
                        value={vehicleForm.color}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Purchase Date
                      <input
                        type="date"
                        value={vehicleForm.purchaseDate}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, purchaseDate: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Purchase Price (EUR)
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={vehicleForm.purchasePrice}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, purchasePrice: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Notes
                      <textarea
                        value={vehicleForm.notes}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                        rows={2}
                      />
                    </label>
                  </div>
                  <div className="formActions">
                    <button type="button" onClick={() => setShowVehicleForm(false)}>
                      Cancel
                    </button>
                    <button type="submit">Create Vehicle</button>
                  </div>
                </form>
              </div>
            )}

            {/* Vehicles List */}
            <div className="carSection">
              <h3 className="sectionHeader">
                <Car size={16} />
                Vehicles
              </h3>
              {vehicles.length === 0 ? (
                <EmptyState
                  icon={Car}
                  title="No vehicles yet"
                  description="Add your first vehicle to start tracking"
                />
              ) : (
                <div className="vehicleList">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`vehicleItem ${selectedVehicleId === vehicle.id ? "vehicleItemSelected" : ""}`}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                    >
                      <div className="vehicleInfo">
                        <div className="vehicleName">{vehicle.name}</div>
                        <div className="vehicleMeta">
                          <span>{vehicle.make} {vehicle.model}</span>
                          <span>{vehicle.year}</span>
                          <span>{formatMileage(vehicle.currentMileage)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="iconButton"
                        aria-label="Delete vehicle"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteVehicle(vehicle.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Vehicle Details */}
            {selectedVehicle && (
              <>
                {/* Vehicle Summary */}
                <div className="vehicleSummary">
                  <h3>{selectedVehicle.name}</h3>
                  <div className="summaryGrid">
                    <div className="summaryItem">
                      <div className="summaryLabel">Make/Model</div>
                      <div className="summaryValue">{selectedVehicle.make} {selectedVehicle.model}</div>
                    </div>
                    <div className="summaryItem">
                      <div className="summaryLabel">Year</div>
                      <div className="summaryValue">{selectedVehicle.year}</div>
                    </div>
                    <div className="summaryItem">
                      <div className="summaryLabel">Current Mileage</div>
                      <div className="summaryValue">{formatMileage(selectedVehicle.currentMileage)}</div>
                    </div>
                    {selectedVehicle.licensePlate && (
                      <div className="summaryItem">
                        <div className="summaryLabel">License Plate</div>
                        <div className="summaryValue">{selectedVehicle.licensePlate}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Reminders */}
                <div className="carSection">
                  <h3 className="sectionHeader">
                    <AlertCircle size={16} />
                    Service Reminders
                  </h3>
                  {pendingReminders.length === 0 ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="No pending reminders"
                      description="All service reminders are completed"
                    />
                  ) : (
                    <div className="reminderList">
                      {pendingReminders.map((reminder) => (
                        <div key={reminder.id} className="reminderItem">
                          <div className="reminderInfo">
                            <div className="reminderType">{reminder.type}</div>
                            <div className="reminderDescription">{reminder.description}</div>
                            <div className="reminderMeta">
                              {reminder.dueOdometer && <span>Due at: {formatMileage(reminder.dueOdometer)}</span>}
                              {reminder.dueDate && <span>Due: {formatDate(reminder.dueDate)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recurring Bills */}
                <div className="carSection">
                  <h3 className="sectionHeader">
                    <Calendar size={16} />
                    Recurring Bills
                  </h3>
                  {pendingBills.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No pending bills"
                      description="All recurring bills are paid"
                    />
                  ) : (
                    <div className="billList">
                      {pendingBills.map((bill) => (
                        <div key={bill.id} className="billItem">
                          <div className="billInfo">
                            <div className="billName">{bill.name}</div>
                            <div className="billMeta">
                              <span className="billType">{bill.type}</span>
                              <span className="billAmount">{formatEur(bill.amount)}</span>
                              <span className="billDue">Due: {formatDate(bill.dueDate)}</span>
                              <span className="billFrequency">{bill.frequency}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Maintenance */}
                <div className="carSection">
                  <h3 className="sectionHeader">
                    <Wrench size={16} />
                    Maintenance
                  </h3>
                  {maintenance.length === 0 ? (
                    <EmptyState
                      icon={Wrench}
                      title="No maintenance records"
                      description="Track your car's maintenance history"
                    />
                  ) : (
                    <div className="maintenanceList">
                      {maintenance.slice(0, 5).map((record) => (
                        <div key={record.id} className="maintenanceItem">
                          <div className="maintenanceInfo">
                            <div className="maintenanceType">{record.type}</div>
                            <div className="maintenanceDescription">{record.description}</div>
                            <div className="maintenanceMeta">
                              <span className="maintenanceDate">{formatDate(record.date)}</span>
                              <span className="maintenanceCost">{formatEur(record.cost)}</span>
                              {record.odometer && <span className="maintenanceOdometer">{formatMileage(record.odometer)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Fuel Entries */}
                <div className="carSection">
                  <h3 className="sectionHeader">
                    <Fuel size={16} />
                    Fuel
                  </h3>
                  {fuelEntries.length === 0 ? (
                    <EmptyState
                      icon={Fuel}
                      title="No fuel entries"
                      description="Track your fuel consumption"
                    />
                  ) : (
                    <div className="fuelList">
                      {fuelEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="fuelItem">
                          <div className="fuelInfo">
                            <div className="fuelDate">{formatDate(entry.date)}</div>
                            <div className="fuelMeta">
                              <span className="fuelAmount">{entry.fuelAmount} {entry.fuelUnit}</span>
                              <span className="fuelOdometer">{formatMileage(entry.odometer)}</span>
                              <span className="fuelCost">{formatEur(entry.totalPrice)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mileage History */}
                <div className="carSection">
                  <h3 className="sectionHeader">
                    <Gauge size={16} />
                    Mileage
                  </h3>
                  {mileage.length === 0 ? (
                    <EmptyState
                      icon={Gauge}
                      title="No mileage records"
                      description="Track your mileage over time"
                    />
                  ) : (
                    <div className="mileageList">
                      {mileage.slice(0, 5).map((record) => (
                        <div key={record.id} className="mileageItem">
                          <div className="mileageInfo">
                            <div className="mileageDate">{formatDate(record.date)}</div>
                            <div className="mileageOdometer">{formatMileage(record.odometer)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
});
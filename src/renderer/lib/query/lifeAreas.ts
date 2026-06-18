import { getAssistantApi } from "../assistantApi";
import type {
  CarFuelEntry,
  CarMaintenance,
  CarMileage,
  CarRecurringBill,
  CarServiceReminder,
  CarVehicle,
  FamilyMember,
  FamilyObligation,
  FamilyOccasion,
  FamilySummary,
  FinanceBill,
  FinanceExpense,
  FinanceMonthlySummary,
  HealthAppointment,
  HealthMeasurement,
  HealthMedication,
  HealthObligation,
  HealthSummary,
  HealthSymptom,
  Hobby,
  HobbyMilestone,
  HobbyProject,
  HobbySession,
  HobbySummary,
  HobbySupply
} from "../../../shared/types";

export async function fetchFinanceBills(): Promise<FinanceBill[]> {
  return (await getAssistantApi()?.listBills?.()) ?? [];
}
export async function fetchFinanceExpenses(): Promise<FinanceExpense[]> {
  return (await getAssistantApi()?.listExpenses?.()) ?? [];
}
export async function fetchFinanceSummary(): Promise<FinanceMonthlySummary | null> {
  return (await getAssistantApi()?.getMonthlySummary?.()) ?? null;
}

export async function fetchFamilyMembers(): Promise<FamilyMember[]> {
  return (await getAssistantApi()?.listFamilyMembers?.()) ?? [];
}
export async function fetchFamilySummary(): Promise<FamilySummary | null> {
  return (await getAssistantApi()?.getFamilySummary?.()) ?? null;
}
export async function fetchFamilyOccasions(memberId: string): Promise<FamilyOccasion[]> {
  return (await getAssistantApi()?.listFamilyOccasions?.(memberId)) ?? [];
}
export async function fetchFamilyObligations(memberId: string): Promise<FamilyObligation[]> {
  return (await getAssistantApi()?.listFamilyObligations?.(memberId)) ?? [];
}

export type HealthAllData = {
  appointments: HealthAppointment[];
  medications: HealthMedication[];
  symptoms: HealthSymptom[];
  measurements: HealthMeasurement[];
  obligations: HealthObligation[];
  summary: HealthSummary | null;
};
export async function fetchHealthAll(): Promise<HealthAllData> {
  const api = getAssistantApi();
  if (!api) {
    return { appointments: [], medications: [], symptoms: [], measurements: [], obligations: [], summary: null };
  }
  const [appointments, medications, symptoms, measurements, obligations, summary] = await Promise.all([
    api.listHealthAppointments(),
    api.listHealthMedications(),
    api.listHealthSymptoms(),
    api.listHealthMeasurements(),
    api.listHealthObligations(),
    api.getHealthSummary()
  ]);
  return { appointments, medications, symptoms, measurements, obligations, summary };
}

export type HobbiesAllData = {
  hobbies: Hobby[];
  sessions: HobbySession[];
  projects: HobbyProject[];
  milestones: HobbyMilestone[];
  supplies: HobbySupply[];
  summary: HobbySummary | null;
};
export async function fetchHobbiesAll(): Promise<HobbiesAllData> {
  const api = getAssistantApi();
  if (!api) {
    return { hobbies: [], sessions: [], projects: [], milestones: [], supplies: [], summary: null };
  }
  const [hobbies, sessions, projects, milestones, supplies, summary] = await Promise.all([
    api.listHobbies(),
    api.listHobbySessions(),
    api.listHobbyProjects(),
    api.listHobbyMilestones(),
    api.listHobbySupplies(),
    api.getHobbiesSummary()
  ]);
  return { hobbies, sessions, projects, milestones, supplies, summary };
}

export async function fetchCarVehicles(): Promise<CarVehicle[]> {
  return (await getAssistantApi()?.listVehicles?.()) ?? [];
}
export type CarDetailsData = {
  fuelEntries: CarFuelEntry[];
  maintenance: CarMaintenance[];
  recurringBills: CarRecurringBill[];
  mileage: CarMileage[];
  serviceReminders: CarServiceReminder[];
};
export async function fetchCarDetails(vehicleId: string): Promise<CarDetailsData> {
  const api = getAssistantApi();
  if (!api) return { fuelEntries: [], maintenance: [], recurringBills: [], mileage: [], serviceReminders: [] };
  const [fuelEntries, maintenance, recurringBills, mileage, serviceReminders] = await Promise.all([
    api.listFuelEntries(vehicleId),
    api.listMaintenance(vehicleId),
    api.listRecurringBills(vehicleId),
    api.listMileage(vehicleId),
    api.listServiceReminders(vehicleId)
  ]);
  return { fuelEntries, maintenance, recurringBills, mileage, serviceReminders };
}


import { useEffect, useState } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

export type AutoBackupStatus = {
  enabled: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  backupDir: string;
  retainedCount: number;
};

export type BackupResult = {
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  finance_bills: number;
  finance_expenses: number;
  car_vehicles: number;
  car_fuel_entries: number;
  car_maintenance: number;
  car_recurring_bills: number;
  car_mileage: number;
  car_service_reminders: number;
  family_members: number;
  family_occasions: number;
  family_obligations: number;
  health_appointments: number;
  health_medications: number;
  health_symptoms: number;
  health_measurements: number;
  health_obligations: number;
  hobbies: number;
  hobby_sessions: number;
  hobby_projects: number;
  hobby_milestones: number;
  hobby_supplies: number;
  app_settings: number;
};

export type BackupPreviewResult = {
  valid: boolean;
  error?: string;
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  finance_bills: number;
  finance_expenses: number;
  car_vehicles: number;
  car_fuel_entries: number;
  car_maintenance: number;
  car_recurring_bills: number;
  car_mileage: number;
  car_service_reminders: number;
  family_members: number;
  family_occasions: number;
  family_obligations: number;
  health_appointments: number;
  health_medications: number;
  health_symptoms: number;
  health_measurements: number;
  health_obligations: number;
  hobbies: number;
  hobby_sessions: number;
  hobby_projects: number;
  hobby_milestones: number;
  hobby_supplies: number;
  app_settings: number;
  unsupported_sections: string[];
  has_encrypted_content: boolean;
  version: string;
  exportedAt: string;
};

export type HealthCheckResult = {
  overall_health: "healthy" | "degraded" | "critical";
  integrity_check: { passed: boolean; error?: string };
  schema_check: { passed: boolean; missing_tables: string[]; extra_tables: string[] };
  data_check: { total_rows: number; orphaned_records: number; corrupted_records: number };
  performance_check: {
    page_count: number;
    page_size: number;
    database_size_bytes: number;
    wal_enabled: boolean;
    wal_checkpoint_pending: boolean;
  };
  recommendations: string[];
};

export type OptimizeResult = {
  success: boolean;
  message: string;
};

export type OptimizeSuggestion = {
  shouldOptimize: boolean;
  writesSinceOptimize: number;
  threshold: number;
};

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useBackupActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<HealthCheckResult | null>(null);
  const [lastOptimize, setLastOptimize] = useState<OptimizeResult | null>(null);
  const [optimizeSuggestion, setOptimizeSuggestion] = useState<OptimizeSuggestion | null>(null);
  const [autoBackupStatus, setAutoBackupStatus] = useState<AutoBackupStatus | null>(null);
  const [isTogglingAutoBackup, setIsTogglingAutoBackup] = useState(false);
  const [isRunningAutoBackup, setIsRunningAutoBackup] = useState(false);

  async function exportData(): Promise<void> {
    setIsExporting(true);
    try {
      const api = requireAssistantApi();
      
      // Check disk space before export
      const spaceCheck = await api.checkBackupDiskSpace();
      if (!spaceCheck.sufficient) {
        const freeGB = (spaceCheck.freeBytes / 1024 / 1024 / 1024).toFixed(2);
        const estimatedGB = (spaceCheck.estimatedBackupBytes / 1024 / 1024 / 1024).toFixed(2);
        setError(`Insufficient disk space for backup. Free: ${freeGB} GB, Estimated: ${estimatedGB} GB`);
        return;
      }
      
      const payload = await api.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Backup exported.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function previewImportData(file: File): Promise<BackupPreviewResult | null> {
    setIsPreviewing(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const api = requireAssistantApi();
      const result = await api.previewImportData(payload);
      return result;
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }

  async function importData(file: File): Promise<BackupResult | null> {
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const api = requireAssistantApi();
      
      // Preview the backup first
      const preview = await api.previewImportData(payload);
      
      if (!preview.valid) {
        setError(`Invalid backup: ${preview.error || "Unknown error"}`);
        return null;
      }
      
      // Show confirmation with preview details
      const confirmed = window.confirm(
        `Import backup from ${preview.exportedAt} (version ${preview.version})?\n\n` +
        `This will import:\n` +
        `- ${preview.notes} notes\n` +
        `- ${preview.reminders} reminders\n` +
        `- ${preview.tasks} tasks\n` +
        `- ${preview.automation_rules} automation rules\n` +
        `- ${preview.finance_bills} finance bills\n` +
        `- ${preview.finance_expenses} finance expenses\n` +
        `- ${preview.car_vehicles} car vehicles\n` +
        `- ${preview.car_fuel_entries} car fuel entries\n` +
        `- ${preview.car_maintenance} car maintenance records\n` +
        `- ${preview.car_recurring_bills} car recurring bills\n` +
        `- ${preview.car_mileage} car mileage records\n` +
        `- ${preview.car_service_reminders} car service reminders\n` +
        `- ${preview.family_members} family members\n` +
        `- ${preview.family_occasions} family occasions\n` +
        `- ${preview.family_obligations} family obligations\n` +
        `- ${preview.health_appointments} health appointments\n` +
        `- ${preview.health_medications} health medications\n` +
        `- ${preview.health_symptoms} health symptoms\n` +
        `- ${preview.health_measurements} health measurements\n` +
        `- ${preview.health_obligations} health obligations\n` +
        `- ${preview.hobbies} hobbies\n` +
        `- ${preview.hobby_sessions} hobby sessions\n` +
        `- ${preview.hobby_projects} hobby projects\n` +
        `- ${preview.hobby_milestones} hobby milestones\n` +
        `- ${preview.hobby_supplies} hobby supplies\n` +
        `- ${preview.app_settings} app settings\n\n` +
        `This will replace your current data. Continue?`
      );
      
      if (!confirmed) {
        setStatus("Import cancelled.");
        return null;
      }
      
      const result = await api.importData(payload);
      setStatus(
        `Import complete: ${result.notes} notes, ${result.reminders} reminders, ${result.tasks} tasks, ${result.automation_rules} rules, ${result.finance_bills} finance bills, ${result.finance_expenses} finance expenses, ${result.car_vehicles} car vehicles, ${result.car_fuel_entries} fuel entries, ${result.car_maintenance} maintenance records, ${result.car_recurring_bills} recurring bills, ${result.car_mileage} mileage records, ${result.car_service_reminders} service reminders, ${result.family_members} family members, ${result.family_occasions} family occasions, ${result.family_obligations} family obligations, ${result.health_appointments} health appointments, ${result.health_medications} health medications, ${result.health_symptoms} health symptoms, ${result.health_measurements} health measurements, ${result.health_obligations} health obligations, ${result.hobbies} hobbies, ${result.hobby_sessions} hobby sessions, ${result.hobby_projects} hobby projects, ${result.hobby_milestones} hobby milestones, ${result.hobby_supplies} hobby supplies, ${result.app_settings} settings.`
      );
      await refreshAll();
      return result;
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
      return null;
    } finally {
      setIsImporting(false);
    }
  }

  async function resetData(): Promise<void> {
    if (
      !window.confirm(
        "This will permanently delete all notes, reminders, tasks, automations, finance data, car data, family data, health data, and settings. This cannot be undone. Continue?"
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      const api = requireAssistantApi();
      await api.resetData();
      setStatus("All data has been reset.");
      await refreshAll();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  }

  async function healthCheck(): Promise<void> {
    setIsHealthChecking(true);
    try {
      const api = requireAssistantApi();
      const result = await api.checkDbHealth();
      setLastHealthCheck(result);
      setStatus(`Database health check complete. Overall: ${result.overall_health.toUpperCase()}, Integrity: ${result.integrity_check.passed ? "OK" : "FAILED"}, Schema: ${result.schema_check.passed ? "OK" : "FAILED"}, Data: ${result.data_check.corrupted_records === 0 ? "OK" : "ISSUES"}, Performance: ${result.performance_check.wal_checkpoint_pending ? "NEEDS CHECKPOINT" : "OK"}`);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsHealthChecking(false);
    }
  }

  async function optimize(): Promise<void> {
    setIsOptimizing(true);
    try {
      const api = requireAssistantApi();
      const result = await api.optimizeDatabase();
      setLastOptimize(result);
      setStatus(`Database optimization complete: ${result.message}`);
      await refreshAll();
      // Refresh optimize suggestion after optimize
      const suggestion = await api.getOptimizeSuggestion();
      setOptimizeSuggestion(suggestion);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsOptimizing(false);
    }
  }

  async function fetchOptimizeSuggestion(): Promise<void> {
    try {
      const api = requireAssistantApi();
      const suggestion = await api.getOptimizeSuggestion();
      setOptimizeSuggestion(suggestion);
    } catch {
      // Silently fail; suggestion is optional
    }
  }

  async function fetchAutoBackupStatus(): Promise<void> {
    try {
      const api = requireAssistantApi();
      const status = await api.getAutoBackupStatus();
      setAutoBackupStatus(status);
    } catch {
      // Silently fail; status is optional
    }
  }

  async function toggleAutoBackup(enabled: boolean): Promise<void> {
    setIsTogglingAutoBackup(true);
    try {
      const api = requireAssistantApi();
      const status = await api.setAutoBackupEnabled(enabled);
      setAutoBackupStatus(status);
      setStatus(enabled ? "Automatic backups enabled." : "Automatic backups disabled.");
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsTogglingAutoBackup(false);
    }
  }

  async function runAutoBackupNow(): Promise<void> {
    setIsRunningAutoBackup(true);
    try {
      const api = requireAssistantApi();
      const result = await api.runAutoBackupNow();
      if (result.success) {
        setStatus("Auto-backup completed.");
      } else if (result.error) {
        setError(`Auto-backup failed: ${result.error}`);
      }
      await fetchAutoBackupStatus();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsRunningAutoBackup(false);
    }
  }

  // Fetch optimize suggestion and auto-backup status on mount
  useEffect(() => {
    void fetchOptimizeSuggestion();
    void fetchAutoBackupStatus();
  }, []);

  return {
    exportData,
    importData,
    previewImportData,
    resetData,
    healthCheck,
    optimize,
    isExporting,
    isImporting,
    isPreviewing,
    isResetting,
    isHealthChecking,
    isOptimizing,
    lastHealthCheck,
    lastOptimize,
    optimizeSuggestion,
    autoBackupStatus,
    isTogglingAutoBackup,
    isRunningAutoBackup,
    toggleAutoBackup,
    runAutoBackupNow,
    fetchAutoBackupStatus
  };
}

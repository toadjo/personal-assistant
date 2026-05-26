import { useState } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

export type BackupResult = {
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  app_settings: number;
};

export type BackupPreviewResult = {
  valid: boolean;
  error?: string;
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
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

  async function exportData(): Promise<void> {
    setIsExporting(true);
    try {
      const api = requireAssistantApi();
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
        `- ${preview.app_settings} app settings\n\n` +
        `This will replace your current data. Continue?`
      );
      
      if (!confirmed) {
        setStatus("Import cancelled.");
        return null;
      }
      
      const result = await api.importData(payload);
      setStatus(
        `Import complete: ${result.notes} notes, ${result.reminders} reminders, ${result.tasks} tasks, ${result.automation_rules} rules, ${result.app_settings} settings.`
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
        "This will permanently delete all notes, reminders, tasks, automations, and settings. This cannot be undone. Continue?"
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
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsOptimizing(false);
    }
  }

  return { exportData, importData, previewImportData, resetData, healthCheck, optimize, isExporting, isImporting, isPreviewing, isResetting, isHealthChecking, isOptimizing, lastHealthCheck, lastOptimize };
}

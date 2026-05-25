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

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useBackupActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

  return { exportData, importData, previewImportData, resetData, isExporting, isImporting, isPreviewing, isResetting };
}

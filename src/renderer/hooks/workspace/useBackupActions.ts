import { useState } from "react";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

export type BackupResult = {
  notes: number;
  reminders: number;
  tasks: number;
  automation_rules: number;
  app_settings: number;
};

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useBackupActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function exportData(): Promise<void> {
    setIsExporting(true);
    try {
      const payload = await window.assistantApi.exportData();
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

  async function importData(file: File): Promise<BackupResult | null> {
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await window.assistantApi.importData(payload);
      setStatus(`Import complete: ${result.notes} notes, ${result.reminders} reminders, ${result.tasks} tasks, ${result.automation_rules} rules, ${result.app_settings} settings.`);
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
    if (!window.confirm("This will permanently delete all notes, reminders, tasks, automations, and settings. This cannot be undone. Continue?")) {
      return;
    }
    setIsResetting(true);
    try {
      await window.assistantApi.resetData();
      setStatus("All data has been reset.");
      await refreshAll();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  }

  return { exportData, importData, resetData, isExporting, isImporting, isResetting };
}

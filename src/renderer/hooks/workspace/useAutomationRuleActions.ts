import { getErrorMessage } from "../../lib/errors";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useAutomationRuleActions(refreshAll: () => Promise<void>, setStatus: SetStatus, setError: SetError) {
  async function deleteRuleById(id: string, name: string): Promise<void> {
    if (!window.confirm(`Delete rule "${name}"?`)) return;
    try {
      await window.assistantApi.deleteRule(id);
      setStatus("Rule removed.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function setRuleEnabledById(id: string, enabled: boolean): Promise<void> {
    try {
      await window.assistantApi.setRuleEnabled(id, enabled);
      setStatus(enabled ? "Rule enabled." : "Rule paused.");
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return { deleteRuleById, setRuleEnabledById };
}

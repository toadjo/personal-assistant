import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { requireAssistantApi } from "../../lib/assistantApi";

type SetStatus = (value: string) => void;
type SetError = (value: string) => void;

export function useAutomationRuleActions(
  refreshRules: () => Promise<void>,
  refreshLogs: () => Promise<void>,
  setStatus: SetStatus,
  setError: SetError
) {
  async function deleteRuleById(id: string, name: string): Promise<void> {
    if (!window.confirm(`Delete rule "${name}"?`)) return;
    try {
      const api = requireAssistantApi();
      await api.deleteRule(id);
      setStatus("Rule removed.");
      await refreshRules();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function setRuleEnabledById(id: string, enabled: boolean): Promise<void> {
    try {
      const api = requireAssistantApi();
      await api.setRuleEnabled(id, enabled);
      setStatus(enabled ? "Rule enabled." : "Rule paused.");
      await refreshRules();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function duplicateRuleById(id: string): Promise<void> {
    try {
      const api = requireAssistantApi();
      await api.duplicateRule(id);
      setStatus("Rule duplicated.");
      await refreshRules();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  async function testRunRuleById(id: string): Promise<void> {
    try {
      const api = requireAssistantApi();
      await api.testRunRule(id);
      setStatus("Test run completed.");
      await Promise.all([refreshRules(), refreshLogs()]);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    }
  }

  return { deleteRuleById, setRuleEnabledById, duplicateRuleById, testRunRuleById };
}

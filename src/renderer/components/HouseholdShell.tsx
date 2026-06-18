import { Monitor, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { ThemeSelect } from "./layout/ThemeSelect";
import { IconButton } from "./ui/IconButton";
import { StatusChip } from "./ui/StatusChip";
import { HomeAssistantPanel } from "./panels/HomeAssistantPanel";
import { AutomationLogsPanel } from "./panels/AutomationLogsPanel";
import { AutomationRulesPanel } from "./panels/AutomationRulesPanel";
import { getAutomationFocusIntent, clearAutomationFocusIntent } from "../lib/automation-focus-intent";
import { getAssistantApi } from "../lib/assistantApi";

export function HouseholdShell(): JSX.Element {
  const { ui, data, ha, automation } = useAssistantWorkspace();
  const [focusedRuleId, setFocusedRuleId] = useState<string | null>(null);

  useEffect(() => {
    // Read focus intent on mount
    const ruleId = getAutomationFocusIntent();
    if (ruleId) {
      setFocusedRuleId(ruleId);
      // Clear the intent after consuming it
      clearAutomationFocusIntent();
    }

    // Listen for storage changes while window is open
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "assistant-automation-focus-intent") {
        const newRuleId = getAutomationFocusIntent();
        if (newRuleId) {
          setFocusedRuleId(newRuleId);
          clearAutomationFocusIntent();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <main className="container householdWindowLayout">
      <header className="utilityToolbar">
        <div className="utilityToolbarLeft">
          <h1 className="appIdentity">Household</h1>
          <StatusChip
            icon={ha.haReady ? Wifi : WifiOff}
            label={ha.haReady ? "Connected" : "Not linked"}
            count={data.devices.length}
            variant={ha.haReady ? "success" : undefined}
          />
        </div>
        <div className="utilityToolbarRight">
          <IconButton
            icon={Monitor}
            label="Open Desk window"
            onClick={() => {
              const api = getAssistantApi();
              if (api) void api.focusDeskWindow();
            }}
            variant="ghost"
          />
          <ThemeSelect theme={ui.theme} onChange={ui.setTheme} selectId="theme-select-household" />
        </div>
      </header>

      <div className="householdContent">
        <HomeAssistantPanel
          haUrl={ha.haUrl}
          setHaUrl={ha.setHaUrl}
          haToken={ha.haToken}
          setHaToken={ha.setHaToken}
          hasHaUrl={ha.hasHaUrl}
          haStatusText={ha.haStatusText}
          haReady={ha.haReady}
          canSaveHa={ha.canSaveHa}
          isSavingHa={ha.isSavingHa}
          isRefreshingHa={ha.isRefreshingHa}
          isRefreshing={data.isFetching}
          devices={data.devices}
          isEntityTogglePending={ha.isEntityTogglePending}
          onSave={() => {
            void ha.saveHomeAssistantConfig();
            ui.showSuccess("Home Assistant configuration saved");
          }}
          onTest={() => void ha.testHomeAssistant()}
          onRefreshEntities={() => void ha.refreshHomeAssistantEntities()}
          onToggleDevice={ha.runDeviceToggle}
          onError={ui.reportError}
          onShowSuccess={ui.showSuccess}
        />

        <div className="grid householdAutomationGrid">
          <AutomationRulesPanel
            focusedRuleId={focusedRuleId}
            isRefreshing={data.isFetching}
            rules={data.rules}
            devices={data.devices}
            onRefresh={data.refreshAll}
            onError={ui.reportError}
            onShowSuccess={ui.showSuccess}
            onDeleteRule={(id, name) => {
              void automation.deleteRuleById(id, name);
              ui.showSuccess("Rule deleted");
            }}
            onSetRuleEnabled={(id, enabled) => void automation.setRuleEnabledById(id, enabled)}
            onDuplicateRule={(id) => void automation.duplicateRuleById(id)}
            onTestRunRule={(id) => void automation.testRunRuleById(id)}
          />
          <AutomationLogsPanel isRefreshing={data.isFetching} logs={data.logs} />
        </div>
      </div>
    </main>
  );
}

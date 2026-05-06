import { Monitor, Wifi, WifiOff } from "lucide-react";
import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { ThemeSelect } from "./layout/ThemeSelect";
import { IconButton } from "./ui/IconButton";
import { StatusChip } from "./ui/StatusChip";
import { HomeAssistantPanel } from "./panels/HomeAssistantPanel";
import { AutomationLogsPanel } from "./panels/AutomationLogsPanel";
import { AutomationRulesPanel } from "./panels/AutomationRulesPanel";

export function HouseholdShell(): JSX.Element {
  const { ui, data, ha, automation } = useAssistantWorkspace();

  return (
    <main className="container householdWindowLayout">
      <header className="utilityToolbar">
        <div className="utilityToolbarLeft">
          <span className="appIdentity">Household</span>
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
            onClick={() => void window.assistantApi.focusDeskWindow()}
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
          isRefreshing={data.isRefreshing}
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
            isRefreshing={data.isRefreshing}
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
          />
          <AutomationLogsPanel isRefreshing={data.isRefreshing} logs={data.logs} />
        </div>
      </div>
    </main>
  );
}

import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { ThemeSelect } from "./layout/ThemeSelect";
import { WelcomeBar } from "./layout/WelcomeBar";
import { HomeAssistantPanel } from "./panels/HomeAssistantPanel";
import { AutomationLogsPanel } from "./panels/AutomationLogsPanel";
import { AutomationRulesPanel } from "./panels/AutomationRulesPanel";

export function HouseholdShell(): JSX.Element {
  const ws = useAssistantWorkspace();

  return (
    <main className="container householdWindowLayout">
      <header className="householdWindowHeader">
        <div className="householdWindowLead">
          <WelcomeBar
            userPreferredName={ws.userPreferredName}
            userPreferredNameIsSet={ws.userPreferredNameIsSet}
            onSaveUserPreferredName={ws.persistUserPreferredName}
            idPrefix="household"
          />
          <p className="addOnEyebrow">Nice to have</p>
          <h1 className="addOnTitle">Household</h1>
          <p className="muted addOnLead">
            Home Assistant and timed rules. Your memos and follow-ups stay in the <strong>desk</strong> window.
          </p>
        </div>
        <div className="householdWindowActions">
          <ThemeSelect theme={ws.theme} onChange={ws.setTheme} selectId="theme-select-household" />
          <button type="button" className="ghostButton" onClick={() => void window.assistantApi.focusDeskWindow()}>
            Desk window
          </button>
        </div>
      </header>

      <HomeAssistantPanel
        haUrl={ws.haUrl}
        setHaUrl={ws.setHaUrl}
        haToken={ws.haToken}
        setHaToken={ws.setHaToken}
        hasHaUrl={ws.hasHaUrl}
        haStatusText={ws.haStatusText}
        haReady={ws.haReady}
        canSaveHa={ws.canSaveHa}
        isSavingHa={ws.isSavingHa}
        isRefreshingHa={ws.isRefreshingHa}
        isRefreshing={ws.isRefreshing}
        devices={ws.devices}
        isEntityTogglePending={ws.isEntityTogglePending}
        onSave={() => void ws.saveHomeAssistantConfig()}
        onTest={() => void ws.testHomeAssistant()}
        onRefreshEntities={() => void ws.refreshHomeAssistantEntities()}
        onToggleDevice={ws.runDeviceToggle}
        onError={ws.reportError}
      />

      <div className="grid householdAutomationGrid">
        <AutomationRulesPanel
          isRefreshing={ws.isRefreshing}
          rules={ws.rules}
          devices={ws.devices}
          onRefresh={ws.refreshAll}
          onError={ws.reportError}
          onDeleteRule={(id, name) => void ws.deleteRuleById(id, name)}
          onSetRuleEnabled={(id, enabled) => void ws.setRuleEnabledById(id, enabled)}
        />
        <AutomationLogsPanel isRefreshing={ws.isRefreshing} logs={ws.logs} />
      </div>
    </main>
  );
}

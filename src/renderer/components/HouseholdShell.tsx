import { useAssistantWorkspace } from "../hooks/useAssistantWorkspace";
import { ThemeSelect } from "./layout/ThemeSelect";
import { WelcomeBar } from "./layout/WelcomeBar";
import { HomeAssistantPanel } from "./panels/HomeAssistantPanel";
import { AutomationLogsPanel } from "./panels/AutomationLogsPanel";
import { AutomationRulesPanel } from "./panels/AutomationRulesPanel";

export function HouseholdShell(): JSX.Element {
  const { ui, data, ha, automation, profile } = useAssistantWorkspace();

  return (
    <main className="container householdWindowLayout">
      <header className="householdWindowHeader">
        <div className="householdWindowLead">
          <WelcomeBar
            userPreferredName={profile.userPreferredName}
            userPreferredNameIsSet={profile.userPreferredNameIsSet}
            onSaveUserPreferredName={profile.persistUserPreferredName}
            idPrefix="household"
          />
          <p className="addOnEyebrow">Nice to have</p>
          <h1 className="addOnTitle">Household</h1>
          <p className="muted addOnLead">
            Home Assistant and timed rules. Your memos and follow-ups stay in the <strong>desk</strong> window.
          </p>
        </div>
        <div className="householdWindowActions">
          <ThemeSelect theme={ui.theme} onChange={ui.setTheme} selectId="theme-select-household" />
          <button type="button" className="ghostButton" onClick={() => void window.assistantApi.focusDeskWindow()}>
            Desk window
          </button>
        </div>
      </header>

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
        onSave={() => void ha.saveHomeAssistantConfig()}
        onTest={() => void ha.testHomeAssistant()}
        onRefreshEntities={() => void ha.refreshHomeAssistantEntities()}
        onToggleDevice={ha.runDeviceToggle}
        onError={ui.reportError}
      />

      <div className="grid householdAutomationGrid">
        <AutomationRulesPanel
          isRefreshing={data.isRefreshing}
          rules={data.rules}
          devices={data.devices}
          onRefresh={data.refreshAll}
          onError={ui.reportError}
          onDeleteRule={(id, name) => void automation.deleteRuleById(id, name)}
          onSetRuleEnabled={(id, enabled) => void automation.setRuleEnabledById(id, enabled)}
        />
        <AutomationLogsPanel isRefreshing={data.isRefreshing} logs={data.logs} />
      </div>
    </main>
  );
}

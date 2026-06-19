import { CommandPalette } from "../panels/CommandPalette";
import { AppearancePanel } from "../panels/AppearancePanel";
import { DataControlPanel } from "../panels/DataControlPanel";
import { AiSettingsPanel } from "../panels/AiSettingsPanel";
import { ConnectedAccountsPanel } from "../panels/ConnectedAccountsPanel";
import { AboutPanel } from "../panels/AboutPanel";
import { ReleaseNotesPanel } from "../panels/ReleaseNotesPanel";
import { QuickCaptureDialog } from "../dialogs/QuickCaptureDialog";
import { PanelErrorBoundary } from "../ErrorBoundary";
import { setAutomationFocusIntent } from "../../lib/automation-focus-intent";
import type { ShellModals } from "../../hooks/shell/useShellModals";
import type { QuickCaptureType } from "../../hooks/shell/useShellNav";
import type { AiConfigState } from "../../hooks/shell/useAiConfig";
import type { AssistantWorkspace } from "../../hooks/workspace/workspaceTypes";
import type { TeamState } from "../../hooks/team/useTeamState";
import type { useBackupActions } from "../../hooks/workspace/useBackupActions";

export type ShellOverlaysProps = {
  modals: ShellModals;
  appVersion: string;
  workspace: AssistantWorkspace;
  team: TeamState;
  backupActions: ReturnType<typeof useBackupActions>;
  ai: AiConfigState;
  quickCapture: {
    isOpen: boolean;
    type: QuickCaptureType;
    text: string;
    close: () => void;
  };
  onOpenLocalNote: (id: string) => void;
  onOpenLocalTask: (id: string) => void;
  onOpenLocalReminder: (id: string) => void;
  onOpenTeamTask: (id: string) => void;
  onOpenHousehold: () => void;
  onConnectedAccountsChanged: () => Promise<void>;
  onReleaseNotesOpenAbout: () => void;
  onCloseReleaseNotes: () => void;
  onQuickCaptureSaved: (type: QuickCaptureType) => Promise<void>;
};

export function ShellOverlays({
  modals,
  appVersion,
  workspace,
  team,
  backupActions,
  ai,
  quickCapture,
  onOpenLocalNote,
  onOpenLocalTask,
  onOpenLocalReminder,
  onOpenTeamTask,
  onOpenHousehold,
  onConnectedAccountsChanged,
  onReleaseNotesOpenAbout,
  onCloseReleaseNotes,
  onQuickCaptureSaved
}: ShellOverlaysProps): JSX.Element {
  const { ui, data, ha, display } = workspace;

  return (
    <>
      {modals.showPalette && (
        <PanelErrorBoundary
          scope="overlay:command-palette"
          fallbackTitle="Command palette hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showPalette]}
        >
          <CommandPalette
            notes={data.notes}
            tasks={data.tasks}
            reminders={data.reminders}
            rules={data.rules}
            devices={data.devices}
            teamTasks={team.tasks}
            teamProjects={team.projects}
            onOpenNote={(id) => {
              data.setQuery("");
              onOpenLocalNote(id);
            }}
            onOpenTask={(id) => {
              workspace.tasks.setFilter("all");
              onOpenLocalTask(id);
            }}
            onOpenReminder={(id) => {
              workspace.reminders.setFilter("all");
              onOpenLocalReminder(id);
            }}
            onOpenAutomation={(id) => {
              setAutomationFocusIntent(id);
              onOpenHousehold();
            }}
            onToggleDevice={(entityId) => {
              void ha.runDeviceToggle(entityId, entityId);
            }}
            onOpenTeamTask={onOpenTeamTask}
            onOpenAppearance={modals.openAppearance}
            onClose={modals.closePalette}
          />
        </PanelErrorBoundary>
      )}

      {modals.showAppearance && (
        <PanelErrorBoundary
          scope="overlay:appearance"
          fallbackTitle="Appearance settings hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showAppearance]}
        >
          <AppearancePanel
            theme={ui.theme}
            custom={ui.custom}
            display={display}
            onPresetChange={ui.setTheme}
            onOverride={ui.setCustomOverride}
            onReset={ui.resetCustomOverrides}
            onClose={modals.closeAppearance}
          />
        </PanelErrorBoundary>
      )}
      {modals.showData && (
        <PanelErrorBoundary
          scope="overlay:data-control"
          fallbackTitle="Data control hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showData]}
        >
          <DataControlPanel
            onExport={backupActions.exportData}
            onImport={backupActions.importData}
            onReset={backupActions.resetData}
            onHealthCheck={backupActions.healthCheck}
            onOptimize={backupActions.optimize}
            isExporting={backupActions.isExporting}
            isImporting={backupActions.isImporting}
            isResetting={backupActions.isResetting}
            isHealthChecking={backupActions.isHealthChecking}
            isOptimizing={backupActions.isOptimizing}
            lastHealthCheck={backupActions.lastHealthCheck}
            lastOptimize={backupActions.lastOptimize}
            optimizeSuggestion={backupActions.optimizeSuggestion}
          />
        </PanelErrorBoundary>
      )}
      {modals.showAi && (
        <PanelErrorBoundary
          scope="overlay:ai-settings"
          fallbackTitle="AI settings hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showAi]}
        >
          <AiSettingsPanel
            config={ai.config}
            onSetKey={ai.setKey}
            onClearKey={ai.clearKey}
            onTestKey={ai.testKey}
            onRefresh={ai.refresh}
            onClose={modals.closeAi}
          />
        </PanelErrorBoundary>
      )}
      {modals.showConnectedAccounts && (
        <PanelErrorBoundary
          scope="overlay:connected-accounts"
          fallbackTitle="Connected accounts hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showConnectedAccounts]}
        >
          <ConnectedAccountsPanel
            onClose={modals.closeConnectedAccounts}
            onError={ui.reportError}
            onSuccess={ui.showSuccess}
            onAccountsChanged={onConnectedAccountsChanged}
          />
        </PanelErrorBoundary>
      )}

      {modals.showAbout ? (
        <PanelErrorBoundary
          scope="overlay:about"
          fallbackTitle="About panel hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showAbout]}
        >
          <div className="onboardingHero">
            <AboutPanel version={appVersion} onClose={modals.closeAbout} />
          </div>
        </PanelErrorBoundary>
      ) : null}

      <PanelErrorBoundary
        scope="overlay:quick-capture"
        fallbackTitle="Quick capture hit a snag"
        onCaught={({ message }) => ui.reportError(message)}
        resetKeys={[quickCapture.isOpen, quickCapture.type]}
      >
        <QuickCaptureDialog
          isOpen={quickCapture.isOpen}
          onClose={quickCapture.close}
          initialType={quickCapture.type}
          initialText={quickCapture.text}
          onShowSuccess={ui.showSuccess}
          onError={ui.reportError}
          onSaved={onQuickCaptureSaved}
        />
      </PanelErrorBoundary>

      {modals.showReleaseNotes ? (
        <PanelErrorBoundary
          scope="overlay:release-notes"
          fallbackTitle="Release notes hit a snag"
          onCaught={({ message }) => ui.reportError(message)}
          resetKeys={[modals.showReleaseNotes]}
        >
          <div className="onboardingHero">
            <ReleaseNotesPanel
              version={appVersion}
              onClose={onCloseReleaseNotes}
              onOpenAbout={onReleaseNotesOpenAbout}
            />
          </div>
        </PanelErrorBoundary>
      ) : null}
    </>
  );
}

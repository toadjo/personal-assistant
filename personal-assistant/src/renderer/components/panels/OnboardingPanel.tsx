type Props = {
  visible: boolean;
  haReady: boolean;
  commandHistoryLength: number;
  onHideForNow: () => void;
  onFinishSetup: () => void;
  onRunPreset: (command: string) => void;
};

export function OnboardingPanel({
  visible,
  haReady,
  commandHistoryLength,
  onHideForNow,
  onFinishSetup,
  onRunPreset
}: Props): JSX.Element | null {
  if (!visible) return null;
  return (
    <section className="panel onboarding">
      <div className="titleRow">
        <h2>Quick Start</h2>
        <div className="miniActions">
          <button className="ghostButton" onClick={onHideForNow}>
            Hide for now
          </button>
          <button className="ghostButton" disabled={!haReady || commandHistoryLength === 0} onClick={onFinishSetup}>
            Finish setup
          </button>
        </div>
      </div>
      <p className="muted">
        1) Add your Home Assistant URL + token, then click <strong>Refresh Entities</strong>.
      </p>
      <p className="muted">2) Use the command prompt for fast actions in plain English.</p>
      <p className="muted">3) Closing the window keeps the app running in the Windows tray.</p>
      <ul className="onboardingChecklist">
        <li className="onboardingChecklistItem">
          <span>Home Assistant connected</span>
          <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>{haReady ? "Done" : "Pending"}</span>
        </li>
        <li className="onboardingChecklistItem">
          <span>First command executed</span>
          <span className={`onboardingState ${commandHistoryLength > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}>
            {commandHistoryLength > 0 ? "Done" : "Pending"}
          </span>
        </li>
      </ul>
      <div className="presetRow">
        <button type="button" className="ghostButton" onClick={() => onRunPreset("new note check water filter")}>
          Create sample note
        </button>
        <button type="button" className="ghostButton" onClick={() => onRunPreset("remind stretch in 10m")}>
          Create sample reminder
        </button>
        <button type="button" className="ghostButton" onClick={() => onRunPreset("list reminders")}>
          Show reminders
        </button>
      </div>
    </section>
  );
}

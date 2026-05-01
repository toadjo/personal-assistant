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
        <h2>First time here</h2>
        <div className="miniActions">
          <button type="button" className="ghostButton" onClick={onHideForNow}>
            Skip
          </button>
          <button type="button" className="ghostButton" disabled={commandHistoryLength === 0} onClick={onFinishSetup}>
            Done
          </button>
        </div>
      </div>
      <p className="muted">
        Connect Home Assistant below if you use it. The window can close—the app stays in the tray. Use <strong>Ask</strong> for everything else.
      </p>
      <ul className="onboardingChecklist">
        <li className="onboardingChecklistItem">
          <span>Home Assistant</span>
          <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>{haReady ? "Ready" : "Optional"}</span>
        </li>
        <li className="onboardingChecklistItem">
          <span>First command</span>
          <span className={`onboardingState ${commandHistoryLength > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}>
            {commandHistoryLength > 0 ? "Done" : "Try Ask"}
          </span>
        </li>
      </ul>
      <div className="presetRow">
        <button type="button" className="ghostButton" onClick={() => onRunPreset("new note check water filter")}>
          Sample note
        </button>
        <button type="button" className="ghostButton" onClick={() => onRunPreset("remind stretch in 10m")}>
          Sample reminder
        </button>
        <button type="button" className="ghostButton" onClick={() => onRunPreset("help")}>
          Commands
        </button>
      </div>
    </section>
  );
}

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
        Add your name at the top left for a personal greeting. Your desk is memos, follow-ups, and the line below. The
        window can close—the app stays in the tray. Home Assistant is optional—open the <strong>Household</strong>{" "}
        window from <strong>House</strong> or the tray when you want it.
      </p>
      <ul className="onboardingChecklist">
        <li className="onboardingChecklistItem">
          <span>Household (Home Assistant)</span>
          <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>
            {haReady ? "Ready" : "Optional"}
          </span>
        </li>
        <li className="onboardingChecklistItem">
          <span>First command</span>
          <span
            className={`onboardingState ${commandHistoryLength > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}
          >
            {commandHistoryLength > 0 ? "Done" : "Try a line"}
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

import { Compass, CheckCircle } from "lucide-react";

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
        <h2>
          <Compass size={16} className="panelHeaderIcon" /> First time here
        </h2>
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
        Welcome to PersonalAssistant. This app helps you capture notes, set reminders, and control your home—all from your
        desktop. Everything stays on your computer. The app lives in your system tray—close the window and it keeps
        running. Home Assistant is optional—connect whenever you're ready.
      </p>
      <ul className="onboardingChecklist">
        <li className="onboardingChecklistItem">
          <span>Household (Home Assistant)</span>
          <span className={`onboardingState ${haReady ? "onboardingStateDone" : "onboardingStatePending"}`}>
            {haReady ? <CheckCircle size={12} /> : null} {haReady ? "Ready" : "Optional"}
          </span>
        </li>
        <li className="onboardingChecklistItem">
          <span>First command</span>
          <span
            className={`onboardingState ${commandHistoryLength > 0 ? "onboardingStateDone" : "onboardingStatePending"}`}
          >
            {commandHistoryLength > 0 ? <CheckCircle size={12} /> : null}{" "}
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

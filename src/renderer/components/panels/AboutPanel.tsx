import { useState, useCallback } from "react";
import { Info, HardDrive, MessageSquare } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { getAssistantApi } from "../../lib/assistantApi";

type Props = {
  version: string;
  onClose?: () => void;
};

export function AboutPanel({ version, onClose }: Props): JSX.Element {
  const [bugError, setBugError] = useState<string | null>(null);

  const handleBugReport = useCallback(() => {
    setBugError(null);
    const api = getAssistantApi();
    if (!api?.openBugReport) {
      setBugError("Bug reporting is not available in this build.");
      return;
    }
    void api.openBugReport().catch(() => {
      setBugError(
        "Could not open GitHub issues. You can visit github.com/toadjo/Personal-Assistant-R/issues manually."
      );
    });
  }, []);

  return (
    <section className="panel" aria-labelledby="about-panel-heading">
      <PanelHeader
        icon={Info}
        title="About"
        actions={
          onClose ? (
            <button type="button" className="ghostButton" onClick={onClose}>
              Close
            </button>
          ) : null
        }
      />
      <div className="aboutContent">
        <h3>PersonalAssistant {version}</h3>
        <p className="muted">
          A desktop utility for notes, tasks, reminders, and optional household assistant workflows.
        </p>

        <div className="aboutSection">
          <div className="aboutSectionHeader">
            <HardDrive size={16} />
            <h4>Data Storage</h4>
          </div>
          <p className="muted">Your notes, reminders, and settings are stored locally on your computer.</p>
          <p className="muted small">
            Location: <code>%APPDATA%\PersonalAssistant</code>
          </p>
          <p className="muted small">To backup your data, copy this folder to a safe location.</p>
        </div>

        <div className="aboutSection">
          <div className="aboutSectionHeader">
            <MessageSquare size={16} />
            <h4>Feedback</h4>
          </div>
          <p className="muted">Found a bug or have a suggestion? Report it on GitHub.</p>
          <button type="button" className="ghostButton" onClick={handleBugReport} aria-label="Report a bug">
            Report a bug
          </button>
          {bugError ? <p className="aboutWarning">{bugError}</p> : null}
        </div>
      </div>
    </section>
  );
}

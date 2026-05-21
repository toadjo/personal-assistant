import { Info } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { getReleaseNote } from "../../lib/release-notes.generated";

type Props = {
  version: string;
  onClose: () => void;
  onOpenAbout: () => void;
};

export function ReleaseNotesPanel({ version, onClose, onOpenAbout }: Props): JSX.Element {
  const releaseNote = getReleaseNote(version);

  if (!releaseNote) {
    return (
      <section className="panel" aria-labelledby="release-notes-panel-heading">
        <PanelHeader
          icon={Info}
          title="Release Notes"
          actions={
            <>
              <button type="button" className="ghostButton" onClick={onOpenAbout}>
                About
              </button>
              <button type="button" className="ghostButton" onClick={onClose}>
                Close
              </button>
            </>
          }
        />
        <div className="panelContent">
          <p className="muted">No release notes available for version {version}.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="release-notes-panel-heading">
      <PanelHeader
        icon={Info}
        title={`What's New in ${version}`}
        actions={
          <>
            <button type="button" className="ghostButton" onClick={onOpenAbout}>
              About
            </button>
            <button type="button" className="ghostButton" onClick={onClose}>
              Close
            </button>
          </>
        }
      />
      <div className="panelContent">
        <div className="releaseNotes">
          <div className="releaseNotesDate">{releaseNote.date}</div>
          <div className="releaseNotesMarkdown">
            {releaseNote.markdown.split("\n").map((line, index) => {
              if (line.startsWith("### ")) {
                const heading = line.replace("### ", "");
                return <h4 key={index}>{heading}</h4>;
              }
              if (line.startsWith("- ")) {
                return <li key={index}>{line.replace("- ", "")}</li>;
              }
              if (line.trim() === "") {
                return <br key={index} />;
              }
              if (!line.startsWith("#") && !line.startsWith("[")) {
                return <p key={index}>{line}</p>;
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

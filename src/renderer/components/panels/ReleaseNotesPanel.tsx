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
            {(() => {
              const lines = releaseNote.markdown.split("\n");
              const elements: JSX.Element[] = [];
              let inList = false;

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;

                if (line.startsWith("### ")) {
                  if (inList) {
                    elements.push(
                      <ul key={`list-${i}`}>
                        {elements.splice(elements.length - elements.filter((el) => el.type === "li").length)}
                      </ul>
                    );
                    inList = false;
                  }
                  const heading = line.replace("### ", "");
                  elements.push(<h3 key={i}>{heading}</h3>);
                } else if (line.startsWith("- ")) {
                  if (!inList) {
                    inList = true;
                  }
                  elements.push(<li key={i}>{line.replace("- ", "")}</li>);
                } else if (line.trim() === "") {
                  if (inList) {
                    const listItems = elements.splice(
                      elements.length - elements.filter((el) => el.type === "li").length
                    );
                    elements.push(<ul key={`list-${i}`}>{listItems}</ul>);
                    inList = false;
                  }
                  elements.push(<br key={i} />);
                } else if (!line.startsWith("#") && !line.startsWith("[")) {
                  if (inList) {
                    const listItems = elements.splice(
                      elements.length - elements.filter((el) => el.type === "li").length
                    );
                    elements.push(<ul key={`list-${i}`}>{listItems}</ul>);
                    inList = false;
                  }
                  elements.push(<p key={i}>{line}</p>);
                }

                // Close list at end if still open
                if (i === lines.length - 1 && inList) {
                  const listItems = elements.splice(elements.length - elements.filter((el) => el.type === "li").length);
                  elements.push(<ul key={`list-end`}>{listItems}</ul>);
                }
              }

              return elements;
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}

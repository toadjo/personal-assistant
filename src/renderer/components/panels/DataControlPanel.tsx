import { useRef } from "react";
import { Database, Download, Upload, Trash2 } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import type { BackupResult } from "../../hooks/workspace/useBackupActions";

type Props = {
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<BackupResult | null>;
  onReset: () => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
  isResetting: boolean;
};

export function DataControlPanel({
  onExport,
  onImport,
  onReset,
  isExporting,
  isImporting,
  isResetting
}: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    await onImport(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Database} title="Data" />
      <p className="muted sectionIntro">Back up and restore your data, or start fresh.</p>

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", padding: "var(--space-2) 0" }}>
        <button type="button" className="ghostButton" onClick={() => void onExport()} disabled={isExporting}>
          <Download size={14} />
          {isExporting ? "Exporting..." : "Export backup"}
        </button>

        <button
          type="button"
          className="ghostButton"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
        >
          <Upload size={14} />
          {isImporting ? "Importing..." : "Import backup"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      <div style={{ padding: "var(--space-2) 0", borderTop: "1px solid var(--borderColor)" }}>
        <button
          type="button"
          className="ghostButton dangerGhostButton"
          onClick={() => void onReset()}
          disabled={isResetting}
        >
          <Trash2 size={14} />
          {isResetting ? "Resetting..." : "Delete all data"}
        </button>
      </div>
    </section>
  );
}

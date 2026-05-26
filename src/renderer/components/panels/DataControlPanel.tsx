import { useRef } from "react";
import { Database, Download, Upload, Trash2, Activity, Zap } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import type { BackupResult } from "../../hooks/workspace/useBackupActions";

type Props = {
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<BackupResult | null>;
  onReset: () => Promise<void>;
  onHealthCheck?: () => Promise<void>;
  onOptimize?: () => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
  isResetting: boolean;
  isHealthChecking?: boolean;
  isOptimizing?: boolean;
};

export function DataControlPanel({
  onExport,
  onImport,
  onReset,
  onHealthCheck,
  onOptimize,
  isExporting,
  isImporting,
  isResetting,
  isHealthChecking = false,
  isOptimizing = false
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

  const isBusy = isExporting || isImporting || isResetting || isHealthChecking || isOptimizing;

  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Database} title="Data" />
      <p className="muted sectionIntro">Back up, restore, and optimize your data. Run health checks to ensure database integrity.</p>

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", padding: "var(--space-2) 0" }}>
        <button type="button" className="ghostButton" onClick={() => void onExport()} disabled={isBusy}>
          <Download size={14} />
          {isExporting ? "Exporting..." : "Export backup"}
        </button>

        <button type="button" className="ghostButton" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
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

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", padding: "var(--space-2) 0", borderTop: "1px solid var(--borderColor)" }}>
        {onHealthCheck && (
          <button type="button" className="ghostButton" onClick={() => void onHealthCheck()} disabled={isBusy}>
            <Activity size={14} />
            {isHealthChecking ? "Checking..." : "Health check"}
          </button>
        )}
        {onOptimize && (
          <button type="button" className="ghostButton" onClick={() => void onOptimize()} disabled={isBusy}>
            <Zap size={14} />
            {isOptimizing ? "Optimizing..." : "Optimize database"}
          </button>
        )}
      </div>

      <div style={{ padding: "var(--space-2) 0", borderTop: "1px solid var(--borderColor)" }}>
        <button
          type="button"
          className="ghostButton dangerGhostButton"
          onClick={() => void onReset()}
          disabled={isBusy}
        >
          <Trash2 size={14} />
          {isResetting ? "Resetting..." : "Delete all data"}
        </button>
      </div>
    </section>
  );
}

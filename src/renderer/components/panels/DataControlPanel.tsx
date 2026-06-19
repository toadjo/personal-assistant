import { useRef } from "react";
import { Database, Download, Upload, Trash2, Activity, Zap, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import type { BackupResult, HealthCheckResult, OptimizeResult, OptimizeSuggestion } from "../../hooks/workspace/useBackupActions";

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
  lastHealthCheck?: HealthCheckResult | null;
  lastOptimize?: OptimizeResult | null;
  optimizeSuggestion?: OptimizeSuggestion | null;
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
  isOptimizing = false,
  lastHealthCheck,
  lastOptimize,
  optimizeSuggestion
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

  const renderHealthStatus = () => {
    if (!lastHealthCheck) return null;

    const StatusIcon = lastHealthCheck.overall_health === "healthy" ? CheckCircle : lastHealthCheck.overall_health === "degraded" ? AlertCircle : XCircle;
    const statusColor = lastHealthCheck.overall_health === "healthy" ? "var(--successColor)" : lastHealthCheck.overall_health === "degraded" ? "var(--warningColor)" : "var(--errorColor)";

    return (
      <div style={{ 
        padding: "var(--space-2)", 
        backgroundColor: "var(--backgroundColor)", 
        borderRadius: "4px", 
        fontSize: "12px",
        marginTop: "var(--space-2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
          <StatusIcon size={14} style={{ color: statusColor }} />
          <strong style={{ color: statusColor }}>{lastHealthCheck.overall_health.toUpperCase()}</strong>
        </div>
        <div style={{ color: "var(--mutedColor)" }}>
          Integrity: {lastHealthCheck.integrity_check.passed ? "OK" : "FAILED"} | 
          Schema: {lastHealthCheck.schema_check.passed ? "OK" : "FAILED"} | 
          Data: {lastHealthCheck.data_check.corrupted_records === 0 ? "OK" : "ISSUES"}
        </div>
      </div>
    );
  };

  const renderOptimizeStatus = () => {
    if (!lastOptimize) return null;

    const StatusIcon = lastOptimize.success ? CheckCircle : XCircle;
    const statusColor = lastOptimize.success ? "var(--successColor)" : "var(--errorColor)";

    return (
      <div style={{
        padding: "var(--space-2)",
        backgroundColor: "var(--backgroundColor)",
        borderRadius: "4px",
        fontSize: "12px",
        marginTop: "var(--space-2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <StatusIcon size={14} style={{ color: statusColor }} />
          <span style={{ color: statusColor }}>{lastOptimize.message}</span>
        </div>
      </div>
    );
  };

  const renderOptimizeSuggestion = () => {
    if (!optimizeSuggestion || !optimizeSuggestion.shouldOptimize) return null;

    return (
      <div style={{
        padding: "var(--space-2)",
        backgroundColor: "var(--infoBackgroundColor)",
        borderRadius: "4px",
        fontSize: "12px",
        marginTop: "var(--space-2)",
        border: "1px solid var(--infoBorderColor)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Info size={14} style={{ color: "var(--infoColor)" }} />
          <span style={{ color: "var(--infoColor)" }}>
            You've made {optimizeSuggestion.writesSinceOptimize}+ changes since last optimize — consider optimizing.
          </span>
        </div>
      </div>
    );
  };

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

      {renderHealthStatus()}
      {renderOptimizeStatus()}
      {renderOptimizeSuggestion()}

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

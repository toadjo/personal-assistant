import { useState } from "react";
import { Check, Sparkles, Trash2, X } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import type { AiConfigStatus, AiProvider } from "../../../shared/ai/types";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

type Props = {
  config: AiConfigStatus | null;
  onSetKey: (provider: AiProvider, apiKey: string) => Promise<AiConfigStatus>;
  onClearKey: () => Promise<AiConfigStatus>;
  onTestKey: () => Promise<{ success: true; model: string }>;
  onRefresh: () => Promise<AiConfigStatus>;
  onClose: () => void;
};

export function AiSettingsPanel({ config, onSetKey, onClearKey, onTestKey, onRefresh, onClose }: Props): JSX.Element {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: true; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerOptions: { value: AiProvider; label: string }[] = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" }
  ];

  async function handleSave(): Promise<void> {
    if (!selectedProvider) return;
    if (!apiKey.trim()) {
      setError("API key is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setTestResult(null);
    try {
      await onSetKey(selectedProvider, apiKey.trim());
      await onRefresh();
      setApiKey("");
      setSelectedProvider(null);
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest(): Promise<void> {
    if (!config?.provider) return;
    setIsTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await onTestKey();
      setTestResult(result);
      await onRefresh();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsTesting(false);
    }
  }

  async function handleClear(): Promise<void> {
    setIsClearing(true);
    setError(null);
    setTestResult(null);
    try {
      await onClearKey();
      await onRefresh();
    } catch (err) {
      setError(getAssistantInvokeErrorMessage(err));
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Sparkles} title="AI Configuration" />
      <p className="muted sectionIntro">Configure AI provider for assistant features.</p>

      {config?.configured ? (
        <div style={{ padding: "var(--space-2) 0" }}>
          <div className="row" style={{ gap: "0.5rem", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <span className="muted">Provider:</span>
            <strong>{config.provider === "openai" ? "OpenAI" : "Anthropic"}</strong>
          </div>
          {config.lastTestedAt && (
            <div className="row" style={{ gap: "0.5rem", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span className="muted">Last tested:</span>
              <span>{new Date(config.lastTestedAt).toLocaleString()}</span>
            </div>
          )}
          <p className="muted" style={{ marginBottom: "var(--space-2)" }}>
            AI is connected. Type natural-language requests in the command box above.
          </p>
          <div className="row" style={{ gap: "0.5rem", marginTop: "var(--space-2)" }}>
            <button type="button" className="ghostButton" onClick={() => void handleTest()} disabled={isTesting}>
              <Check size={14} />
              {isTesting ? "Testing..." : "Test connection"}
            </button>
            <button
              type="button"
              className="ghostButton dangerGhostButton"
              onClick={() => void handleClear()}
              disabled={isClearing}
            >
              <Trash2 size={14} />
              {isClearing ? "Clearing..." : "Disconnect"}
            </button>
          </div>
          {testResult && (
            <div
              style={{
                marginTop: "var(--space-2)",
                padding: "var(--space-2)",
                backgroundColor: "var(--successBg)",
                borderRadius: "4px"
              }}
            >
              <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
                <Check size={14} style={{ color: "var(--success)" }} />
                <span style={{ color: "var(--success)" }}>Connection successful. Model: {testResult.model}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "var(--space-2) 0" }}>
          <div className="row" style={{ gap: "0.5rem", marginBottom: "var(--space-2)" }}>
            <label htmlFor="ai-provider-select" className="muted">
              Provider:
            </label>
            <select
              id="ai-provider-select"
              value={selectedProvider ?? ""}
              onChange={(e) => setSelectedProvider(e.target.value as AiProvider)}
              style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", border: "1px solid var(--borderColor)" }}
            >
              <option value="">Select provider...</option>
              {providerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: "0.5rem", marginBottom: "var(--space-2)" }}>
            <label htmlFor="ai-key-input" className="muted">
              API key:
            </label>
            <input
              id="ai-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                flex: 1,
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--borderColor)"
              }}
            />
          </div>
          <div className="row" style={{ gap: "0.5rem", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              className="ghostButton"
              onClick={() => void handleSave()}
              disabled={!selectedProvider || isSaving}
            >
              <Check size={14} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "var(--space-2)",
            padding: "var(--space-2)",
            backgroundColor: "var(--errorBg)",
            borderRadius: "4px"
          }}
        >
          <span style={{ color: "var(--error)" }}>{error}</span>
        </div>
      )}

      <div
        style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--borderColor)" }}
      >
        <button type="button" className="ghostButton" onClick={onClose}>
          <X size={14} />
          Close
        </button>
      </div>
    </section>
  );
}

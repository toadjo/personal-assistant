import { Info, AlertTriangle } from "lucide-react";

type Props = {
  status: string;
  error: string;
};

export function StatusBanner({ status, error }: Props): JSX.Element {
  return (
    <>
      {status ? (
        <p
          className="status statusAssistant"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="desk-status-banner"
        >
          <span className="statusBadge" aria-hidden="true">
            <Info size={12} /> Assistant
          </span>
          <span className="statusMessage">{status}</span>
        </p>
      ) : null}
      {error ? (
        <p
          className="error errorAssistant"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          data-testid="desk-error-banner"
        >
          <span className="errorBadge" aria-hidden="true">
            <AlertTriangle size={12} /> Heads up
          </span>
          <span className="errorMessage">{error}</span>
        </p>
      ) : null}
    </>
  );
}

/**
 * Persistent success feedback banner (v1.2.7).
 * Displays success messages that stay visible longer than transient status updates.
 */

import type { SuccessMessage } from "../../hooks/ui/usePersistentSuccess";

type Props = {
  successes: SuccessMessage[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
};

export function SuccessBanner({ successes, onDismiss, onDismissAll }: Props): JSX.Element | null {
  if (successes.length === 0) return null;

  return (
    <div className="success-banner">
      <div className="success-banner-content">
        {successes.map((success) => (
          <div key={success.id} className="success-message">
            <span className="success-icon">✓</span>
            <span className="success-text">{success.message}</span>
            <button
              type="button"
              className="ghostButton success-dismiss"
              onClick={() => onDismiss(success.id)}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        ))}
        {successes.length > 1 && (
          <button
            type="button"
            className="ghostButton success-dismiss-all"
            onClick={onDismissAll}
            aria-label="Dismiss all success messages"
          >
            Dismiss all
          </button>
        )}
      </div>
    </div>
  );
}

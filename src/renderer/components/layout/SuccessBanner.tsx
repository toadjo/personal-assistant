/**
 * Persistent success feedback banner (v1.2.7).
 * Displays success messages that stay visible longer than transient status updates.
 */

import { Check, X } from "lucide-react";
import type { SuccessMessage } from "../../hooks/ui/usePersistentSuccess";
import { IconButton } from "../ui/IconButton";

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
            <Check size={14} className="success-icon" />
            <span className="success-text">{success.message}</span>
            <IconButton
              icon={X}
              label="Dismiss success message"
              onClick={() => onDismiss(success.id)}
              variant="ghost"
              size={12}
            />
          </div>
        ))}
        {successes.length > 1 && (
          <IconButton
            icon={X}
            label="Dismiss all success messages"
            onClick={onDismissAll}
            variant="ghost"
            size={12}
            className="success-dismiss-all"
          />
        )}
      </div>
    </div>
  );
}

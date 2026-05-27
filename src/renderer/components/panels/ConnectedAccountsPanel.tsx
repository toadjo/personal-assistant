import { useCallback, useEffect, useState } from "react";
import { Calendar, Link2, RefreshCw, Trash2, X } from "lucide-react";
import type { ConnectedCalendarAccount, ConnectedCalendarProvider } from "../../../shared/types";
import { PanelHeader } from "../ui/PanelHeader";
import { LoadingState } from "../life-areas/LoadingState";
import { requireAssistantApi } from "../../lib/assistantApi";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

type Props = {
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onAccountsChanged: () => Promise<void>;
};

function providerLabel(provider: ConnectedCalendarProvider): string {
  return provider === "google" ? "Google Calendar" : "Outlook / Microsoft 365";
}

function syncStateLabel(syncState: ConnectedCalendarAccount["syncState"]): string {
  switch (syncState) {
    case "synced":
      return "Synced";
    case "syncing":
      return "Syncing…";
    case "connecting":
      return "Connecting…";
    case "error":
      return "Error";
    default:
      return "Disconnected";
  }
}

function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never";
  return new Date(lastSyncAt).toLocaleString();
}

function isSetupError(message: string): boolean {
  return /client id is not configured/i.test(message);
}

export function ConnectedAccountsPanel({ onClose, onError, onSuccess, onAccountsChanged }: Props): JSX.Element {
  const [accounts, setAccounts] = useState<ConnectedCalendarAccount[]>([]);
  const [summary, setSummary] = useState<{ total: number; synced: number; error: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<ConnectedCalendarProvider | null>(null);
  const [oauthInstructions, setOauthInstructions] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const api = requireAssistantApi();
      const [list, accountSummary] = await Promise.all([
        api.listConnectedCalendarAccounts(),
        api.getConnectedCalendarAccountsSummary()
      ]);
      setAccounts(list);
      setSummary(accountSummary);
    } catch (error) {
      onError(getAssistantInvokeErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleConnect(provider: ConnectedCalendarProvider): Promise<void> {
    setPendingProvider(provider);
    setOauthInstructions(true);
    try {
      const api = requireAssistantApi();
      await api.startConnectedCalendarOAuth({ provider });
      onSuccess("Browser opened. Sign in, then return here and click Complete sign-in.");
    } catch (error) {
      const message = getAssistantInvokeErrorMessage(error);
      onError(isSetupError(message) ? "Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID or MICROSOFT_CALENDAR_CLIENT_ID for development." : message);
      setOauthInstructions(false);
      setPendingProvider(null);
    }
  }

  async function handleCompleteOAuth(): Promise<void> {
    if (!pendingProvider) return;
    try {
      const api = requireAssistantApi();
      await api.completeConnectedCalendarOAuth({ provider: pendingProvider });
      onSuccess(`${providerLabel(pendingProvider)} connected.`);
      setOauthInstructions(false);
      setPendingProvider(null);
      await loadAccounts();
      await onAccountsChanged();
    } catch (error) {
      const message = getAssistantInvokeErrorMessage(error);
      onError(isSetupError(message) ? "Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID or MICROSOFT_CALENDAR_CLIENT_ID for development." : message);
    }
  }

  async function handleSyncAccount(accountId: string): Promise<void> {
    setBusyAccountId(accountId);
    try {
      const api = requireAssistantApi();
      await api.syncConnectedCalendarAccount({ accountId });
      onSuccess("Calendar sync finished.");
      await loadAccounts();
      await onAccountsChanged();
    } catch (error) {
      onError(getAssistantInvokeErrorMessage(error));
    } finally {
      setBusyAccountId(null);
    }
  }

  async function handleSyncAll(): Promise<void> {
    setIsSyncingAll(true);
    try {
      const api = requireAssistantApi();
      await api.syncAllConnectedCalendarAccounts();
      onSuccess("All connected calendars synced.");
      await loadAccounts();
      await onAccountsChanged();
    } catch (error) {
      onError(getAssistantInvokeErrorMessage(error));
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function handleDisconnect(account: ConnectedCalendarAccount): Promise<void> {
    const confirmed = window.confirm(
      `Disconnect ${account.email}?\n\nCached ${providerLabel(account.provider)} events will be removed from this device.`
    );
    if (!confirmed) return;
    setBusyAccountId(account.id);
    try {
      const api = requireAssistantApi();
      await api.disconnectConnectedCalendarAccount(account.id);
      onSuccess("Account disconnected.");
      await loadAccounts();
      await onAccountsChanged();
    } catch (error) {
      onError(getAssistantInvokeErrorMessage(error));
    } finally {
      setBusyAccountId(null);
    }
  }

  return (
    <section className="panel connectedAccountsPanel" aria-labelledby="connected-accounts-heading">
      <PanelHeader
        icon={Link2}
        title="Connected Accounts"
        actions={
          <button type="button" className="ghostButton ghostButtonCompact" aria-label="Close connected accounts" onClick={onClose}>
            <X size={14} />
          </button>
        }
      />
      <p className="muted" id="connected-accounts-heading">
        Connect Google Calendar or Outlook / Microsoft 365 to show read-only events in your calendar, including Teams
        meetings from your Microsoft account.
      </p>
      {summary ? (
        <p className="muted">
          {summary.total} connected · {summary.synced} synced · {summary.error} errors
        </p>
      ) : null}

      {oauthInstructions && pendingProvider ? (
        <div className="connectedAccountsOauthBox">
          <p>
            Complete sign-in for <strong>{providerLabel(pendingProvider)}</strong> in your browser, then click below.
          </p>
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="primaryButton" onClick={() => void handleCompleteOAuth()}>
              Complete sign-in
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                setOauthInstructions(false);
                setPendingProvider(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
        <button type="button" className="ghostButton" onClick={() => void handleConnect("google")} disabled={Boolean(pendingProvider)}>
          <Calendar size={14} /> Connect Google
        </button>
        <button
          type="button"
          className="ghostButton"
          onClick={() => void handleConnect("microsoft")}
          disabled={Boolean(pendingProvider)}
          title="Includes Outlook calendar and Teams meetings on your calendar."
        >
          <Calendar size={14} /> Connect Outlook / Microsoft 365
        </button>
        {accounts.length > 0 ? (
          <button type="button" className="ghostButton" onClick={() => void handleSyncAll()} disabled={isSyncingAll}>
            <RefreshCw size={14} /> Sync all
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState message="Loading connected accounts…" />
      ) : accounts.length === 0 ? (
        <p className="muted">No connected calendars yet. Connect Google or Outlook to get started.</p>
      ) : (
        <ul className="list connectedAccountsList">
          {accounts.map((account) => (
            <li key={account.id} className="connectedAccountsListItem">
              <div className="connectedAccountsListMain">
                <strong>{providerLabel(account.provider)}</strong>
                <span className="muted">{account.email}</span>
                <span className="pill">{syncStateLabel(account.syncState)}</span>
                <span className="muted">Last sync: {formatLastSync(account.lastSyncAt)}</span>
                {account.syncError ? <span className="connectedAccountsError">{account.syncError}</span> : null}
              </div>
              <div className="row" style={{ gap: "0.5rem" }}>
                <button
                  type="button"
                  className="ghostButton"
                  disabled={busyAccountId === account.id || isSyncingAll}
                  onClick={() => void handleSyncAccount(account.id)}
                >
                  <RefreshCw size={14} /> Sync
                </button>
                <button
                  type="button"
                  className="ghostButton"
                  disabled={busyAccountId === account.id || isSyncingAll}
                  onClick={() => void handleDisconnect(account)}
                >
                  <Trash2 size={14} /> Disconnect
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

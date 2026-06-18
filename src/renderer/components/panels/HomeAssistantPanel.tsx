import type { HaDeviceRow } from "../../types";
import { Home, Power, RefreshCw, PlugZap } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";

type Props = {
  haUrl: string;
  setHaUrl: (v: string) => void;
  haToken: string;
  setHaToken: (v: string) => void;
  hasHaUrl: boolean;
  haStatusText: string;
  haReady: boolean;
  canSaveHa: boolean;
  isSavingHa: boolean;
  isRefreshingHa: boolean;
  isRefreshing: boolean;
  devices: HaDeviceRow[];
  isEntityTogglePending: (id: string) => boolean;
  onSave: () => void;
  onTest: () => void;
  onRefreshEntities: () => void;
  onToggleDevice: (entityId: string, friendlyName: string) => Promise<void>;
  onError: (err: unknown) => void;
  onShowSuccess?: (message: string) => void;
};

type ConnectionState = "notConfigured" | "configuredButUntested" | "connected" | "lastRefreshFailed";

function getConnectionState(hasHaUrl: boolean, haReady: boolean, devices: HaDeviceRow[]): ConnectionState {
  if (!hasHaUrl) return "notConfigured";
  if (!haReady) return "configuredButUntested";
  if (devices.length === 0) return "lastRefreshFailed";
  return "connected";
}

function getConnectionSummary(
  state: ConnectionState,
  devices: HaDeviceRow[]
): { label: string; description: string; className: string } {
  switch (state) {
    case "notConfigured":
      return {
        label: "Not configured",
        description: "Add your Home Assistant URL and token to get started.",
        className: "connection-not-configured"
      };
    case "configuredButUntested":
      return {
        label: "Configured but untested",
        description: "Save your configuration, then click Test to verify the connection.",
        className: "connection-untested"
      };
    case "connected":
      return {
        label: "Connected",
        description: `${devices.length} device${devices.length === 1 ? "" : "s"} available.`,
        className: "connection-connected"
      };
    case "lastRefreshFailed":
      return {
        label: "Connection issue",
        description: "Unable to load devices. Check your configuration and try refreshing.",
        className: "connection-failed"
      };
  }
}

export function HomeAssistantPanel({
  haUrl,
  setHaUrl,
  haToken,
  setHaToken,
  hasHaUrl,
  haStatusText,
  haReady,
  canSaveHa,
  isSavingHa,
  isRefreshingHa,
  isRefreshing,
  devices,
  isEntityTogglePending,
  onSave,
  onTest,
  onRefreshEntities,
  onToggleDevice,
  onError,
  onShowSuccess
}: Props): JSX.Element {
  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Home} title="Home Assistant" />
      {/* visible connection state summary */}
      {(() => {
        const state = getConnectionState(hasHaUrl, haReady, devices);
        const summary = getConnectionSummary(state, devices);
        return (
          <div className={`connection-state-summary ${summary.className}`}>
            <span className="connection-state-label">{summary.label}</span>
            <span className="connection-state-description">{summary.description}</span>
          </div>
        );
      })()}
      <p className="muted sectionIntro">{haStatusText}</p>
      <div className="row">
        <input
          placeholder="http://homeassistant.local:8123"
          aria-label="Home Assistant URL"
          value={haUrl}
          onChange={(e) => setHaUrl(e.target.value)}
        />
        <input
          placeholder="Long-lived token (if required)"
          aria-label="Home Assistant long-lived access token"
          type="password"
          autoComplete="new-password"
          value={haToken}
          onChange={(e) => setHaToken(e.target.value)}
        />
      </div>
      {!hasHaUrl ? (
        <p className="muted">
          Include <code>http://</code> or <code>https://</code> in the URL.
        </p>
      ) : null}
      <div className="row">
        <button type="button" disabled={isSavingHa || !canSaveHa} onClick={() => void onSave()}>
          {isSavingHa ? "Saving..." : "Save"}
        </button>
        <button type="button" disabled={!haReady} onClick={() => void onTest()}>
          Test
        </button>
        <IconButton
          icon={RefreshCw}
          label="Refresh devices"
          onClick={() => void onRefreshEntities()}
          disabled={isRefreshingHa || !haReady}
          variant="ghost"
          size={14}
        />
      </div>
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading...</li>
        ) : devices.length ? (
          devices.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>
                {d.friendlyName} ({d.state})
              </span>
              <IconButton
                icon={Power}
                label={`Toggle ${d.friendlyName}`}
                onClick={async () => {
                  try {
                    await onToggleDevice(d.entityId, d.friendlyName);
                    onShowSuccess?.(`Device toggled: ${d.friendlyName}`);
                  } catch (err) {
                    onError(err);
                  }
                }}
                disabled={isEntityTogglePending(d.entityId)}
                variant="ghost"
                size={14}
              />
            </li>
          ))
        ) : (
          <EmptyState
            icon={PlugZap}
            title="No devices yet"
            description="Save your Home Assistant configuration, then click Refresh devices to load your smart home devices."
          />
        )}
      </ul>
    </section>
  );
}

import type { HaDeviceRow } from "../../types";

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
};

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
  onError
}: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Home Assistant</h2>
      </div>
      <p className="muted sectionIntro">{haStatusText}</p>
      <div className="row">
        <input placeholder="http://homeassistant.local:8123" aria-label="Home Assistant URL" value={haUrl} onChange={(e) => setHaUrl(e.target.value)} />
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
        <p className="muted">Include <code>http://</code> or <code>https://</code> in the URL.</p>
      ) : null}
      <div className="row">
        <button type="button" disabled={isSavingHa || !canSaveHa} onClick={() => void onSave()}>
          {isSavingHa ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={!haReady} onClick={() => void onTest()}>
          Test
        </button>
        <button type="button" disabled={isRefreshingHa || !haReady} onClick={() => void onRefreshEntities()}>
          {isRefreshingHa ? "…" : "Refresh devices"}
        </button>
      </div>
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : devices.length ? (
          devices.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>
                {d.friendlyName} ({d.state})
              </span>
              <button
                type="button"
                className="ghostButton"
                disabled={isEntityTogglePending(d.entityId)}
                onClick={async () => {
                  try {
                    await onToggleDevice(d.entityId, d.friendlyName);
                  } catch (err) {
                    onError(err);
                  }
                }}
              >
                {isEntityTogglePending(d.entityId) ? "…" : "Toggle"}
              </button>
            </li>
          ))
        ) : (
          <li className="muted">No devices yet. Save, then refresh.</li>
        )}
      </ul>
    </section>
  );
}

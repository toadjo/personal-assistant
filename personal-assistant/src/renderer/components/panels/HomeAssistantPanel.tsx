import type { HaDeviceRow } from "../../types";

type Props = {
  haUrl: string;
  setHaUrl: (v: string) => void;
  haToken: string;
  setHaToken: (v: string) => void;
  hasHaUrl: boolean;
  hasHaToken: boolean;
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
  hasHaToken,
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
        <span className="pill graphitePill">Smart home</span>
      </div>
      <p className="muted sectionIntro">Connect your Home Assistant instance to control synced entities.</p>
      <div className="row">
        <input placeholder="http://homeassistant.local:8123" aria-label="Home Assistant URL" value={haUrl} onChange={(e) => setHaUrl(e.target.value)} />
        <input
          placeholder="Long-lived access token"
          aria-label="Home Assistant long-lived access token"
          type="password"
          autoComplete="new-password"
          value={haToken}
          onChange={(e) => setHaToken(e.target.value)}
        />
      </div>
      <p className="muted">Status: {haStatusText}</p>
      <p className="muted">If Save succeeds, you can leave token blank on future edits unless you want to replace it.</p>
      {!hasHaUrl ? (
        <p className="muted">
          Tip: include protocol in URL (for example: <code>http://homeassistant.local:8123</code>).
        </p>
      ) : null}
      {!hasHaToken && !haToken.trim() ? <p className="muted">Add a long-lived token to finish first-time setup.</p> : null}
      <div className="row">
        <button disabled={isSavingHa || !canSaveHa} onClick={() => void onSave()}>
          {isSavingHa ? "Saving..." : "Save"}
        </button>
        <button disabled={!haReady} onClick={() => void onTest()}>
          Test
        </button>
        <button disabled={isRefreshingHa || !haReady} onClick={() => void onRefreshEntities()}>
          {isRefreshingHa ? "Refreshing..." : "Refresh Entities"}
        </button>
      </div>
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading devices...</li>
        ) : devices.length ? (
          devices.map((d) => (
            <li key={d.entityId} className="listRow">
              <span>
                {d.friendlyName} ({d.state})
              </span>
              <button
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
                {isEntityTogglePending(d.entityId) ? "Toggling..." : "Toggle"}
              </button>
            </li>
          ))
        ) : (
          <li className="muted">No synced devices yet. Save credentials and refresh entities.</li>
        )}
      </ul>
    </section>
  );
}

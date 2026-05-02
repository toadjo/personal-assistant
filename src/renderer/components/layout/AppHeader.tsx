import type { ThemeMode } from "../../types";
import { ThemeSelect } from "./ThemeSelect";
import { WelcomeBar } from "./WelcomeBar";

type Props = {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  userPreferredName: string;
  userPreferredNameIsSet: boolean;
  onSaveUserPreferredName: (trimmed: string) => void | Promise<void>;
  notesCount: number;
  pendingRemindersCount: number;
  overdueRemindersCount: number;
  haReady: boolean;
};

export function AppHeader({
  theme,
  onThemeChange,
  userPreferredName,
  userPreferredNameIsSet,
  onSaveUserPreferredName,
  notesCount,
  pendingRemindersCount,
  overdueRemindersCount,
  haReady
}: Props): JSX.Element {
  return (
    <header className="hero">
      <div className="heroLead">
        <WelcomeBar
          userPreferredName={userPreferredName}
          userPreferredNameIsSet={userPreferredNameIsSet}
          onSaveUserPreferredName={onSaveUserPreferredName}
          idPrefix="desk"
        />
        <h1>Personal Assistant</h1>
        <p className="subtitle">
          Memos and follow-ups on your desk—one line below. Home Assistant and timed rules live in a{" "}
          <strong>second window</strong>—click <strong>House</strong>, use the tray, or type <code>open household</code>{" "}
          in Your brief.
        </p>
      </div>
      <div className="heroStats">
        <div className="heroStatsDesk">
          <ThemeSelect theme={theme} onChange={onThemeChange} selectId="theme-select-desk" />
          <span className="stat">Memos {notesCount}</span>
          <span className="stat">Open {pendingRemindersCount}</span>
          <span className={overdueRemindersCount > 0 ? "stat statAttention" : "stat"}>
            Overdue {overdueRemindersCount}
          </span>
        </div>
        <button
          type="button"
          className="heroStatsAddOn"
          title="Open Household window (Home Assistant and rules)"
          onClick={() => void window.assistantApi.openHouseholdWindow()}
        >
          <span className="heroStatsAddOnLabel">House</span>
          <span className={`stat statAddOn ${haReady ? "statAddOnLive" : ""}`}>{haReady ? "linked" : "off"}</span>
        </button>
      </div>
    </header>
  );
}

import { Palette } from "lucide-react";
import type { ThemeMode } from "../../lib/theme/tokens";
import { ThemeSelect } from "./ThemeSelect";
import { WelcomeBar } from "./WelcomeBar";

type Props = {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenAppearance: () => void;
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
  onOpenAppearance,
  userPreferredName,
  userPreferredNameIsSet,
  onSaveUserPreferredName,
  notesCount,
  pendingRemindersCount,
  overdueRemindersCount,
  haReady
}: Props): JSX.Element {
  return (
    <header className="desktopTopBar">
      <div className="desktopTopBarLeft">
        <WelcomeBar
          userPreferredName={userPreferredName}
          userPreferredNameIsSet={userPreferredNameIsSet}
          onSaveUserPreferredName={onSaveUserPreferredName}
          idPrefix="desk"
        />
        <span className="desktopAppName">Personal Assistant</span>
      </div>
      <div className="desktopTopBarRight">
        <span className="stat statCompact">Memos {notesCount}</span>
        <span className="stat statCompact">Open {pendingRemindersCount}</span>
        <span className={overdueRemindersCount > 0 ? "stat statCompact statAttention" : "stat statCompact"}>
          Overdue {overdueRemindersCount}
        </span>
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="Open Household window (Home Assistant and rules)"
          onClick={() => void window.assistantApi.openHouseholdWindow()}
        >
          House <span className={`stat statAddOn ${haReady ? "statAddOnLive" : ""}`}>{haReady ? "linked" : "off"}</span>
        </button>
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="Customize appearance"
          onClick={onOpenAppearance}
        >
          <Palette size={14} />
        </button>
        <ThemeSelect theme={theme} onChange={onThemeChange} selectId="theme-select-desk" />
      </div>
    </header>
  );
}

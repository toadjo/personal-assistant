import type { ThemeMode } from "../../types";

type Props = {
  theme: ThemeMode;
  onToggleTheme: () => void;
  notesCount: number;
  pendingRemindersCount: number;
  overdueRemindersCount: number;
  haReady: boolean;
};

export function AppHeader({
  theme,
  onToggleTheme,
  notesCount,
  pendingRemindersCount,
  overdueRemindersCount,
  haReady
}: Props): JSX.Element {
  return (
    <header className="hero">
      <div className="heroLead">
        <p className="eyebrow">Private secretary</p>
        <h1>Personal Assistant</h1>
        <p className="subtitle">Notes, reminders, and home—tell me what you need below.</p>
      </div>
      <div className="heroStats">
        <button
          className="themeToggle"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle light and dark theme"
        >
          {theme === "light" ? "Dark" : "Light"}
        </button>
        <span className="stat">Notes {notesCount}</span>
        <span className="stat">Pending {pendingRemindersCount}</span>
        <span className={overdueRemindersCount > 0 ? "stat statAttention" : "stat"}>Overdue {overdueRemindersCount}</span>
        <span className="stat">HA {haReady ? "on" : "off"}</span>
      </div>
    </header>
  );
}

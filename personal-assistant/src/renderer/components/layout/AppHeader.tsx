import type { ThemeMode } from "../../types";

type Props = {
  theme: ThemeMode;
  onToggleTheme: () => void;
  notesCount: number;
  pendingRemindersCount: number;
  overdueRemindersCount: number;
  devicesCount: number;
  haReady: boolean;
};

export function AppHeader({
  theme,
  onToggleTheme,
  notesCount,
  pendingRemindersCount,
  overdueRemindersCount,
  devicesCount,
  haReady
}: Props): JSX.Element {
  return (
    <header className="hero">
      <div className="heroLead">
        <p className="eyebrow">Assistant workspace</p>
        <h1>Personal Assistant</h1>
        <p className="subtitle">Windows tray companion for notes, reminders, and Home Assistant automations.</p>
      </div>
      <div className="heroStats">
        <button
          className="themeToggle"
          onClick={onToggleTheme}
          aria-label="Toggle light and dark theme"
        >
          {theme === "light" ? "Dark theme" : "Light theme"}
        </button>
        <span className="stat">Notes: {notesCount}</span>
        <span className="stat">Pending reminders: {pendingRemindersCount}</span>
        <span className={overdueRemindersCount > 0 ? "stat statAttention" : "stat"}>Overdue: {overdueRemindersCount}</span>
        <span className="stat">Devices: {devicesCount}</span>
        <span className="stat">HA: {haReady ? "Ready" : "Setup needed"}</span>
      </div>
    </header>
  );
}

import { Home, StickyNote, Bell, AlertTriangle, ListTodo, Palette, Database, Users, Sparkles, Link2 } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { ThemeSelect } from "../layout/ThemeSelect";
import type { ShellModals } from "../../hooks/shell/useShellModals";
import type { PersonalModule } from "../../hooks/shell/useShellNav";
import type { DailyCommandCenterFilter } from "../../lib/derived/daily-command-center";
import type { ThemeMode } from "../../lib/theme/tokens";

export type ShellChromeProps = {
  deskMode: "personal" | "projects";
  onSetDeskMode: (m: "personal" | "projects") => void;
  counts: {
    notes: number;
    openReminders: number;
    openTasks: number;
    overdueReminders: number;
    overdueTasks: number;
    teamOpen: number | null;
    teamOverdue: number;
  };
  haReady: boolean;
  onOpenHousehold: () => void;
  onSetActivePersonalModule: (m: PersonalModule) => void;
  onSetDailyCommandCenterFilter: (f: DailyCommandCenterFilter) => void;
  modals: ShellModals;
  theme: ThemeMode;
  onSetTheme: (t: ThemeMode) => void;
};

export function ShellChrome({
  deskMode,
  onSetDeskMode,
  counts,
  haReady,
  onOpenHousehold,
  onSetActivePersonalModule,
  onSetDailyCommandCenterFilter,
  modals,
  theme,
  onSetTheme
}: ShellChromeProps): JSX.Element {
  return (
    <header className="utilityToolbar">
      <div className="utilityToolbarLeft">
        <h1 className="appIdentity">Personal Assistant</h1>
        <div className="deskModeSwitch">
          <button
            type="button"
            className={`modeButton ${deskMode === "personal" ? "modeButtonActive" : ""}`}
            onClick={() => onSetDeskMode("personal")}
          >
            Personal
          </button>
          <button
            type="button"
            className={`modeButton ${deskMode === "projects" ? "modeButtonActive" : ""}`}
            onClick={() => onSetDeskMode("projects")}
          >
            Projects
          </button>
        </div>
      </div>
      <div className="utilityToolbarRight">
        <button type="button" className="statusChip" onClick={() => onSetActivePersonalModule("memos")}>
          <StickyNote size={14} />
          <span>Memos</span>
          <span className="statusChipCount">{counts.notes}</span>
        </button>
        <button type="button" className="statusChip" onClick={() => onSetActivePersonalModule("reminders")}>
          <Bell size={14} />
          <span>Open</span>
          <span className="statusChipCount">{counts.openReminders}</span>
        </button>
        <button type="button" className="statusChip" onClick={() => onSetActivePersonalModule("tasks")}>
          <ListTodo size={14} />
          <span>Tasks</span>
          <span className="statusChipCount">{counts.openTasks}</span>
        </button>
        {counts.overdueReminders > 0 ? (
          <button
            type="button"
            className="statusChip statusChipAttention"
            onClick={() => onSetActivePersonalModule("reminders")}
          >
            <AlertTriangle size={14} />
            <span>Overdue</span>
            <span className="statusChipCount">{counts.overdueReminders}</span>
          </button>
        ) : null}
        {counts.overdueTasks > 0 ? (
          <button
            type="button"
            className="statusChip statusChipAttention"
            onClick={() => onSetActivePersonalModule("tasks")}
          >
            <AlertTriangle size={14} />
            <span>Task overdue</span>
            <span className="statusChipCount">{counts.overdueTasks}</span>
          </button>
        ) : null}
        {counts.teamOpen !== null && counts.teamOpen > 0 ? (
          <button
            type="button"
            className={`statusChip ${counts.teamOverdue > 0 ? "statusChipAttention" : ""}`}
            onClick={() => onSetDailyCommandCenterFilter("team")}
          >
            <Users size={14} />
            <span>Team</span>
            <span className="statusChipCount">{counts.teamOpen}</span>
          </button>
        ) : null}
        <IconButton
          icon={Home}
          label={haReady ? "Home Assistant - linked (optional)" : "Home Assistant - optional"}
          onClick={onOpenHousehold}
          variant={haReady ? "default" : "ghost"}
        />
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="Customize appearance"
          aria-label="Customize appearance"
          onClick={modals.toggleAppearance}
        >
          <Palette size={14} />
        </button>
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="Data backup and reset"
          aria-label="Data backup and reset"
          onClick={modals.toggleData}
        >
          <Database size={14} />
        </button>
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="Connected Accounts"
          aria-label="Connected Accounts"
          onClick={modals.toggleConnectedAccounts}
        >
          <Link2 size={14} />
        </button>
        <button
          type="button"
          className="ghostButton ghostButtonCompact"
          title="AI configuration"
          aria-label="AI configuration"
          onClick={modals.toggleAi}
        >
          <Sparkles size={14} />
        </button>
        <ThemeSelect theme={theme} onChange={onSetTheme} selectId="theme-select-desk" />
      </div>
    </header>
  );
}

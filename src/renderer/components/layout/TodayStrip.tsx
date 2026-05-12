import { AlertCircle, Clock, Bell, StickyNote, Zap } from "lucide-react";

type Props = {
  overdueCount: number;
  dueTodayCount: number;
  remindersCount: number;
  notesCount: number;
  automationsCount: number;
  onFilterOverdue?: () => void;
  onFilterDueToday?: () => void;
  onFilterReminders?: () => void;
  onFilterNotes?: () => void;
  onFilterAutomations?: () => void;
};

function StripChip({
  icon: Icon,
  label,
  count,
  attention,
  onClick
}: {
  icon: typeof AlertCircle;
  label: string;
  count: number;
  attention?: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`todayStripChip ${attention ? "todayStripChipAttention" : ""} ${onClick ? "todayStripChipClickable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <Icon size={14} />
      <span className="todayStripLabel">{label}</span>
      <span className={`todayStripCount ${attention ? "todayStripCountAttention" : ""}`}>{count}</span>
    </button>
  );
}

export function TodayStrip({
  overdueCount,
  dueTodayCount,
  remindersCount,
  notesCount,
  automationsCount,
  onFilterOverdue,
  onFilterDueToday,
  onFilterReminders,
  onFilterNotes,
  onFilterAutomations
}: Props): JSX.Element {
  return (
    <div className="todayStrip">
      <StripChip
        icon={AlertCircle}
        label="Overdue"
        count={overdueCount}
        attention={overdueCount > 0}
        onClick={onFilterOverdue}
      />
      <StripChip icon={Clock} label="Due today" count={dueTodayCount} onClick={onFilterDueToday} />
      <StripChip icon={Bell} label="Reminders" count={remindersCount} onClick={onFilterReminders} />
      <StripChip icon={StickyNote} label="Notes" count={notesCount} onClick={onFilterNotes} />
      <StripChip icon={Zap} label="Automations" count={automationsCount} onClick={onFilterAutomations} />
    </div>
  );
}

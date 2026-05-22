import { ArrowRight, Check, Clock as Snooze, Inbox } from "lucide-react";
import type { DailyCommandCenter } from "../../lib/derived/daily-command-center";
import type { BriefItem } from "../../types";
import { IconButton } from "../ui/IconButton";

type Props = {
  data: DailyCommandCenter;
  onOpenToday: () => void;
  onOpenInbox: () => void;
  onOpenWorkItem: (item: BriefItem) => void;
  onOpenAutomations: (item: BriefItem) => void;
  onCompleteTask: (id: string) => void;
  onCompleteReminder: (id: string) => void;
  onSnoozeReminder: (id: string) => void;
};

function urgencyLabel(urgency: BriefItem["urgency"]): string {
  switch (urgency) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    case "context":
      return "Context";
  }
}

function kindLabel(kind: BriefItem["kind"]): string {
  switch (kind) {
    case "team-task":
      return "Team task";
    case "agenda":
      return "Agenda";
    case "automation":
      return "Automation";
    case "reminder":
      return "Reminder";
    case "note":
      return "Memo";
    case "task":
      return "Task";
  }
}

export function HomeDashboardPanel({
  data,
  onOpenToday,
  onOpenInbox,
  onOpenWorkItem,
  onOpenAutomations,
  onCompleteTask,
  onCompleteReminder,
  onSnoozeReminder
}: Props): JSX.Element {
  const { pressure, nowItems } = data;
  const activePressure = pressure.overdue + pressure.dueToday + pressure.upcoming + pressure.context;
  const nextItem = nowItems[0];

  return (
    <section className="homeDashboard" aria-labelledby="home-dashboard-heading">
      <div className="homeDashboardHero">
        <div className="homeDashboardHeroCopy">
          <p className="homeDashboardKicker">Today</p>
          <h2 id="home-dashboard-heading">
            {pressure.overdue > 0
              ? `${pressure.overdue} overdue item${pressure.overdue === 1 ? "" : "s"} need attention`
              : pressure.dueToday > 0
                ? `${pressure.dueToday} due today`
                : activePressure > 0
                  ? "Your work is queued"
                  : "Clear desk"}
          </h2>
          <p>{data.summary}</p>
          {nextItem ? (
            <div className="homeDashboardHeroNext">
              <button
                type="button"
                className="homeDashboardHeroNextAction"
                onClick={() => {
                  if (nextItem.kind === "automation") {
                    onOpenAutomations(nextItem);
                    return;
                  }
                  onOpenWorkItem(nextItem);
                }}
              >
                <span className={`homeUrgencyDot homeUrgencyDot${nextItem.urgency}`} aria-hidden="true" />
                <span className="homeDashboardHeroNextText">
                  <span className="homeDashboardHeroNextTitle">{nextItem.label}</span>
                  <span className="homeDashboardHeroNextMeta">
                    {urgencyLabel(nextItem.urgency)} / {kindLabel(nextItem.kind)}
                    {nextItem.detail ? ` / ${nextItem.detail}` : ""}
                  </span>
                </span>
              </button>
              <div className="homeDashboardHeroNextControls">
                {nextItem.kind === "task" ? (
                  <IconButton
                    icon={Check}
                    label={`Complete task: ${nextItem.label}`}
                    onClick={() => onCompleteTask(nextItem.sourceId)}
                    size={14}
                  />
                ) : nextItem.kind === "reminder" || nextItem.kind === "agenda" ? (
                  <>
                    <IconButton
                      icon={Check}
                      label={`Complete reminder: ${nextItem.label}`}
                      onClick={() => onCompleteReminder(nextItem.sourceId)}
                      size={14}
                    />
                    <IconButton
                      icon={Snooze}
                      label={`Snooze reminder: ${nextItem.label}`}
                      onClick={() => onSnoozeReminder(nextItem.sourceId)}
                      size={14}
                      variant="ghost"
                    />
                  </>
                ) : (
                  <IconButton
                    icon={ArrowRight}
                    label={`Open item: ${nextItem.label}`}
                    onClick={() => {
                      if (nextItem.kind === "automation") {
                        onOpenAutomations(nextItem);
                        return;
                      }
                      onOpenWorkItem(nextItem);
                    }}
                    size={14}
                    variant="ghost"
                  />
                )}
              </div>
            </div>
          ) : (
            <p className="homeDashboardHeroEmpty">Your desk is clear. Capture something in Inbox or review your Today list.</p>
          )}
        </div>
        <div className="homeDashboardHeroActions" aria-label="Primary dashboard actions">
          <button type="button" className="primaryButton homeDashboardPrimary" onClick={onOpenToday}>
            Open Today
            <ArrowRight size={15} />
          </button>
          <button type="button" className="ghostButton" onClick={onOpenInbox}>
            <Inbox size={15} />
            Inbox
          </button>
        </div>
      </div>
    </section>
  );
}

import type { DailyCommandCenter, DailyCommandCenterNowItem } from "../../lib/derived/daily-command-center";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import {
  Command,
  AlertCircle,
  Clock,
  Pin,
  Calendar,
  Check,
  Clock as Snooze,
  History,
  X,
  ExternalLink,
  Inbox,
  ListTodo,
  FileText
} from "lucide-react";
import type { BriefItem } from "../../types";
import type { AwayBriefItem } from "../../types";
import type { TaskFilter, ReminderFilter } from "../../types";
import "./DailyCommandCenterPanel.css";

type Props = {
  data: DailyCommandCenter;
  showAllSecondary?: boolean;
  onCompleteTask: (id: string) => void;
  onCompleteReminder: (id: string) => void;
  onSnoozeReminder: (id: string) => void;
  onMarkSeen: () => void;
  onOpenTasks?: (filter: TaskFilter) => void;
  onOpenReminders?: (filter: ReminderFilter) => void;
  onOpenNotes?: () => void;
  onOpenWorkItem?: (item: BriefItem) => void;
  onOpenAutomations?: (item: BriefItem) => void;
  onOpenInbox?: () => void;
};

function getIconForUrgency(urgency: BriefItem["urgency"]) {
  switch (urgency) {
    case "overdue":
      return AlertCircle;
    case "today":
      return Clock;
    case "upcoming":
      return Calendar;
    case "context":
      return Pin;
  }
}

function getUrgencyLabel(urgency: BriefItem["urgency"]): string {
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

function getReasonLabel(reason: AwayBriefItem["reason"]): string {
  switch (reason) {
    case "overdue":
      return "Overdue";
    case "due":
      return "Due";
    case "new":
      return "New";
    case "updated":
      return "Updated";
  }
}

function getIconForReason(reason: AwayBriefItem["reason"]) {
  switch (reason) {
    case "overdue":
      return AlertCircle;
    case "due":
      return Clock;
    case "new":
      return History;
    case "updated":
      return Clock;
  }
}

function formatChangedAt(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getTaskFilterForUrgency(urgency: BriefItem["urgency"]): TaskFilter {
  return urgency === "overdue" ? "overdue" : "open";
}

interface RowActionProps {
  item: BriefItem | DailyCommandCenterNowItem;
  onCompleteTask: (id: string) => void;
  onCompleteReminder: (id: string) => void;
  onSnoozeReminder: (id: string) => void;
  onOpenTasks?: (filter: TaskFilter) => void;
  onOpenReminders?: (filter: ReminderFilter) => void;
  onOpenNotes?: () => void;
  onOpenWorkItem?: (item: BriefItem) => void;
  onOpenAutomations?: (item: BriefItem) => void;
  onOpenInbox?: () => void;
  isNowSection?: boolean;
}

function RowActions({
  item,
  onCompleteTask,
  onCompleteReminder,
  onSnoozeReminder,
  onOpenTasks,
  onOpenReminders,
  onOpenNotes,
  onOpenWorkItem,
  onOpenAutomations,
  onOpenInbox,
  isNowSection = false
}: RowActionProps): JSX.Element {
  const actions: JSX.Element[] = [];

  // Details button for reviewable work (tasks, reminders, team tasks)
  if (onOpenWorkItem && (item.kind === "task" || item.kind === "reminder" || item.kind === "team-task")) {
    actions.push(
      <IconButton
        key="details"
        icon={FileText}
        size={16}
        onClick={() => onOpenWorkItem(item)}
        label={`Details: ${item.label}`}
        title="Details"
        className="dccActionButton"
      />
    );
  }

  // Now section uses item.action, other sections use item.kind
  if (isNowSection && "action" in item) {
    const nowItem = item as DailyCommandCenterNowItem;
    if (nowItem.action === "complete-task") {
      actions.push(
        <IconButton
          key="complete"
          icon={Check}
          size={16}
          onClick={() => onCompleteTask(nowItem.sourceId)}
          label={`Complete task: ${nowItem.label}`}
          title="Done"
          className="dccActionButton"
        />
      );
      if (onOpenTasks) {
        actions.push(
          <IconButton
            key="open-tasks"
            icon={ExternalLink}
            size={16}
            onClick={() => onOpenTasks(getTaskFilterForUrgency(nowItem.urgency))}
            label={`Open tasks: ${nowItem.label}`}
            title="Open"
            className="dccActionButton"
          />
        );
      }
    } else if (nowItem.action === "complete-reminder") {
      actions.push(
        <IconButton
          key="complete"
          icon={Check}
          size={16}
          onClick={() => onCompleteReminder(nowItem.sourceId)}
          label={`Complete reminder: ${nowItem.label}`}
          title="Done"
          className="dccActionButton"
        />
      );
      actions.push(
        <IconButton
          key="snooze"
          icon={Snooze}
          size={16}
          onClick={() => onSnoozeReminder(nowItem.sourceId)}
          label={`Snooze reminder ten minutes: ${nowItem.label}`}
          title="Snooze"
          className="dccActionButton"
        />
      );
      if (onOpenReminders) {
        actions.push(
          <IconButton
            key="open-reminders"
            icon={ExternalLink}
            size={16}
            onClick={() => onOpenReminders("pending")}
            label={`Open reminders: ${nowItem.label}`}
            title="Open"
            className="dccActionButton"
          />
        );
      }
    }
  } else {
    // Attention and Context sections use item.kind
    if (item.kind === "task") {
      actions.push(
        <IconButton
          key="complete"
          icon={Check}
          size={16}
          onClick={() => onCompleteTask(item.sourceId)}
          label={`Complete task: ${item.label}`}
          title="Done"
          className="dccActionButton"
        />
      );
      if (onOpenTasks) {
        actions.push(
          <IconButton
            key="open-tasks"
            icon={ExternalLink}
            size={16}
            onClick={() => onOpenTasks(getTaskFilterForUrgency(item.urgency))}
            label={`Open tasks: ${item.label}`}
            title="Open"
            className="dccActionButton"
          />
        );
      }
    } else if (item.kind === "team-task") {
      actions.push(
        <IconButton
          key="open"
          icon={ExternalLink}
          size={16}
          onClick={() => onOpenWorkItem?.(item)}
          label={`Open team task: ${item.label}`}
          title="Open"
          className="dccActionButton"
        />
      );
    } else if (item.kind === "reminder" || item.kind === "agenda") {
      actions.push(
        <IconButton
          key="complete"
          icon={Check}
          size={16}
          onClick={() => onCompleteReminder(item.sourceId)}
          label={`Complete reminder: ${item.label}`}
          title="Done"
          className="dccActionButton"
        />
      );
      actions.push(
        <IconButton
          key="snooze"
          icon={Snooze}
          size={16}
          onClick={() => onSnoozeReminder(item.sourceId)}
          label={`Snooze reminder ten minutes: ${item.label}`}
          title="Snooze"
          className="dccActionButton"
        />
      );
      if (onOpenReminders) {
        actions.push(
          <IconButton
            key="open-reminders"
            icon={ExternalLink}
            size={16}
            onClick={() => onOpenReminders("pending")}
            label={`Open reminders: ${item.label}`}
            title="Open"
            className="dccActionButton"
          />
        );
      }
    } else if (item.kind === "note") {
      if (onOpenInbox) {
        actions.push(
          <IconButton
            key="inbox"
            icon={Inbox}
            size={16}
            onClick={() => onOpenInbox()}
            label={`Open in Inbox: ${item.label}`}
            title="Inbox"
            className="dccActionButton"
          />
        );
      }
      if (onOpenNotes) {
        actions.push(
          <IconButton
            key="open-notes"
            icon={ExternalLink}
            size={16}
            onClick={() => onOpenNotes()}
            label={`Open notes: ${item.label}`}
            title="Open"
            className="dccActionButton"
          />
        );
      }
    } else if (item.kind === "automation" && onOpenAutomations) {
      actions.push(
        <IconButton
          key="open-automations"
          icon={ExternalLink}
          size={16}
          onClick={() => onOpenAutomations(item)}
          label={`Open automations: ${item.label}`}
          title="Open"
          className="dccActionButton"
        />
      );
    }
  }

  return <div className="dccItemActions">{actions}</div>;
}

function hasActionableContextItems(contextItems: BriefItem[]): boolean {
  return contextItems.some(
    (item) => item.kind === "task" || item.kind === "reminder" || item.kind === "team-task"
  );
}

export function DailyCommandCenterPanel({
  data,
  showAllSecondary = false,
  onCompleteTask,
  onCompleteReminder,
  onSnoozeReminder,
  onMarkSeen,
  onOpenTasks,
  onOpenReminders,
  onOpenNotes,
  onOpenWorkItem,
  onOpenAutomations,
  onOpenInbox
}: Props): JSX.Element {
  const { nowItems, attentionItems, contextItems, awayItems, summary, pressure } = data;

  const hasAnything =
    nowItems.length > 0 || attentionItems.length > 0 || contextItems.length > 0 || awayItems.length > 0;

  return (
    <section className="panel" aria-labelledby="daily-command-center-heading">
      <PanelHeader icon={Command} title="Daily Command Center" />

      <div className="dccGrid">
        {/* Summary card */}
        <article className="dccCard dccSummary">
          <h3>Summary</h3>
          <p>{summary}</p>
          <p className="dccPressure">
            {pressure.overdue > 0 ? `${pressure.overdue} overdue` : null}
            {pressure.dueToday > 0 ? ` / ${pressure.dueToday} due today` : null}
            {pressure.upcoming > 0 ? ` / ${pressure.upcoming} upcoming` : null}
            {pressure.context > 0 ? ` / ${pressure.context} context` : null}
          </p>
          {onOpenInbox && (
            <div className="dccSummaryActions">
              <button type="button" className="textButton" onClick={onOpenInbox}>
                <Inbox size={14} />
                Open Inbox
              </button>
            </div>
          )}
        </article>

        {/* Now queue */}
        <article className="dccCard dccNow">
          <h3>Now</h3>
          {nowItems.length > 0 ? (
            <ul className="dccList">
              {nowItems.map((item) => {
                const Icon = getIconForUrgency(item.urgency);
                return (
                  <li key={item.sourceId} className="dccListItem">
                    <Icon size={16} className="dccListItemIcon" />
                    <div className="dccListItemContent">
                      <button
                        type="button"
                        className={`dccItemLabelButton ${item.urgency === "overdue" ? "dccItemLabelOverdue" : ""}`}
                        onClick={() => onOpenWorkItem?.(item)}
                      >
                        {item.label}
                      </button>
                      {item.detail && <div className="dccItemDetail">{item.detail}</div>}
                      <div className="dccItemMeta">
                        {getUrgencyLabel(item.urgency)} / {item.kind}
                      </div>
                    </div>
                    <RowActions
                      item={item}
                      onCompleteTask={onCompleteTask}
                      onCompleteReminder={onCompleteReminder}
                      onSnoozeReminder={onSnoozeReminder}
                      onOpenTasks={onOpenTasks}
                      onOpenReminders={onOpenReminders}
                      onOpenNotes={onOpenNotes}
                      onOpenWorkItem={onOpenWorkItem}
                      onOpenAutomations={onOpenAutomations}
                      onOpenInbox={onOpenInbox}
                      isNowSection={true}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dccEmptyState">No urgent actions right now.</p>
          )}
        </article>

        {/* Secondary sections — one or all depending on preference */}
        {(() => {
          const sections: JSX.Element[] = [];

          if (awayItems.length > 0) {
            sections.push(
              <article key="away" className="dccCard dccAway">
                <div className="dccAwayHeader">
                  <h3>Since You Were Away</h3>
                  <IconButton icon={X} size={16} onClick={onMarkSeen} label="Mark as seen" className="dccAwayDismiss" />
                </div>
                <ul className="dccList">
                  {awayItems.slice(0, 5).map((item) => {
                    const Icon = getIconForReason(item.reason);
                    return (
                      <li key={item.sourceId} className="dccListItem">
                        <Icon size={16} className="dccListItemIcon" />
                        <div className="dccListItemContent">
                          <div className="dccItemLabel">{item.label}</div>
                          {item.detail && <div className="dccItemDetail">{item.detail}</div>}
                          <div className="dccItemMeta">
                            {getReasonLabel(item.reason)} / {item.kind} / {formatChangedAt(item.changedAt)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          }

          if (attentionItems.length > 0) {
            sections.push(
              <article key="attention" className="dccCard dccAttention">
                <h3>Attention</h3>
                <ul className="dccList">
                  {attentionItems.map((item) => {
                    const Icon = getIconForUrgency(item.urgency);
                    return (
                      <li key={item.sourceId} className="dccListItem">
                        <Icon size={16} className="dccListItemIcon" />
                        <div className="dccListItemContent">
                          <button
                            type="button"
                            className={`dccItemLabelButton ${item.urgency === "overdue" ? "dccItemLabelOverdue" : ""}`}
                            onClick={() => onOpenWorkItem?.(item)}
                          >
                            {item.label}
                          </button>
                          {item.detail && <div className="dccItemDetail">{item.detail}</div>}
                          <div className="dccItemMeta">
                            {getUrgencyLabel(item.urgency)} / {item.kind}
                          </div>
                        </div>
                        <RowActions
                          item={item}
                          onCompleteTask={onCompleteTask}
                          onCompleteReminder={onCompleteReminder}
                          onSnoozeReminder={onSnoozeReminder}
                          onOpenTasks={onOpenTasks}
                          onOpenReminders={onOpenReminders}
                          onOpenNotes={onOpenNotes}
                          onOpenWorkItem={onOpenWorkItem}
                          onOpenAutomations={onOpenAutomations}
                          onOpenInbox={onOpenInbox}
                          isNowSection={false}
                        />
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          }

          if (contextItems.length > 0) {
            sections.push(
              <article key="context" className="dccCard dccContext">
                <h3>Context</h3>
                <ul className="dccList">
                  {contextItems.map((item) => {
                    const Icon = getIconForUrgency(item.urgency);
                    return (
                      <li key={item.sourceId} className="dccListItem">
                        <Icon size={16} className="dccListItemIcon" />
                        <div className="dccListItemContent">
                          <button type="button" className="dccItemLabelButton" onClick={() => onOpenWorkItem?.(item)}>
                            {item.label}
                          </button>
                          {item.detail && <div className="dccItemDetail">{item.detail}</div>}
                          <div className="dccItemMeta">
                            {getUrgencyLabel(item.urgency)} / {item.kind}
                          </div>
                        </div>
                        <RowActions
                          item={item}
                          onCompleteTask={onCompleteTask}
                          onCompleteReminder={onCompleteReminder}
                          onSnoozeReminder={onSnoozeReminder}
                          onOpenTasks={onOpenTasks}
                          onOpenReminders={onOpenReminders}
                          onOpenNotes={onOpenNotes}
                          onOpenWorkItem={onOpenWorkItem}
                          onOpenAutomations={onOpenAutomations}
                          onOpenInbox={onOpenInbox}
                          isNowSection={false}
                        />
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          }
          if (showAllSecondary) {
            return <>{sections}</>;
          }

          // When showing only one secondary section, prefer actionable work over passive history
          // Priority: Attention > actionable Context > Away > passive Context
          const attentionSection = sections.find((s) => s.key === "attention");
          const contextSection = sections.find((s) => s.key === "context");
          const awaySection = sections.find((s) => s.key === "away");

          if (attentionSection) return attentionSection;
          if (contextSection && hasActionableContextItems(contextItems)) return contextSection;
          if (awaySection) return awaySection;
          return contextSection ?? null;
        })()}

        {/* Empty state when nothing at all */}
        {!hasAnything && (
          <article className="dccCard dccEmpty">
            <p className="dccEmptyState">Your day is clear. Add a task, reminder, or note to get started.</p>
            <div className="dccEmptyActions">
              {onOpenInbox && (
                <button type="button" className="ghostButton" onClick={onOpenInbox}>
                  <Inbox size={14} />
                  Open Inbox
                </button>
              )}
              {onOpenTasks && (
                <button type="button" className="ghostButton" onClick={() => onOpenTasks("open")}>
                  <ListTodo size={14} />
                  Open Tasks
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

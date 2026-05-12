import type { BriefItem, AwayBriefItem } from "../../types";

export type DailyCommandCenterAction = "complete-task" | "complete-reminder" | "snooze-reminder";

export type DailyCommandCenterNowItem = BriefItem & {
  action: DailyCommandCenterAction;
};

export type DailyCommandCenter = {
  nowItems: DailyCommandCenterNowItem[];
  attentionItems: BriefItem[];
  contextItems: BriefItem[];
  awayItems: AwayBriefItem[];
  summary: string;
  pressure: {
    overdue: number;
    dueToday: number;
    upcoming: number;
    context: number;
  };
};

function getActionForItem(item: BriefItem): DailyCommandCenterAction {
  if (item.kind === "task") return "complete-task";
  return "complete-reminder";
}

export function deriveDailyCommandCenter(params: {
  focusBrief: BriefItem[];
  awayBrief: AwayBriefItem[];
}): DailyCommandCenter {
  const focusBrief = params.focusBrief;
  const awayBrief = params.awayBrief;

  const urgencyOrder: Record<BriefItem["urgency"], number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    context: 3
  };

  const sortedFocusBrief = [...focusBrief].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.label.localeCompare(b.label)
  );

  const attentionItems = sortedFocusBrief.filter((item) => item.urgency === "overdue" || item.urgency === "today");

  const contextItems = sortedFocusBrief.filter((item) => item.urgency === "upcoming" || item.urgency === "context");

  const nowItems: DailyCommandCenterNowItem[] = attentionItems
    .slice(0, 3)
    .map((item) => ({ ...item, action: getActionForItem(item) }));

  const nowSourceIds = new Set(nowItems.map((item) => item.sourceId));
  const dedupedAttentionItems = attentionItems.filter((item) => !nowSourceIds.has(item.sourceId));

  const summary = buildSummary(dedupedAttentionItems, contextItems, awayBrief);

  const pressure = {
    overdue: focusBrief.filter((item) => item.urgency === "overdue").length,
    dueToday: focusBrief.filter((item) => item.urgency === "today").length,
    upcoming: focusBrief.filter((item) => item.urgency === "upcoming").length,
    context: focusBrief.filter((item) => item.urgency === "context").length
  };

  return {
    nowItems,
    attentionItems: dedupedAttentionItems,
    contextItems,
    awayItems: awayBrief,
    summary,
    pressure
  };
}

function buildSummary(attentionItems: BriefItem[], contextItems: BriefItem[], awayItems: AwayBriefItem[]): string {
  const overdueCount = attentionItems.filter((item) => item.urgency === "overdue").length;
  const dueTodayCount = attentionItems.filter((item) => item.urgency === "today").length;
  const contextCount = contextItems.length;
  const awayCount = awayItems.length;

  const parts: string[] = [];

  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
  if (awayCount > 0) parts.push(`${awayCount} since you were away`);
  if (contextCount > 0) parts.push(`${contextCount} context`);

  if (parts.length === 0) return "All clear - nothing needs attention right now.";
  return `Now: ${parts.join(", ")}.`;
}

export function getDailyCommandCenterPressureLabel(pressure: DailyCommandCenter["pressure"]): string {
  const parts: string[] = [];
  if (pressure.overdue > 0) parts.push(`${pressure.overdue} overdue`);
  if (pressure.dueToday > 0) parts.push(`${pressure.dueToday} due today`);
  if (pressure.upcoming > 0) parts.push(`${pressure.upcoming} upcoming`);
  if (pressure.context > 0) parts.push(`${pressure.context} context`);

  if (parts.length === 0) return "Nothing on your plate.";
  return parts.join(" / ");
}

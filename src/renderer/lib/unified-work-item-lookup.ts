/**
 * Pure helper to find a unified work item by source and source ID.
 */

import type { UnifiedWorkItem } from "./derived/unified-work";
import type { BriefItem } from "../types";

export type UnifiedWorkItemSource = UnifiedWorkItem["source"];

export function getUnifiedWorkItemSourceLabel(source: UnifiedWorkItemSource): string {
  const labels: Record<UnifiedWorkItemSource, string> = {
    "local-note": "Note",
    "local-task": "Task",
    "local-reminder": "Reminder",
    "team-task": "Team task"
  };
  return labels[source];
}

export function getUnifiedWorkItemSourceForBriefKind(kind: BriefItem["kind"]): UnifiedWorkItemSource | null {
  const mapping: Record<BriefItem["kind"], UnifiedWorkItemSource | null> = {
    note: "local-note",
    task: "local-task",
    reminder: "local-reminder",
    "team-task": "team-task",
    automation: null,
    agenda: null
  };
  return mapping[kind];
}

export function findUnifiedWorkItem(
  unifiedItems: UnifiedWorkItem[],
  source: "local-note" | "local-task" | "local-reminder" | "team-task",
  sourceId: string
): UnifiedWorkItem | null {
  return unifiedItems.find(item => item.source === source && item.sourceId === sourceId) ?? null;
}

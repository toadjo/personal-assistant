/**
 * Pure helper to find a unified work item by source and source ID.
 */

import type { UnifiedWorkItem } from "./derived/unified-work";

export function findUnifiedWorkItem(
  unifiedItems: UnifiedWorkItem[],
  source: "local-note" | "local-task" | "local-reminder" | "team-task",
  sourceId: string
): UnifiedWorkItem | null {
  return unifiedItems.find(item => item.source === source && item.sourceId === sourceId) ?? null;
}

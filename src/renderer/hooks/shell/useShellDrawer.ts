import { useEffect, useState } from "react";
import type { UnifiedWorkItem } from "../../lib/derived/unified-work";
import type { BriefItem } from "../../types";
import {
  findUnifiedWorkItem,
  getUnifiedWorkItemSourceLabel,
  getUnifiedWorkItemSourceForBriefKind
} from "../../lib/unified-work-item-lookup";

export type ShellDrawer = {
  selectedWorkItem: UnifiedWorkItem | null;
  setSelectedWorkItem: (item: UnifiedWorkItem | null) => void;
  openUnifiedWorkItem: (
    source: "local-note" | "local-task" | "local-reminder" | "team-task",
    id: string
  ) => void;
  openBriefItemInDrawer: (brief: BriefItem) => void;
  close: () => void;
};

export function useShellDrawer(opts: {
  unifiedItems: UnifiedWorkItem[];
  setStatus: (msg: string) => void;
  reportError: (msg: string) => void;
}): ShellDrawer {
  const [selectedWorkItem, setSelectedWorkItem] = useState<UnifiedWorkItem | null>(null);

  // Refresh selected drawer item from inbox.unifiedItems, or close if deleted
  useEffect(() => {
    if (selectedWorkItem) {
      const refreshedItem = opts.unifiedItems.find((item) => item.id === selectedWorkItem.id);
      if (refreshedItem) {
        setSelectedWorkItem(refreshedItem);
      } else {
        setSelectedWorkItem(null);
      }
    }
  }, [opts.unifiedItems, selectedWorkItem]);

  const openUnifiedWorkItem = (
    source: "local-note" | "local-task" | "local-reminder" | "team-task",
    id: string
  ): void => {
    const unifiedItem = findUnifiedWorkItem(opts.unifiedItems, source, id);
    if (unifiedItem) {
      setSelectedWorkItem(unifiedItem);
      opts.setStatus(`${getUnifiedWorkItemSourceLabel(source)} opened.`);
    } else {
      opts.reportError(`${getUnifiedWorkItemSourceLabel(source)} not found in unified items.`);
    }
  };

  const openBriefItemInDrawer = (briefItem: BriefItem): void => {
    const source = getUnifiedWorkItemSourceForBriefKind(briefItem.kind);
    if (!source) {
      opts.reportError(`Cannot open ${briefItem.kind} in drawer.`);
      return;
    }

    const unifiedItem = findUnifiedWorkItem(opts.unifiedItems, source, briefItem.sourceId);
    if (unifiedItem) {
      setSelectedWorkItem(unifiedItem);
      opts.setStatus(`${getUnifiedWorkItemSourceLabel(source)} opened.`);
    } else {
      opts.reportError(`${getUnifiedWorkItemSourceLabel(source)} not found in unified items.`);
    }
  };

  const close = () => {
    setSelectedWorkItem(null);
  };

  return {
    selectedWorkItem,
    setSelectedWorkItem,
    openUnifiedWorkItem,
    openBriefItemInDrawer,
    close
  };
}
